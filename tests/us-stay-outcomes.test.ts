import { describe, it, expect, afterEach } from "vitest";
import { getStayOutcomes, resetStayOutcomes } from "../src/locale/registry.js";
import { useUSLocale, resetLocale } from "../src/locale/us-locale.js";
import { US_DIAGNOSES } from "../src/locale/us-casemix.js";
import { US_ICD_TO_CCSR, US_MEAN_LOS_DAYS_2023, USStayOutcomes, usMeanLosDays, usDeathRate } from "../src/locale/us-stay-outcomes.js";
import { US_HCUP_CCSR_2023 } from "../src/locale/us-hcup-ccsr.js";

afterEach(() => { resetLocale(); resetStayOutcomes(); });

describe("stay outcomes seam (step E)", () => {
  it("the default is the original 3-7 day stay and the tier probability, unchanged", () => {
    const d = getStayOutcomes();
    expect(d.dischargeDelayMinutes("I50", 0)).toBe(4320);
    expect(d.dischargeDelayMinutes("I50", 0.5)).toBe(4320 + 2880);
    expect(d.dischargeDelayMinutes("I50", 0.999999)).toBe(4320 + Math.floor(0.999999 * 5760));
    expect(d.deathProbability("A41", 0.0123, "low")).toBe(0.0123);
    expect(d.deathProbability("XXX", 0.25, "high")).toBe(0.25);
  });

  it("the US switch and reset", () => {
    useUSLocale();
    expect(getStayOutcomes().config.countryCode).toBe("US");
    resetLocale();
    expect(getStayOutcomes().config.countryCode).toBe("ID");
  });

  it("every code of the US pool is mapped to a CCSR category that exists", () => {
    const missing = US_DIAGNOSES.map(d => d.code).filter(c => !(c in US_ICD_TO_CCSR));
    expect(missing).toEqual([]);
    for (const [icd, ccsr] of Object.entries(US_ICD_TO_CCSR)) expect(US_HCUP_CCSR_2023[ccsr], `${icd} -> ${ccsr}`).toBeDefined();
  });

  it("HCUP values are read through the map (2023 HCUPnet)", () => {
    expect(usMeanLosDays("I50")).toBe(5.8);       // heart failure
    expect(usMeanLosDays("A41")).toBe(7.5);       // septicemia (A40 and A49 map the same way)
    expect(usDeathRate("A40")).toBeCloseTo(0.0866, 4);
    expect(usDeathRate("M17")).toBeCloseTo(0.0009, 4);
    expect(usDeathRate("F32")).toBe(0);           // suppressed by HCUPnet
  });

  it("US stay is the group mean +-40 % and unmapped codes use the all-stay mean", () => {
    const us = new USStayOutcomes();
    expect(us.dischargeDelayMinutes("I50", 0.5)).toBe(Math.round(5.8 * 1440));
    expect(us.dischargeDelayMinutes("I50", 0)).toBe(Math.round(5.8 * 1440 * 0.6));
    expect(us.dischargeDelayMinutes("ZZZ", 0.5)).toBe(Math.round(US_MEAN_LOS_DAYS_2023 * 1440));
  });

  it("death: group rate for the low tier, the larger of rate and tier above it, tier for unmapped codes", () => {
    const us = new USStayOutcomes();
    const rate = usDeathRate("I50")!;
    expect(us.deathProbability("I50", 0.008, "low")).toBe(rate);
    expect(us.deathProbability("I50", 0.06, "moderate")).toBe(0.06);
    expect(us.deathProbability("I50", 0.25, "high")).toBe(0.25);
    expect(us.deathProbability("I50", 0.001, "moderate")).toBe(rate);
    expect(us.deathProbability("ZZZ", 0.0123, "low")).toBe(0.0123);
  });
});
