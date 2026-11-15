import { describe, it, expect, afterEach } from "vitest";
import { getStayOutcomes, resetStayOutcomes } from "../src/locale/registry.js";
import { useUSLocale, resetLocale } from "../src/locale/us-locale.js";
import { US_DIAGNOSES } from "../src/locale/us-casemix.js";
import { US_ICD_TO_CCSR, US_MEAN_LOS_DAYS_2023, USStayOutcomes, usMeanLosDays, usDeathRate, usMeanTierProbability } from "../src/locale/us-stay-outcomes.js";
import { US_TIER_BY_ICD, US_TIER_GLOBAL } from "../src/locale/us-tier-mix.js";
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

  it("death: HCUP rate scaled by tier over the diagnosis mean tier, so the diagnosis average is its HCUP rate", () => {
    const us = new USStayOutcomes();
    const rate = usDeathRate("I50")!;
    const mean = usMeanTierProbability("I50");
    expect(us.deathProbability("I50", mean, "moderate")).toBeCloseTo(rate, 10);          // average patient = group rate
    expect(us.deathProbability("I50", 2 * mean, "high")).toBeCloseTo(2 * rate, 10);       // sicker patient dies more
    expect(us.deathProbability("I50", 0.5 * mean, "low")).toBeCloseTo(0.5 * rate, 10);
    expect(us.deathProbability("I50", 10, "high")).toBe(0.95);                            // capped
    expect(us.deathProbability("F32", 0.2, "high")).toBe(0);                              // suppressed rate = 0
    expect(us.deathProbability("ZZZ", 0.0123, "low")).toBe(0.0123);                       // unmapped = tier model
  });

  it("measured tier mean: heart failure well above knee osteoarthritis, rare codes shrink to the global mean", () => {
    expect(usMeanTierProbability("I50")).toBeGreaterThan(5 * usMeanTierProbability("M17"));
    expect(usMeanTierProbability("ZZZ")).toBeCloseTo(US_TIER_GLOBAL.mean, 10);
    expect(Object.keys(US_TIER_BY_ICD).length).toBeGreaterThan(100);
  });
});
