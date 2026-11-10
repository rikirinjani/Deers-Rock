/**
 * US emergency department arrival volume (Epic X M10.5c): ED visits per staffed bed from national totals.
 *
 * Source: 155.4 million ED visits (CDC NHAMCS 2022, docs/us-calibration-targets.md T-ED-1) divided by 907,216
 * staffed beds of all US hospitals (AHA 2024, T-CAP-1) = about 171 visits per staffed bed per year. The years
 * differ and the bed count includes hospitals without an ED, so this is an order-of-magnitude per-bed average.
 * Cross-check: CDC NCHS Advance Data 376 (NHAMCS 2003-04) reports 93.4 visits a day and 192.1 staffed beds for
 * the average metropolitan ED, about 178 per bed per year (T-ED-4).
 *
 * Deterministic constants: no RNG, no clock.
 */
import type { IEdDemand } from "./contracts.js";
import { US_STAFFED_BEDS_2024 } from "./us-staffing.js";

export const US_ED_VISITS_2022 = 155_400_000;
const TICKS_PER_DAY = 1440;
const DAYS_PER_YEAR = 365;

/** ED visits per staffed bed per day. */
export const US_ED_VISITS_PER_BED_PER_DAY = US_ED_VISITS_2022 / US_STAFFED_BEDS_2024 / DAYS_PER_YEAR;

export class USEdDemand implements IEdDemand {
  config = { countryCode: "US", displayName: "United States" };
  arrivalIntervalTicks(totalBeds: number): number {
    const perDay = US_ED_VISITS_PER_BED_PER_DAY * Math.max(1, totalBeds);
    return Math.max(1, Math.round(TICKS_PER_DAY / perDay));
  }
}
