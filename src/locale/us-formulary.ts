/**
 * US formulary (Epic X M10.5b slice 3): FDA availability and USAN display
 * names over the engine's drug catalogue. Protocols keep matching on drug
 * codes and the catalogue's INN labels; only the name stored on the order
 * changes, so no clinical content is duplicated.
 *
 * - Not on a US formulary: betahistine (BET, not FDA-approved), hyoscine
 *   butylbromide (HYS, not marketed in the US), ranitidine (RAN, withdrawn
 *   from the US market in 2020). Only the Meniere's protocol prescribes one
 *   of them (betahistine); that action is skipped under the US formulary, a
 *   known gap pinned by tests/us-formulary.test.ts until a US substitute exists.
 * - USAN names replace INN names where they differ (acetaminophen, albuterol,
 *   meperidine, rifampin, ...).
 *
 * CALIBRATION PENDING: availability reflects the author's knowledge of FDA
 * status and is not checked against the Orange Book / NDC directory; the
 * sourced FDA formulary and USD acquisition prices are M10.5c. Prices stay in
 * us-prices.ts (placeholder, derived from the Indonesian cost).
 */
import type { IFormulary } from "./contracts.js";

export const US_UNAVAILABLE_DRUGS: readonly string[] = ["BET", "HYS", "RAN"];

/** INN -> USAN, applied to the leading name of the catalogue label. */
const USAN: [string, string][] = [
  ["Paracetamol", "Acetaminophen"],
  ["Salbutamol", "Albuterol"],
  ["Pethidine", "Meperidine"],
  ["Rifampicin", "Rifampin"],
  ["Ringer's Lactate", "Lactated Ringer's"],
  ["KCl", "Potassium chloride"],
  ["Vitamin B12", "Cyanocobalamin (B12)"],
  ["Vitamin K1", "Phytonadione (K1)"],
];

export function usanName(innName: string): string {
  for (const [inn, usan] of USAN) if (innName.startsWith(inn)) return usan + innName.slice(inn.length);
  return innName;
}

export class USFormulary implements IFormulary {
  config = { countryCode: "US", displayName: "United States (FDA)" };
  isAvailable(code: string): boolean { return !US_UNAVAILABLE_DRUGS.includes(code); }
  displayName(_code: string, innName: string): string { return usanName(innName); }
}
