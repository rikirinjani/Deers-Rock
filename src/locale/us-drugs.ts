/**
 * US-only drug catalogue extension (Epic X M10.5b slice 3b): substitutes for
 * catalogue drugs not sold in the US, plus first-line US products the
 * Indonesian catalogue lacks. Added to the base catalogue only while the US
 * formulary is active (see drug-catalog.ts activeCatalog / findDrug).
 *
 * These entries have no hand-written clinical tables: dose range and
 * allergens come from the entry itself, and no protocol prescribes them yet
 * (US protocols are a later 10.5b slice); the substitutes are used when a
 * protocol asks for an off-formulary drug, the rest enter through the
 * formulary's random picks.
 *
 * CALIBRATION PENDING: costUsd is an unsourced placeholder per-unit
 * acquisition cost (M10.5c: CMS NADAC / ASP files).
 */
import type { DrugEntry } from "../engine/drug-catalog.js";

export const US_EXTRA_DRUGS: readonly DrugEntry[] = [
  // Substitutes for off-formulary drugs
  { code: "MEC", innName: "Meclizine 25mg", category: "other", dose: "25 mg", route: "PO", supplyCode: "MED-MEC", costIdr: 0, costUsd: 0.1, allergens: [], classTag: "antihistamine_vertigo", minMg: 12.5, maxMg: 25, maxDailyMg: 100 },
  { code: "FAM", innName: "Famotidine 20mg", category: "h2blocker", dose: "20 mg", route: "PO", supplyCode: "MED-FAM", costIdr: 0, costUsd: 0.15, allergens: [], classTag: "h2_blocker", minMg: 10, maxMg: 20, maxDailyMg: 40 },
  { code: "DIC", innName: "Dicyclomine 20mg", category: "antispasmodic", dose: "20 mg", route: "PO", supplyCode: "MED-DIC", costIdr: 0, costUsd: 0.2, allergens: [], classTag: "anticholinergic_antispasmodic", minMg: 10, maxMg: 20, maxDailyMg: 80 },
  // First-line US products absent from the Indonesian catalogue
  { code: "APX", innName: "Apixaban 5mg", category: "anticoagulant", dose: "5 mg", route: "PO", supplyCode: "MED-APX", costIdr: 0, costUsd: 6, allergens: [], classTag: "doac", minMg: 2.5, maxMg: 5, maxDailyMg: 10 },
  { code: "PIP", innName: "Piperacillin-tazobactam 4.5g", category: "antibiotic", dose: "4.5 g", route: "IV", supplyCode: "MED-PIP", costIdr: 0, costUsd: 12, allergens: ["penicillin"], classTag: "penicillin", minMg: 2250, maxMg: 4500, maxDailyMg: 18000 },
  { code: "CFZ", innName: "Cefazolin 2g", category: "antibiotic", dose: "2 g", route: "IV", supplyCode: "MED-CFZ", costIdr: 0, costUsd: 3, allergens: ["cephalosporin"], classTag: "cephalosporin", minMg: 1000, maxMg: 2000, maxDailyMg: 6000 },
  { code: "EMP", innName: "Empagliflozin 10mg", category: "antidiabetic", dose: "10 mg", route: "PO", supplyCode: "MED-EMP", costIdr: 0, costUsd: 20, allergens: [], classTag: "sglt2", minMg: 10, maxMg: 25, maxDailyMg: 25 },
];

/** Off-formulary drug -> US substitute (all substitutes are in US_EXTRA_DRUGS). */
export const US_SUBSTITUTES: Readonly<Record<string, string>> = {
  BET: "MEC",   // betahistine (not FDA-approved) -> meclizine
  RAN: "FAM",   // ranitidine (withdrawn 2020) -> famotidine
  HYS: "DIC",   // hyoscine butylbromide (not US-marketed) -> dicyclomine
};
