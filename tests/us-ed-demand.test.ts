import { describe, it, expect, afterEach } from "vitest";
import { useUSLocale, resetLocale } from "../src/locale/us-locale.js";
import { getEdDemand } from "../src/locale/registry.js";
import { USEdDemand, US_ED_VISITS_PER_BED_PER_DAY } from "../src/locale/us-ed-demand.js";

afterEach(() => resetLocale());

describe("ED demand seam (M10.5c)", () => {
  it("Indonesian default keeps the fixed 3-tick cadence at any size", () => {
    for (const beds of [1, 50, 131, 1000]) expect(getEdDemand().arrivalIntervalTicks(beds)).toBe(3);
  });
  it("US locale switches the cadence and reset restores the default", () => {
    useUSLocale();
    expect(getEdDemand().arrivalIntervalTicks(131)).toBeGreaterThan(3);
    resetLocale();
    expect(getEdDemand().arrivalIntervalTicks(131)).toBe(3);
  });
  it("US rate is about 171 visits per staffed bed per year; 131 beds -> one arrival every 23 ticks", () => {
    expect(US_ED_VISITS_PER_BED_PER_DAY * 365).toBeCloseTo(171.3, 1);
    expect(new USEdDemand().arrivalIntervalTicks(131)).toBe(23);
  });
  it("bigger hospitals get shorter intervals, never below 1", () => {
    const d = new USEdDemand();
    expect(d.arrivalIntervalTicks(500)).toBeLessThan(d.arrivalIntervalTicks(100));
    expect(d.arrivalIntervalTicks(1_000_000)).toBe(1);
  });
});
