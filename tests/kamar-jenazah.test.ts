/**
 * Epic VI M6.2 — kamar jenazah & forensik workflow.
 */
import { describe, it, expect } from "vitest";
import { createWorld } from "../src/engine/world.js";
import { createClock } from "../src/engine/clock.js";
import { EventQueue } from "../src/engine/event-queue.js";
import {
  registerBody, kamarJenazahHandler, advanceBody, getKamarJenazahRecords, isUnnaturalDeath,
  KJ_INTAKE_TICKS, KJ_CERTIFY_TICKS, KJ_FAMILY_RELEASE_TICKS, KJ_LEGAL_HOLD_TICKS, KJ_AUTOPSY_TICKS,
} from "../src/engine/kamar-jenazah.js";
import type { MorgueRecord } from "../src/engine/state-store.js";

const morgue = (icdCode: string, id = "ENC-1"): MorgueRecord => ({
  patientId: "PAT-0001", encounterId: id, primaryDiagnosis: "x", icdCode,
  age: 60, gender: "male", causeOfDeath: "x", mortalityScore: 5, deathTick: 0,
});

function body(icd: string) {
  const w = createWorld(5, undefined, 3);
  const id = registerBody(w.state, morgue(icd), 0);
  return getKamarJenazahRecords(w.state).get(id)!;
}

describe("Epic VI M6.2 — kamar jenazah workflow", () => {
  it("classifies unnatural deaths (injury, poisoning, external cause)", () => {
    expect(isUnnaturalDeath("S06.5")).toBe(true);
    expect(isUnnaturalDeath("T20")).toBe(true);
    expect(isUnnaturalDeath("X85")).toBe(true);
    expect(isUnnaturalDeath("V89.2")).toBe(true);
    expect(isUnnaturalDeath("I21")).toBe(false);
    expect(isUnnaturalDeath("J15")).toBe(false);
  });

  it("natural death: received → stored → certified → released to family", () => {
    const r0 = body("I21");
    expect(r0.status).toBe("received");
    expect(r0.forensicFlag).toBe("none");
    expect(advanceBody(r0, KJ_INTAKE_TICKS - 1)).toBe(r0); // unchanged object before intake completes
    const r1 = advanceBody(r0, KJ_INTAKE_TICKS);
    expect(r1.status).toBe("stored");
    expect(r1.causeOfDeathCertified).toBe(false);
    const r2 = advanceBody(r1, KJ_CERTIFY_TICKS);
    expect(r2.causeOfDeathCertified).toBe(true);
    expect(r2.status).toBe("stored");
    const r3 = advanceBody(r2, KJ_FAMILY_RELEASE_TICKS);
    expect(r3.status).toBe("released");
    expect(r3.releasedTick).toBe(KJ_FAMILY_RELEASE_TICKS);
  });

  it("unnatural death: legal hold → autopsy required → autopsy done → released", () => {
    const r0 = body("S06");
    expect(r0.forensicFlag).toBe("suspicious");
    const r1 = advanceBody(r0, KJ_INTAKE_TICKS);
    expect(r1.status).toBe("stored");
    expect(r1.forensicFlag).toBe("legal_hold");
    // No release while forensic work is pending, even past the natural-death release time.
    expect(advanceBody(r1, KJ_FAMILY_RELEASE_TICKS).status).toBe("stored");
    const r2 = advanceBody(r1, KJ_LEGAL_HOLD_TICKS);
    expect(r2.forensicFlag).toBe("autopsy_required");
    expect(r2.causeOfDeathCertified).toBe(false);
    const r3 = advanceBody(r2, KJ_LEGAL_HOLD_TICKS + KJ_AUTOPSY_TICKS);
    expect(r3.status).toBe("autopsy_done");
    expect(r3.causeOfDeathCertified).toBe(true);
    const r4 = advanceBody(r3, KJ_LEGAL_HOLD_TICKS + KJ_AUTOPSY_TICKS + KJ_FAMILY_RELEASE_TICKS);
    expect(r4.status).toBe("released");
  });

  it("a late handler call advances several steps at once", () => {
    expect(advanceBody(body("I21"), 5000).status).toBe("released");
    expect(advanceBody(body("T20"), 1000).forensicFlag).toBe("autopsy_required");
  });

  it("handler applies the workflow and leaves the input state untouched", () => {
    const w = createWorld(5, undefined, 3);
    registerBody(w.state, morgue("I21", "ENC-A"), 0);
    registerBody(w.state, morgue("X85", "ENC-B"), 0);
    const c = createClock(60, 1); c.tick = 2000;
    const s2 = kamarJenazahHandler(w.state, c, new EventQueue());
    const recs = Array.from(getKamarJenazahRecords(s2).values());
    expect(recs.find(r => r.encounterId === "ENC-A")!.status).toBe("released");
    expect(recs.find(r => r.encounterId === "ENC-B")!.status).toBe("autopsy_done");
    expect(Array.from(getKamarJenazahRecords(w.state).values()).every(r => r.status === "received")).toBe(true);
  });
});
