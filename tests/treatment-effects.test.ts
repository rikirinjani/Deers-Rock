/**
 * P-002 step C: treatments are recorded on the encounter when administered and
 * relieve illness deficits (never beyond baseline, never in the wrong direction).
 */
import { describe, it, expect } from "vitest";
import {
  oxygenSupport, recordMedication, recordRespiratory, noteMedication, noteRespiratory, definitiveStatus,
  applyTreatment, COURSE_MIN,
} from "../src/engine/treatment-effects.js";
import { GROUPS } from "../src/engine/illness-model.js";
import { DRUG_CATALOG } from "../src/engine/drug-catalog.js";
import type { Encounter, Vitals, TreatmentLedger } from "../src/patient/schema.js";

const enc = (over: Partial<Encounter> = {}): Encounter => ({
  id: "ENC-1", patientId: "PAT-1", type: "inpatient", startTime: 0, endTime: null, status: "active", payer: "BPJS Kesehatan", primaryDiagnosis: "J15", ...over,
});
const ZERO: Record<keyof Vitals, number> = { heartRate: 0, bloodPressureSystolic: 0, bloodPressureDiastolic: 0, temperature: 0, oxygenSaturation: 0, respiratoryRate: 0, painLevel: 0 };
const dev = (o: Partial<Record<keyof Vitals, number>>) => ({ ...ZERO, ...o });
const withFx = (cat: string, from = 0, until = 100000): TreatmentLedger => ({ fx: { [cat]: { from, until } } });

describe("oxygen support", () => {
  it("maps settings to the fraction of hypoxaemia removed (FiO2 ≈ 0.21 + 0.03 × L/min)", () => {
    expect(oxygenSupport("oxygen", "2L NC")!.frac).toBeLessThan(oxygenSupport("oxygen", "4L NC")!.frac);
    expect(oxygenSupport("oxygen", "4L NC")!.frac).toBeLessThan(oxygenSupport("oxygen", "Face mask 40%")!.frac);
    expect(oxygenSupport("oxygen", "Face mask 40%")!.frac).toBeLessThan(oxygenSupport("oxygen", "NRB 15L")!.frac);
    expect(oxygenSupport("CPAP", "CPAP 8cmH2O")!.frac).toBe(0.9);
    expect(oxygenSupport("ventilator", "AC/VC")!.frac).toBeGreaterThan(0.95);
  });
  it("returns null for therapies that do not oxygenate", () => {
    expect(oxygenSupport("chest-PT", "x")).toBeNull();
    expect(oxygenSupport("PFT", "x")).toBeNull();
    expect(oxygenSupport("nebulizer", "x")).toBeNull();
  });
});

describe("recording (copy-on-write)", () => {
  it("records the first dose and the regimen end, and keeps the first-dose tick on re-administration", () => {
    const a = recordMedication(enc(), "antibiotic", 100);
    expect(a._treat!.fx!.antibiotic).toEqual({ from: 100, until: 100 + COURSE_MIN.antibiotic! });
    const b = recordMedication(a, "antibiotic", 5000);
    expect(b._treat!.fx!.antibiotic!.from).toBe(100);
    expect(b._treat!.fx!.antibiotic!.until).toBe(5000 + COURSE_MIN.antibiotic!);
  });

  it("returns the same object when nothing changes, and never mutates its input", () => {
    const a = recordMedication(enc(), "antibiotic", 100);
    expect(recordMedication(a, "antibiotic", 100)).toBe(a);
    const e = enc();
    recordMedication(e, "antibiotic", 100);
    expect(e._treat).toBeUndefined();
  });

  it("noteMedication resolves the drug category and copies the map only on the first write", () => {
    const original = new Map([["ENC-1", enc()]]);
    const code = DRUG_CATALOG.find(d => d.category === "antibiotic")!.code;
    const out = noteMedication(original, original, "ENC-1", code, 10);
    expect(out).not.toBe(original);
    expect(original.get("ENC-1")!._treat).toBeUndefined();
    expect(out.get("ENC-1")!._treat!.fx!.antibiotic).toBeDefined();
    // second write into the private copy mutates that copy, not the original
    const code2 = DRUG_CATALOG.find(d => d.category === "antipyretic")!.code;
    const out2 = noteMedication(out, original, "ENC-1", code2, 11);
    expect(out2).toBe(out);
    expect(original.get("ENC-1")!._treat).toBeUndefined();
  });

  it("ignores unknown drugs, missing, closed and outpatient encounters", () => {
    const code = DRUG_CATALOG.find(d => d.category === "antibiotic")!.code;
    const m = new Map([["ENC-1", enc()], ["ENC-2", enc({ id: "ENC-2", status: "discharged" })], ["POLI-3", enc({ id: "POLI-3", type: "outpatient" })]]);
    expect(noteMedication(m, m, "ENC-1", "NOPE", 1)).toBe(m);
    expect(noteMedication(m, m, "NOPE", code, 1)).toBe(m);
    expect(noteMedication(m, m, "ENC-2", code, 1)).toBe(m);
    expect(noteMedication(m, m, "POLI-3", code, 1)).toBe(m);
  });

  it("respiratory therapy: oxygen is kept at the strongest support; nebulizers become bronchodilator / corticosteroid regimens", () => {
    let e = recordRespiratory(enc(), "oxygen", "2L NC", 10);
    const f2 = e._treat!.o2!.frac;
    e = recordRespiratory(e, "oxygen", "NRB 15L", 20);
    expect(e._treat!.o2!.frac).toBeGreaterThan(f2);
    expect(e._treat!.o2!.from).toBe(10);
    expect(recordRespiratory(e, "oxygen", "2L NC", 30)).toBe(e);
    expect(recordRespiratory(enc(), "nebulizer", "Albuterol 2.5mg q4h", 5)._treat!.fx!.bronchodilator).toBeDefined();
    expect(recordRespiratory(enc(), "nebulizer", "Budesonide 0.5mg BID", 5)._treat!.fx!.corticosteroid).toBeDefined();
    expect(recordRespiratory(enc(), "chest-PT", "x", 5)).toEqual(enc());
    const m = new Map([["ENC-1", enc()]]);
    expect(noteRespiratory(m, m, "ENC-1", "oxygen", "3L NC", 1).get("ENC-1")!._treat!.o2).toBeDefined();
    expect(m.get("ENC-1")!._treat).toBeUndefined();
  });
});

describe("definitive treatment", () => {
  it("is treated once any of the group's definitive classes was given, and late if the first dose came after 6 hours", () => {
    const g = GROUPS.sepsis!;
    expect(definitiveStatus(undefined, g, 0)).toEqual({ treated: false, late: false });
    expect(definitiveStatus(withFx("antibiotic", 120), g, 0)).toEqual({ treated: true, late: false });
    expect(definitiveStatus(withFx("antibiotic", 361), g, 0)).toEqual({ treated: true, late: true });
    expect(definitiveStatus(withFx("antihypertensive", 10), g, 0).treated).toBe(false);
  });
  it("respiratory failure (no drug) counts oxygen support as treatment", () => {
    expect(definitiveStatus({ o2: { from: 50, frac: 0.8, rrFrac: 0.3 } }, GROUPS.respiratory_failure!, 0).treated).toBe(true);
  });
});

describe("effects relieve deficits only", () => {
  it("oxygen removes its fraction of a SpO2 deficit and of an RR excess, and does nothing without one", () => {
    const o2: TreatmentLedger = { o2: { from: 0, frac: 0.8, rrFrac: 0.35 } };
    const d = applyTreatment(dev({ oxygenSaturation: -8, respiratoryRate: 10 }), o2, 100, GROUPS.lower_resp_infection!);
    expect(d.oxygenSaturation).toBeCloseTo(-8 * 0.2, 5);
    expect(d.respiratoryRate).toBeCloseTo(10 * 0.65, 5);
    const none = applyTreatment(dev({}), o2, 100, GROUPS.lower_resp_infection!);
    expect(none.oxygenSaturation).toBe(0);
    expect(none.respiratoryRate).toBe(0);
    // never above baseline
    expect(applyTreatment(dev({ oxygenSaturation: 2 }), o2, 100, GROUPS.lower_resp_infection!).oxygenSaturation).toBe(2);
  });

  it("antipyretic lowers a fever and, through fever-driven tachycardia, the heart rate; it cannot cool a normal temperature", () => {
    const untreated = applyTreatment(dev({ temperature: 1.5 }), undefined, 500, GROUPS.lower_resp_infection!);
    const treated = applyTreatment(dev({ temperature: 1.5 }), withFx("antipyretic", 0), 500, GROUPS.lower_resp_infection!);
    expect(treated.temperature).toBeCloseTo(0.7, 5);
    expect(treated.heartRate).toBeLessThan(untreated.heartRate);
    expect(untreated.heartRate).toBeCloseTo(8 * 1.5, 5);
    expect(applyTreatment(dev({ temperature: 0.3 }), withFx("antipyretic", 0), 500, GROUPS.lower_resp_infection!).temperature).toBe(0);
    expect(applyTreatment(dev({}), withFx("antipyretic", 0), 500, GROUPS.lower_resp_infection!).temperature).toBe(0);
  });

  it("typhoid's heart rate follows fever less (relative bradycardia)", () => {
    const hr = (g: string) => applyTreatment(dev({ temperature: 1.8 }), undefined, 500, GROUPS[g]!).heartRate;
    expect(hr("enteric_fever")).toBeLessThan(hr("febrile_tropical") / 3);
  });

  it("antihypertensives remove at most 20 / 10 mmHg of an excess and nothing from a normal or low pressure", () => {
    const d = applyTreatment(dev({ bloodPressureSystolic: 40, bloodPressureDiastolic: 18 }), withFx("antihypertensive", 0), 1000, GROUPS.stroke!);
    expect(d.bloodPressureSystolic).toBeCloseTo(20, 5);
    expect(d.bloodPressureDiastolic).toBeCloseTo(8, 5);
    const small = applyTreatment(dev({ bloodPressureSystolic: 8 }), withFx("antihypertensive", 0), 1000, GROUPS.stroke!);
    expect(small.bloodPressureSystolic).toBe(0);
    const low = applyTreatment(dev({ bloodPressureSystolic: -20 }), withFx("antihypertensive", 0), 1000, GROUPS.sepsis!);
    expect(low.bloodPressureSystolic).toBe(-20);
  });

  it("fluids correct hypotension and tachycardia in volume-depleted groups only", () => {
    const fl = withFx("fluid", 0);
    const vol = applyTreatment(dev({ bloodPressureSystolic: -20, heartRate: 20 }), fl, 100, GROUPS.volume_depletion!);
    expect(vol.bloodPressureSystolic).toBeCloseTo(-20 * 0.4, 5);
    expect(vol.heartRate).toBeCloseTo(20 * 0.5, 5);
    const other = applyTreatment(dev({ bloodPressureSystolic: -20, heartRate: 20 }), fl, 100, GROUPS.stroke!);
    expect(other.bloodPressureSystolic).toBe(-20);
    expect(other.heartRate).toBe(20);
  });

  it("bronchodilators and diuretics act on their own groups", () => {
    const bd = applyTreatment(dev({ oxygenSaturation: -5, respiratoryRate: 9 }), withFx("bronchodilator", 0), 100, GROUPS.airway_obstruction!);
    expect(bd.oxygenSaturation).toBeCloseTo(-2.5, 5);
    expect(applyTreatment(dev({ oxygenSaturation: -5 }), withFx("bronchodilator", 0), 100, GROUPS.heart_failure!).oxygenSaturation).toBe(-5);
    const du = applyTreatment(dev({ oxygenSaturation: -5, respiratoryRate: 7 }), withFx("diuretic", 0), 100, GROUPS.heart_failure!);
    expect(du.oxygenSaturation).toBeCloseTo(-3, 5);
  });

  it("analgesia reduces pain by the class effect (≈ MCID 1.3–1.5 for non-opioids, more for opioids) and never below baseline", () => {
    const pain = (cat: string) => applyTreatment(dev({ painLevel: 6 }), withFx(cat, 0), 200, GROUPS.femur_fracture!).painLevel;
    expect(pain("analgesic")).toBeCloseTo(4.5, 5);
    expect(pain("opioid")).toBeCloseTo(2.5, 5);
    expect(pain("opioid")).toBeLessThan(pain("nsaid"));
    expect(applyTreatment(dev({ painLevel: 1 }), withFx("opioid", 0), 200, GROUPS.femur_fracture!).painLevel).toBe(0);
  });

  it("effects ramp in over their onset and stop when the regimen ends", () => {
    const d0 = applyTreatment(dev({ temperature: 1.5 }), withFx("antipyretic", 0, 10000), 0, GROUPS.sepsis!);
    const dMid = applyTreatment(dev({ temperature: 1.5 }), withFx("antipyretic", 0, 10000), 30, GROUPS.sepsis!);
    const dFull = applyTreatment(dev({ temperature: 1.5 }), withFx("antipyretic", 0, 10000), 120, GROUPS.sepsis!);
    expect(d0.temperature).toBeGreaterThan(dMid.temperature);
    expect(dMid.temperature).toBeGreaterThan(dFull.temperature);
    expect(applyTreatment(dev({ temperature: 1.5 }), withFx("antipyretic", 0, 100), 200, GROUPS.sepsis!).temperature).toBeCloseTo(1.5, 5);
    expect(applyTreatment(dev({ temperature: 1.5 }), withFx("antipyretic", 500, 10000), 100, GROUPS.sepsis!).temperature).toBeCloseTo(1.5, 5);
  });

  it("does not mutate its inputs", () => {
    const input = dev({ temperature: 1.5, oxygenSaturation: -5 });
    const ledger = withFx("antipyretic", 0);
    const before = JSON.stringify([input, ledger]);
    applyTreatment(input, ledger, 300, GROUPS.lower_resp_infection!);
    expect(JSON.stringify([input, ledger])).toBe(before);
  });
});
