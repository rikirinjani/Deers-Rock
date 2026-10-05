import { describe, it, expect } from "vitest";
import { apiRoutes } from "../src/api/rest.js";
import { createWorld, runWorld, type World } from "../src/engine/world.js";
import { createFhirEndpoints } from "../src/api/fhir.js";
import { buildFhirBundle } from "../src/engine/fhir-export.js";
import { buildEncounterView, ticksUpToDays, READMISSION_WINDOW_TICKS } from "../src/engine/encounter-insights.js";
import { dischargeScheduledPatients } from "../src/engine/markov.js";
import { cleanupHandler } from "../src/engine/cleanup.js";
import type { OutcomeRecord } from "../src/engine/state-store.js";
import type { Encounter, MedicalChart, RespiratoryOrder } from "../src/patient/schema.js";

/**
 * Issue #5 API additions (Oracle rework): encounter outcome / severity /
 * readmission / LOS fields, query filters, and per-ICD outcome stats.
 *
 * Fixture strategy follows fhir-compliance.test.ts: a real World from
 * createWorld(), with hand-constructed encounters/morgue/orders so each
 * scenario (death, ED-admit zombie, readmission boundary) is forced
 * deterministically instead of hoping the tick loop produces it (organic
 * deaths need >4320 ticks of discharge scheduling, too slow for this suite).
 *
 * Oracle F2: NO "dirujuk" may ever be emitted — socialWorkNotes are
 * placement-evaluation notes, not referral events, and are ignored.
 * Oracle F3: /api/outcomes byIcd is computed from the all-time
 * _outcomeRecords store, so the fixture seeds records for every closed
 * encounter exactly as outcome-tracker.ts would have written them.
 */

const ms = (tick: number) => tick * 60_000; // 1 tick = 1 sim-minute (see clock.ts)

function callApi(w: World, pathWithQuery: string): { status: number; body: any } {
  const url = new URL(pathWithQuery, "http://localhost");
  let body = "";
  const res: any = {
    statusCode: 200,
    setHeader: () => {},
    end: (b?: string) => { body = b ?? ""; },
  };
  const handled = apiRoutes({ method: "GET" } as any, res, w, url);
  expect(handled, `route not handled: ${pathWithQuery}`).toBe(true);
  return { status: res.statusCode, body: JSON.parse(body) };
}

function enc(id: string, patientId: string, startTick: number, opts: Partial<Encounter> = {}): Encounter {
  return {
    id, patientId, type: "inpatient",
    startTime: ms(startTick), endTime: null, status: "active",
    payer: "Self-pay", primaryDiagnosis: "I10",
    ...opts,
  };
}

/** Engine-shaped outcome-tracker record (OutcomeRecord, vitals-based vocabulary). */
const rec = (
  patientId: string, encounterId: string, icdCode: string, name: string,
  outcome: OutcomeRecord["outcome"], losTicks: number, dischargeTick: number,
): OutcomeRecord => ({
  patientId, encounterId, primaryDiagnosis: name, icdCode, outcome,
  losTicks, ordersCount: 0, dischargeTick,
});

function fixtureWorld(): World {
  const w = createWorld(5, undefined, 42);
  const s = w.state;
  const [p1, p2, p3, p4, p5] = Array.from(s.patients.values());

  // e1: ICU death — discharged + morgue record + ventilator/CPAP orders.
  // No _severityAtClose snapshot (hand-built fixture) → exercises the live
  // derivation fallback.
  s.encounters.set("ENC-DEATH", enc("ENC-DEATH", p1!.id, 100, { endTime: ms(3000), status: "discharged" }));
  s.morgue.push({
    patientId: p1!.id, encounterId: "ENC-DEATH", primaryDiagnosis: "Essential hypertension",
    icdCode: "I10", age: 66, gender: p1!.gender, causeOfDeath: "cardiac arrest",
    mortalityScore: 8, deathTick: 3000,
  });
  const rt = (id: string, therapyType: RespiratoryOrder["therapyType"], orderedTick: number): RespiratoryOrder => ({
    id, encounterId: "ENC-DEATH", patientId: p1!.id, therapyType, status: "discontinued",
    settings: "AC/VC 400mL RR12 PEEP5 FiO2 40%", orderedAt: ms(orderedTick), notes: null,
  });
  // 8 ventilator orders (16 ticks) + 8 CPAP orders (16 ticks): the ICU bucket
  // totals 32 ticks so the two day figures land in different rounding buckets.
  for (let i = 0; i < 8; i++) s.respiratoryOrders.set(`RT-VENT-${i}`, rt(`RT-VENT-${i}`, "ventilator", 100 + i));
  for (let i = 0; i < 8; i++) s.respiratoryOrders.set(`RT-CPAP-${i}`, rt(`RT-CPAP-${i}`, "CPAP", 2000 + i));

  // e2: same patient readmitted 10 sim-days after e1's discharge (tick 3000).
  s.encounters.set("ENC-READMIT", enc("ENC-READMIT", p1!.id, 3000 + 10 * 1440, { primaryDiagnosis: "E11" }));

  // e3: plain discharge — no complications, 3-day LOS.
  s.encounters.set("ENC-PLAIN", enc("ENC-PLAIN", p2!.id, 0, { endTime: ms(4320), status: "discharged" }));

  // e4: carries a non-home social-work disposition note — deliberately NOT an
  // outcome signal anymore (Oracle F2: these are placement-evaluation notes;
  // outcome must stay "sembuh" and never "dirujuk").
  s.encounters.set("ENC-REFER", enc("ENC-REFER", p3!.id, 500, { endTime: ms(2000), status: "discharged", primaryDiagnosis: "J44" }));
  s.socialWorkNotes.set("SW-1", {
    id: "SW-1", encounterId: "ENC-REFER", patientId: p3!.id, noteType: "assessment",
    content: "SNF placement arranged", timestamp: ms(1500), disposition: "SNF",
  });

  // e5/e5b: readmission exactly at the 30-day boundary (inclusive → true).
  s.encounters.set("ENC-BIN-A", enc("ENC-BIN-A", p4!.id, 0, { endTime: ms(1000), status: "discharged", primaryDiagnosis: "I50" }));
  s.encounters.set("ENC-BIN-B", enc("ENC-BIN-B", p4!.id, 1000 + READMISSION_WINDOW_TICKS, { primaryDiagnosis: "I50" }));

  // e6/e6b: one tick past the boundary (→ false).
  s.encounters.set("ENC-BOUT-A", enc("ENC-BOUT-A", p5!.id, 0, { endTime: ms(1000), status: "discharged", primaryDiagnosis: "N39" }));
  s.encounters.set("ENC-BOUT-B", enc("ENC-BOUT-B", p5!.id, 1000 + READMISSION_WINDOW_TICKS + 1, { primaryDiagnosis: "N39" }));

  // e7: outpatient (ED-style) encounter still in progress.
  s.encounters.set("ENC-OP", enc("ENC-OP", p2!.id, 100, { type: "outpatient" }));

  // e8: ED-admitted zombie — endTime set but status still "active"
  // (emergency.ts admitted branch). Neither outcome nor LOS may appear
  // (Oracle F7).
  s.encounters.set("ENC-ZOMBIE", enc("ENC-ZOMBIE", p2!.id, 50, { type: "outpatient", endTime: ms(60) }));

  const chart = (id: string, patientId: string, status: MedicalChart["status"], createdTick: number): MedicalChart => ({
    id, encounterId: id, patientId, status, createdAt: ms(createdTick), completedAt: null,
    diagnoses: [{ code: "I10", name: "Essential hypertension", type: "primary" }],
    procedures: [], coder: null,
  });
  s.medicalCharts.set("CHART-1", chart("CHART-1", p1!.id, "open", 100));
  s.medicalCharts.set("CHART-2", chart("CHART-2", p2!.id, "coded", 5000));
  s.medicalCharts.set("CHART-3", chart("CHART-3", p3!.id, "open", 9000));

  // Outcome-tracker records for every closed encounter (as outcomeHandler
  // would have written them) — the all-time source for /api/outcomes byIcd.
  s._outcomeRecords.push(
    rec(p1!.id, "ENC-DEATH", "I10", "Essential hypertension", "deceased", 2900, 3000),
    rec(p2!.id, "ENC-PLAIN", "I10", "Essential hypertension", "improved", 4320, 4320),
    rec(p3!.id, "ENC-REFER", "J44", "COPD", "deteriorated", 1500, 2000),
    rec(p4!.id, "ENC-BIN-A", "I50", "Heart failure", "improved", 1000, 1000),
    rec(p5!.id, "ENC-BOUT-A", "N39", "UTI", "improved", 1000, 1000),
  );

  return w;
}

function byId(list: any[]): Record<string, any> {
  const m: Record<string, any> = {};
  for (const e of list) m[e.id] = e;
  return m;
}

describe("GET /api/encounters — derived fields (issue #5)", () => {
  it("outcome 'meninggal' on the encounter whose patient died", () => {
    const { body } = callApi(fixtureWorld(), "/api/encounters");
    expect(byId(body)["ENC-DEATH"].outcome).toBe("meninggal");
  });

  it("default discharged encounters map to 'sembuh'; social-work notes are NOT outcome signals (Oracle F2: no dirujuk)", () => {
    const { body } = callApi(fixtureWorld(), "/api/encounters");
    expect(byId(body)["ENC-PLAIN"].outcome).toBe("sembuh");
    // ENC-REFER carries a non-home disposition note and must STILL be sembuh.
    expect(byId(body)["ENC-REFER"].outcome).toBe("sembuh");
    expect(JSON.stringify(body)).not.toContain("dirujuk");
  });

  it("active encounters carry no outcome yet (key absent in JSON)", () => {
    const { body } = callApi(fixtureWorld(), "/api/encounters");
    const active = byId(body)["ENC-READMIT"];
    expect(active.status).toBe("active");
    expect("outcome" in active).toBe(false);
  });

  it("ED-admitted encounters (endTime set, status active) show neither outcome nor LOS (Oracle F7)", () => {
    const { body } = callApi(fixtureWorld(), "/api/encounters");
    const z = byId(body)["ENC-ZOMBIE"];
    expect(z.status).toBe("active");
    expect(z.endTime).not.toBeNull();
    expect("outcome" in z).toBe(false);
    expect("lengthOfStay" in z).toBe(false);
    expect("lengthOfStayDays" in z).toBe(false);
  });

  it("icuDays/ventilatorDays are > 0 for a ventilated encounter, 0 otherwise", () => {
    const { body } = callApi(fixtureWorld(), "/api/encounters");
    const m = byId(body);
    expect(m["ENC-DEATH"].ventilatorDays).toBeGreaterThan(0);
    expect(m["ENC-DEATH"].icuDays).toBeGreaterThan(0);
    expect(m["ENC-PLAIN"].ventilatorDays).toBe(0);
    expect(m["ENC-PLAIN"].icuDays).toBe(0);
  });

  it("ventilator/CPAP orders only count toward their own buckets", () => {
    const { body } = callApi(fixtureWorld(), "/api/encounters");
    const e = byId(body)["ENC-DEATH"];
    // 8 ventilator orders (16 ticks) + 8 CPAP orders (16 ticks on top) —
    // ventilatorDays counts ventilation only, icuDays adds critical care.
    expect(e.ventilatorDays).toBe(ticksUpToDays(16));
    expect(e.icuDays).toBe(ticksUpToDays(32));
    expect(e.icuDays).toBeGreaterThan(e.ventilatorDays);
  });

  it("readmissionWithin30d is true inside/at the window, false outside", () => {
    const m = byId(callApi(fixtureWorld(), "/api/encounters").body);
    expect(m["ENC-DEATH"].readmissionWithin30d).toBe(true);       // readmit 10 days later
    expect(m["ENC-BIN-A"].readmissionWithin30d).toBe(true);       // exactly 43200 ticks later
    expect(m["ENC-BOUT-A"].readmissionWithin30d).toBe(false);     // 43201 ticks later
    expect(m["ENC-PLAIN"].readmissionWithin30d).toBe(false);      // only outpatient revisits later
  });

  it("lengthOfStay/lengthOfStayDays on discharged encounters, absent on active", () => {
    const m = byId(callApi(fixtureWorld(), "/api/encounters").body);
    expect(m["ENC-PLAIN"].lengthOfStay).toBe(4320);
    expect(m["ENC-PLAIN"].lengthOfStayDays).toBe(3);
    expect(m["ENC-DEATH"].lengthOfStay).toBe(2900);
    expect("lengthOfStay" in m["ENC-READMIT"]).toBe(false);
    expect("lengthOfStayDays" in m["ENC-READMIT"]).toBe(false);
  });

  it("ticks→days rounding rule: ceil to next hundredth of a sim-day", () => {
    expect(ticksUpToDays(0)).toBe(0);
    expect(ticksUpToDays(1)).toBe(0.01);
    expect(ticksUpToDays(14)).toBe(0.01);
    expect(ticksUpToDays(15)).toBe(0.02);
    expect(ticksUpToDays(1440)).toBe(1);
    expect(ticksUpToDays(1441)).toBe(1.01);
  });

  it("organic run keeps the invariants on every encounter view", () => {
    const w = runWorld(createWorld(30, undefined, 7), 300);
    const { body } = callApi(w, "/api/encounters");
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    const outcomes = new Set(["sembuh", "meninggal", "transfer"]);
    for (const e of body) {
      expect(typeof e.icuDays).toBe("number");
      expect(typeof e.ventilatorDays).toBe("number");
      expect(typeof e.readmissionWithin30d).toBe("boolean");
      if (e.status === "active") {
        expect("outcome" in e).toBe(false);
        expect("lengthOfStay" in e).toBe(false);
      } else {
        expect(outcomes.has(e.outcome)).toBe(true);
        expect(e.outcome).not.toBe("dirujuk");
        expect("lengthOfStay" in e).toBe(true);
      }
    }
  });
});

describe("Oracle F1 — discharge-time severity snapshot survives pruning pressure", () => {
  it("closing the encounter snapshots severity; cleanup eviction of respiratory orders cannot change it", () => {
    const w = createWorld(5, undefined, 42);
    const s = w.state;
    const p1 = Array.from(s.patients.values())[0]!;

    // Active encounter with live respiratory orders (8 ventilator + 8 CPAP).
    s.encounters.set("ENC-SNAP", enc("ENC-SNAP", p1.id, 1000));
    const rt = (id: string, therapyType: RespiratoryOrder["therapyType"], orderedTick: number): RespiratoryOrder => ({
      id, encounterId: "ENC-SNAP", patientId: p1.id, therapyType, status: "discontinued",
      settings: "AC/VC 400mL RR12 PEEP5 FiO2 40%", orderedAt: ms(orderedTick), notes: null,
    });
    for (let i = 0; i < 8; i++) s.respiratoryOrders.set(`RT-SNAP-V-${i}`, rt(`RT-SNAP-V-${i}`, "ventilator", 1010 + i));
    for (let i = 0; i < 8; i++) s.respiratoryOrders.set(`RT-SNAP-C-${i}`, rt(`RT-SNAP-C-${i}`, "CPAP", 1010 + i));

    // Close it through the REAL engine path (markov.ts) — this must write
    // the severity snapshot exactly once, without consuming rng.
    const closeClock = { ...w.clock, tick: 2000, hospitalTimeMs: ms(2000) };
    const closed = dischargeScheduledPatients(s, closeClock, [{ patientId: p1.id, encounterId: "ENC-SNAP" }]);
    const encClosed = closed.encounters.get("ENC-SNAP")!;
    expect(encClosed.status).toBe("discharged");
    expect(encClosed.endTime).not.toBeNull();
    expect(encClosed._severityAtClose).toEqual({ ventilatorDays: ticksUpToDays(16), icuDays: ticksUpToDays(32) });

    const before = buildEncounterView(closed, encClosed);
    expect(before.ventilatorDays).toBe(ticksUpToDays(16));
    expect(before.icuDays).toBe(ticksUpToDays(32));
    expect(before.ventilatorDays).toBeGreaterThan(0);

    // Pruning pressure: 60 NEWER discontinued orders blow past MAX_RESP=50,
    // so cleanup evicts the oldest discontinued orders — all of ENC-SNAP's.
    for (let i = 0; i < 60; i++) {
      closed.respiratoryOrders.set(`RT-FILL-${i}`, {
        id: `RT-FILL-${i}`, encounterId: "ENC-OTHER", patientId: "PAT-OTHER",
        therapyType: "oxygen", status: "discontinued", settings: "2L NC",
        orderedAt: ms(3000 + i), notes: null,
      });
    }
    const pruned = cleanupHandler(closed, { ...closeClock, tick: 2010, hospitalTimeMs: ms(2010) }, w.queue);
    // The live derivation source for ENC-SNAP is gone:
    expect(pruned.respiratoryOrders.has("RT-SNAP-V-0")).toBe(false);
    expect(pruned.respiratoryOrders.has("RT-SNAP-C-7")).toBe(false);

    // ...but the serialized severity (and outcome) must be unchanged.
    const after = buildEncounterView(pruned, pruned.encounters.get("ENC-SNAP")!);
    expect(after.ventilatorDays).toBe(before.ventilatorDays);
    expect(after.icuDays).toBe(before.icuDays);
    expect(after.ventilatorDays).toBe(ticksUpToDays(16));
    expect(after.icuDays).toBe(ticksUpToDays(32));
    expect(after.outcome).toBe(before.outcome);
    expect("outcome" in after).toBe(true);
  });
});

describe("Oracle F6 — readmissionWithin30d counts only inpatient encounters", () => {
  it("an outpatient/ED revisit inside 30 days is NOT a readmission; an inpatient return is", () => {
    const w = createWorld(5, undefined, 42);
    const s = w.state;
    const p = Array.from(s.patients.values())[0]!;
    s.encounters.set("ENC-IDX", enc("ENC-IDX", p.id, 0, { endTime: ms(1000), status: "discharged" }));

    // Outpatient revisit well inside the 30-day window → not a readmission.
    s.encounters.set("ENC-REVISIT", enc("ENC-REVISIT", p.id, 1500, { type: "outpatient", endTime: ms(1600), status: "discharged" }));
    let m = byId(callApi(w, "/api/encounters").body);
    expect(m["ENC-IDX"].readmissionWithin30d).toBe(false);

    // Later INPATIENT encounter inside the window → readmission.
    s.encounters.set("ENC-RETURN", enc("ENC-RETURN", p.id, 2000));
    m = byId(callApi(w, "/api/encounters").body);
    expect(m["ENC-IDX"].readmissionWithin30d).toBe(true);
  });
});

describe("GET /api/encounters — filters (issue #5 P1-4)", () => {
  const w = fixtureWorld();
  const all = callApi(w, "/api/encounters").body;
  const ids = (list: any[]) => list.map(e => e.id).sort();

  it("no params → full array (all encounters, unchanged behavior shape)", () => {
    expect(all.length).toBe(10);
  });

  it("status filter", () => {
    expect(ids(callApi(w, "/api/encounters?status=active").body))
      .toEqual(["ENC-BIN-B", "ENC-BOUT-B", "ENC-OP", "ENC-READMIT", "ENC-ZOMBIE"]);
    expect(ids(callApi(w, "/api/encounters?status=discharged").body))
      .toEqual(["ENC-BIN-A", "ENC-BOUT-A", "ENC-DEATH", "ENC-PLAIN", "ENC-REFER"]);
  });

  it("type filter (encounters only)", () => {
    expect(ids(callApi(w, "/api/encounters?type=outpatient").body)).toEqual(["ENC-OP", "ENC-ZOMBIE"]);
    expect(callApi(w, "/api/encounters?type=inpatient").body.length).toBe(8);
  });

  it("limit slices the newest-first list", () => {
    const limited = callApi(w, "/api/encounters?limit=3").body;
    expect(limited.length).toBe(3);
    expect(limited).toEqual(all.slice(0, 3));
  });

  it("since keeps encounters starting at/after the tick", () => {
    expect(ids(callApi(w, "/api/encounters?since=40000").body)).toEqual(["ENC-BIN-B", "ENC-BOUT-B"]);
    expect(ids(callApi(w, "/api/encounters?since=17400").body)).toEqual(["ENC-BIN-B", "ENC-BOUT-B", "ENC-READMIT"]);
  });

  it("filters compose", () => {
    expect(ids(callApi(w, "/api/encounters?status=active&since=40000&limit=1").body)).toEqual(["ENC-BOUT-B"]);
  });

  it("invalid params are rejected with 400 (strict integer syntax — Oracle F8)", () => {
    expect(callApi(w, "/api/encounters?status=zombie").status).toBe(400);
    expect(callApi(w, "/api/encounters?type=emergency").status).toBe(400);
    expect(callApi(w, "/api/encounters?limit=0").status).toBe(400);
    expect(callApi(w, "/api/encounters?limit=-5").status).toBe(400);
    expect(callApi(w, "/api/encounters?limit=abc").status).toBe(400);
    expect(callApi(w, "/api/encounters?limit=0x10").status).toBe(400);  // hex — Number() would accept
    expect(callApi(w, "/api/encounters?limit=1e3").status).toBe(400);   // exponent — Number() would accept
    expect(callApi(w, "/api/encounters?limit=%205").status).toBe(400);  // " 5" — Number() would accept
    expect(callApi(w, "/api/encounters?since=-1").status).toBe(400);
    expect(callApi(w, "/api/encounters?since=nope").status).toBe(400);
    expect(callApi(w, "/api/encounters?since=1e3").status).toBe(400);
  });
});

describe("GET /api/charts — filters (issue #5 P1-4)", () => {
  const w = fixtureWorld();
  const ids = (list: any[]) => list.map(c => c.id).sort();

  it("no params → full array", () => {
    expect(callApi(w, "/api/charts").body.length).toBe(3);
  });

  it("status / since / limit each change results", () => {
    expect(ids(callApi(w, "/api/charts?status=open").body)).toEqual(["CHART-1", "CHART-3"]);
    expect(ids(callApi(w, "/api/charts?since=5000").body)).toEqual(["CHART-2", "CHART-3"]);
    expect(callApi(w, "/api/charts?limit=1").body.length).toBe(1);
  });

  it("invalid params are rejected with 400", () => {
    expect(callApi(w, "/api/charts?status=filed").status).toBe(400);
    expect(callApi(w, "/api/charts?limit=0").status).toBe(400);
    expect(callApi(w, "/api/charts?since=xyz").status).toBe(400);
    expect(callApi(w, "/api/charts?since=0x10").status).toBe(400);
  });
});

describe("GET /api/outcomes — per-ICD stats from outcome records (issue #5 P2-7, Oracle F3/F4)", () => {
  const w = fixtureWorld();

  it("keeps the pre-existing records/total payload; byIcd always present; vocab note included", () => {
    const { body } = callApi(w, "/api/outcomes");
    expect(body).toHaveProperty("records");
    expect(body).toHaveProperty("total");
    expect(body.total).toBe(5);
    expect(Array.isArray(body.byIcd)).toBe(true);
    expect(body.truncated).toBeUndefined(); // 4 distinct ICDs — under the cap
    expect(typeof body._vocab).toBe("string");
  });

  it("?icd=I10 filters byIcd to the single exact row", () => {
    const body = callApi(w, "/api/outcomes?icd=I10").body;
    expect(body.byIcd).toEqual([
      { icd: "I10", total: 2, sembuh: 1, meninggal: 1, mortalityRate: 50 },
    ]);
  });

  it("?icd= for an unknown code returns a zeroed byIcd row", () => {
    const body = callApi(w, "/api/outcomes?icd=Z99").body;
    expect(body.byIcd).toEqual([
      { icd: "Z99", total: 0, sembuh: 0, meninggal: 0, mortalityRate: 0 },
    ]);
  });

  it("no dirujuk/lari bucket exists anywhere in the payload (Oracle F2)", () => {
    const { body } = callApi(w, "/api/outcomes");
    for (const row of body.byIcd) {
      expect("dirujuk" in row).toBe(false);
      expect("lari" in row).toBe(false);
    }
    expect(JSON.stringify(body)).not.toContain("dirujuk");
    expect(JSON.stringify(body)).not.toContain('"lari"');
  });

  it("aggregate rows come from the all-time outcome records (same denominator as records/total)", () => {
    const body = callApi(w, "/api/outcomes").body;
    const rows = byId(body.byIcd.map((r: any) => ({ ...r, id: r.icd })));
    expect(rows["I10"]).toEqual({ id: "I10", icd: "I10", total: 2, sembuh: 1, meninggal: 1, mortalityRate: 50 });
    // tracker "deteriorated" is discharged-alive → sembuh bucket
    expect(rows["J44"]).toEqual({ id: "J44", icd: "J44", total: 1, sembuh: 1, meninggal: 0, mortalityRate: 0 });
    expect(rows["I50"]).toBeDefined();   // boundary readmission pair
    expect(rows["E11"]).toBeUndefined(); // active encounter — never recorded
    // sorted by total desc — I10 first
    expect(body.byIcd[0].icd).toBe("I10");
  });

  it("marks truncation when distinct ICDs exceed the 50-row cap (Oracle F4)", () => {
    const w2 = createWorld(5, undefined, 42);
    const p = Array.from(w2.state.patients.values())[0]!;
    for (let i = 0; i < 55; i++) {
      const code = `X${String(i).padStart(2, "0")}`;
      w2.state._outcomeRecords.push(
        rec(p.id, `E-${i}`, code, code, "improved", 10, 10),
      );
    }
    const body = callApi(w2, "/api/outcomes").body;
    expect(body.byIcd.length).toBe(50);
    expect(body.truncated).toBe(true);
    expect(body.totalDistinct).toBe(55);
    expect(body.total).toBe(55);
  });
});

describe("FHIR Encounter outcome (issue #5 P0-1)", () => {
  const w = fixtureWorld();

  it("/api/fhir/Encounter carries dischargeDisposition", () => {
    const api = createFhirEndpoints(() => w);
    const list = api.encounterList();
    const find = (id: string) => list.find((r: any) => r.id === id) as any;
    expect(find("ENC-DEATH").hospitalization.dischargeDisposition.coding[0].code).toBe("meninggal");
    expect(find("ENC-PLAIN").hospitalization.dischargeDisposition.coding[0].code).toBe("sembuh");
    // Social-work disposition note ignored — still sembuh, never dirujuk.
    expect(find("ENC-REFER").hospitalization.dischargeDisposition.coding[0].code).toBe("sembuh");
    expect(find("ENC-READMIT").hospitalization).toBeUndefined();
    expect(find("ENC-ZOMBIE").hospitalization).toBeUndefined();
  });

  it("document bundle (buildFhirBundle) carries dischargeDisposition", () => {
    const bundle = buildFhirBundle(w.state, "ENC-DEATH") as any;
    expect(bundle).not.toBeNull();
    const encRes = bundle.entry.find((e: any) => e.resource.resourceType === "Encounter").resource;
    expect(encRes.hospitalization.dischargeDisposition.coding[0].code).toBe("meninggal");
    expect(encRes.hospitalization.dischargeDisposition.coding[0].system)
      .toBe("http://rs-deers-rock.go.id/CodeSystem/encounter-outcome");
  });
});
