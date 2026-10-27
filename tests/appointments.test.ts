/**
 * Epic VI M6.2 (2026-10-27) — kontrol appointments after inpatient
 * discharge, check-in as outpatient visits, completion and no-show; plus
 * snapshot persistence of the Epic VI sub-states.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createWorld, type World } from "../src/engine/world.js";
import { createClock } from "../src/engine/clock.js";
import { EventQueue } from "../src/engine/event-queue.js";
import {
  appointmentHandler, clinicSlotTick, poliForKontrol, getUpcomingAppointments,
  KONTROL_AFTER_TICKS, type AppointmentState,
} from "../src/engine/appointment-scheduling.js";
import { shiftAt } from "../src/agent/roster.js";
import { initJournal, closeJournal, saveSnapshot, loadNearestSnapshot } from "../src/engine/journal.js";
import type { HospitalState } from "../src/engine/state-store.js";
import type { Encounter } from "../src/patient/schema.js";

const appts = (s: HospitalState) => (s as unknown as { _appointmentState: AppointmentState })._appointmentState.appointments;
function clockAt(tick: number, draw = 0.1) {
  const c = createClock(60, 1); c.tick = tick; c.hospitalTimeMs = tick * 60_000; c.rng = () => draw; return c;
}
const minuteOfDay = (t: number) => (18 * 60 + t) % 1440;

/** World with one adult patient discharged alive from an inpatient stay at `endTick`. */
function discharged(endTick: number, opts: Partial<Encounter> = {}): { w: World; patientId: string; encId: string } {
  const w = createWorld(5, undefined, 1);
  const p = Array.from(w.state.patients.values()).find(x => x.age >= 18)!;
  const enc: Encounter = {
    id: "ENC-T-1", patientId: p.id, type: "inpatient", startTime: 0, endTime: endTick * 60_000,
    status: "discharged", payer: "BPJS Kesehatan", primaryDiagnosis: "J15", ...opts,
  };
  w.state.encounters.set(enc.id, enc);
  return { w, patientId: p.id, encId: enc.id };
}

describe("clinic slots and poli routing", () => {
  it("books Monday–Saturday 08:00–14:00, never Sunday, never before the requested tick", () => {
    for (let t = 0; t < 14 * 1440; t += 97) {
      for (const slot of [0, 7, 35]) {
        const s = clinicSlotTick(t, slot);
        expect(s).toBeGreaterThanOrEqual(t);
        expect(minuteOfDay(s)).toBe(8 * 60 + slot * 10);
        expect(shiftAt(s).dayOfWeek).not.toBe(6);
        expect(s - t).toBeLessThan(3 * 1440);
      }
    }
  });

  it("routes kontrol by diagnosis, and children to Poli Anak", () => {
    expect(poliForKontrol("I21", 50)).toBe("POLI-JANTUNG");
    expect(poliForKontrol("I10", 50)).toBe("POLI-PD");
    expect(poliForKontrol("J15", 50)).toBe("POLI-PARU");
    expect(poliForKontrol("S72", 50)).toBe("POLI-BEDAH");
    expect(poliForKontrol("E11", 50)).toBe("POLI-PD");
    expect(poliForKontrol("J15", 9)).toBe("POLI-AK");
  });
});

describe("kontrol appointment lifecycle", () => {
  it("books a kontrol ~7 days after an inpatient discharge", () => {
    const { w, patientId, encId } = discharged(300);
    const s = appointmentHandler(w.state, clockAt(300), new EventQueue());
    const [a] = Array.from(appts(s).values());
    expect(a).toMatchObject({ patientId, encounterId: encId, poli: "POLI-PARU", status: "scheduled", icdCode: "J15" });
    expect(a!.scheduledTick).toBeGreaterThanOrEqual(300 + KONTROL_AFTER_TICKS);
    expect(appts(w.state).size).toBe(0); // input untouched
    // Not booked twice on the next pass.
    expect(appts(appointmentHandler(s, clockAt(303), new EventQueue())).size).toBe(1);
  });

  it("does not book for deaths or outpatient encounters", () => {
    const { w, patientId } = discharged(300);
    const p = w.state.patients.get(patientId)!;
    w.state.patients.set(patientId, { ...p, morgueId: "MORG-0001" });
    expect(appts(appointmentHandler(w.state, clockAt(300), new EventQueue())).size).toBe(0);
    const o = discharged(300, { type: "outpatient" });
    expect(appts(appointmentHandler(o.w.state, clockAt(300), new EventQueue())).size).toBe(0);
  });

  it("an attending patient is checked in as a waiting outpatient visit, then completes with it", () => {
    const { w, patientId } = discharged(300);
    const s1 = appointmentHandler(w.state, clockAt(300), new EventQueue());
    const due = Array.from(appts(s1).values())[0]!.scheduledTick;
    const s2 = appointmentHandler(s1, clockAt(due, 0.1), new EventQueue());
    const a = Array.from(appts(s2).values())[0]!;
    expect(a.status).toBe("checked_in");
    expect(a.actualTick).toBe(due);
    const enc = s2.encounters.get(a.visitEncounterId!)!;
    expect(enc).toMatchObject({ patientId, type: "outpatient", status: "active", primaryDiagnosis: "J15" });
    const visit = s2._outpatientVisits.get(`VISIT-${enc.id}`)!;
    expect(visit).toMatchObject({ status: "waiting", poli: "POLI-PARU", patientId });
    // Visit completes → appointment completes.
    const visits = new Map(s2._outpatientVisits);
    visits.set(visit.id, { ...visit, status: "completed", doctorId: "DOKT-0001" });
    const s3 = appointmentHandler({ ...s2, _outpatientVisits: visits }, clockAt(due + 30), new EventQueue());
    expect(Array.from(appts(s3).values())[0]).toMatchObject({ status: "completed", doctorId: "DOKT-0001" });
  });

  it("no-show when the attendance draw fails, or the patient is back in hospital", () => {
    const { w, patientId } = discharged(300);
    const s1 = appointmentHandler(w.state, clockAt(300), new EventQueue());
    const due = Array.from(appts(s1).values())[0]!.scheduledTick;
    expect(Array.from(appts(appointmentHandler(s1, clockAt(due, 0.95), new EventQueue())).values())[0]!.status).toBe("no_show");
    const readmitted = new Map(s1.encounters);
    readmitted.set("ENC-T-2", { id: "ENC-T-2", patientId, type: "inpatient", startTime: 0, endTime: null, status: "active", payer: "BPJS Kesehatan", primaryDiagnosis: "J15" });
    expect(Array.from(appts(appointmentHandler({ ...s1, encounters: readmitted }, clockAt(due, 0.1), new EventQueue())).values())[0]!.status).toBe("no_show");
  });

  it("getUpcomingAppointments uses the current tick (was hard-coded to 0)", () => {
    const { w } = discharged(300);
    const s1 = appointmentHandler(w.state, clockAt(300), new EventQueue());
    const due = Array.from(appts(s1).values())[0]!.scheduledTick;
    expect(getUpcomingAppointments(s1, 300, 1440)).toHaveLength(0);
    expect(getUpcomingAppointments(s1, due - 100, 1440)).toHaveLength(1);
    expect(getUpcomingAppointments(s1, due + 1, 1440)).toHaveLength(0);
  });
});

describe("Epic VI sub-states survive a snapshot", () => {
  let dir = "", db = "";
  beforeEach(() => { closeJournal(); dir = fs.mkdtempSync(path.join(os.tmpdir(), "dr-appt-")); db = path.join(dir, "j.db"); });
  afterEach(() => { closeJournal(); try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ok */ } });

  it("round-trips appointments, sick leave, kamar jenazah and referral counters", () => {
    const { w } = discharged(300);
    initJournal(db);
    const s = appointmentHandler(w.state, clockAt(300), new EventQueue()) as any;
    s._sickLeaveState = { records: new Map([["SL-0000", { agentId: "A1", department: "IGD", role: "perawat", startedTick: 5, recoveredTick: null, replacementAgentId: null }]]), counter: 1 };
    s._kamarJenazahState = { records: new Map([["KJ-0000", { id: "KJ-0000", morgueRecordId: "E", patientId: "P", encounterId: "E", admittedTick: 1, releasedTick: null, status: "stored", forensicFlag: "none", causeOfDeathCertified: true }]]), counter: 1 };
    s._referralState = { ...s._referralState, letterCounter: 7, patientCounter: 7 };
    saveSnapshot(300, s);
    const back = loadNearestSnapshot(300).state as any;
    expect(back._appointmentState.appointments.size).toBe(1);
    expect(back._appointmentState.counter).toBe(1);
    expect(back._sickLeaveState.records.get("SL-0000").agentId).toBe("A1");
    expect(back._kamarJenazahState.records.get("KJ-0000").status).toBe("stored");
    expect(back._referralState.letterCounter).toBe(7);
  });
});
