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
  // Addiction medicine / alcohol use disorder
  { code: "THI", innName: "Thiamine 100mg", category: "other", dose: "100 mg", route: "IV", supplyCode: "MED-THI", costIdr: 0, costUsd: 1.5, allergens: [], classTag: "vitamin_b1", minMg: 100, maxMg: 500, maxDailyMg: 500 },
  { code: "NTX", innName: "Naltrexone 50mg", category: "other", dose: "50 mg", route: "PO", supplyCode: "MED-NTX", costIdr: 0, costUsd: 1, allergens: [], classTag: "opioid_antagonist", minMg: 25, maxMg: 50, maxDailyMg: 100 },
];

/** Off-formulary drug -> US substitute (all substitutes are in US_EXTRA_DRUGS). */
export const US_SUBSTITUTES: Readonly<Record<string, string>> = {
  BET: "MEC",   // betahistine (not FDA-approved) -> meclizine
  RAN: "FAM",   // ranitidine (withdrawn 2020) -> famotidine
  HYS: "DIC",   // hyoscine butylbromide (not US-marketed) -> dicyclomine
};

type Sev = "minor" | "moderate" | "major" | "contraindicated";
const ix = (severity: Sev, desc: string) => ({ severity, desc });

/** Interactions for the extension drugs, listed in both directions (the base table is keyed by the new drug). */
export const US_DRUG_INTERACTIONS: Readonly<Record<string, Readonly<Record<string, { severity: Sev; desc: string }>>>> = {
  APX: {
    WAF: ix("major", "Apixaban + Warfarin: do not combine, additive anticoagulation"),
    HEP: ix("major", "Apixaban + Enoxaparin: increased bleeding risk"),
    HEP5: ix("major", "Apixaban + Heparin: increased bleeding risk"),
    HEP10: ix("major", "Apixaban + Heparin: increased bleeding risk"),
    RIV: ix("major", "Apixaban + Rivaroxaban: duplicate anticoagulant"),
    ASP: ix("major", "Apixaban + Aspirin: increased bleeding risk"),
    CLO: ix("major", "Apixaban + Clopidogrel: increased bleeding risk"),
    IBU: ix("major", "Apixaban + Ibuprofen: increased bleeding risk"),
    NEC: ix("major", "Apixaban + Diclofenac: increased bleeding risk"),
    TNK: ix("major", "Apixaban + Tenecteplase: severe hemorrhage risk"),
  },
  PIP: {
    VAN: ix("moderate", "Piperacillin-tazobactam + Vancomycin: increased risk of acute kidney injury"),
    WAF: ix("moderate", "Piperacillin-tazobactam + Warfarin: INR may rise, monitor"),
    MTX: ix("major", "Piperacillin-tazobactam + Methotrexate: reduced methotrexate clearance, toxicity"),
  },
  CFZ: { WAF: ix("moderate", "Cefazolin + Warfarin: INR may rise, monitor") },
  NTX: {
    MOR: ix("major", "Naltrexone + Morphine: opioid blockade, precipitated withdrawal"),
    MOR5: ix("major", "Naltrexone + Morphine: opioid blockade, precipitated withdrawal"),
    TRM: ix("major", "Naltrexone + Tramadol: opioid blockade, precipitated withdrawal"),
    TRA: ix("major", "Naltrexone + Tramadol: opioid blockade, precipitated withdrawal"),
    PET: ix("major", "Naltrexone + Pethidine: opioid blockade, precipitated withdrawal"),
    FNT: ix("major", "Naltrexone + Fentanyl: opioid blockade, precipitated withdrawal"),
    FAS: ix("major", "Naltrexone + Fentanyl patch: opioid blockade, precipitated withdrawal"),
    BUP: ix("major", "Naltrexone + Buprenorphine: antagonist blocks the agonist, precipitated withdrawal"),
  },
  EMP: {
    FUR: ix("moderate", "Empagliflozin + Furosemide: volume depletion and hypotension"),
    INS: ix("moderate", "Empagliflozin + Insulin: hypoglycemia, consider lowering the insulin dose"),
    GLP: ix("moderate", "Empagliflozin + Glipizide: hypoglycemia"),
  },
  MEC: {
    DIA: ix("moderate", "Meclizine + Diazepam: additive sedation"),
    MOR: ix("moderate", "Meclizine + Morphine: additive sedation"),
  },
  // Base drug as the new drug, extension drug already on the chart
  WAF: { APX: ix("major", "Warfarin + Apixaban: do not combine, additive anticoagulation"), PIP: ix("moderate", "Warfarin + Piperacillin-tazobactam: INR may rise, monitor"), CFZ: ix("moderate", "Warfarin + Cefazolin: INR may rise, monitor") },
  HEP: { APX: ix("major", "Enoxaparin + Apixaban: increased bleeding risk") },
  HEP5: { APX: ix("major", "Heparin + Apixaban: increased bleeding risk") },
  HEP10: { APX: ix("major", "Heparin + Apixaban: increased bleeding risk") },
  RIV: { APX: ix("major", "Rivaroxaban + Apixaban: duplicate anticoagulant") },
  ASP: { APX: ix("major", "Aspirin + Apixaban: increased bleeding risk") },
  CLO: { APX: ix("major", "Clopidogrel + Apixaban: increased bleeding risk") },
  IBU: { APX: ix("major", "Ibuprofen + Apixaban: increased bleeding risk") },
  NEC: { APX: ix("major", "Diclofenac + Apixaban: increased bleeding risk") },
  TNK: { APX: ix("major", "Tenecteplase + Apixaban: severe hemorrhage risk") },
  VAN: { PIP: ix("moderate", "Vancomycin + Piperacillin-tazobactam: increased risk of acute kidney injury") },
  MTX: { PIP: ix("major", "Methotrexate + Piperacillin-tazobactam: reduced methotrexate clearance, toxicity") },
  MOR: { NTX: ix("major", "Morphine + Naltrexone: opioid blockade, precipitated withdrawal"), MEC: ix("moderate", "Morphine + Meclizine: additive sedation") },
  MOR5: { NTX: ix("major", "Morphine + Naltrexone: opioid blockade, precipitated withdrawal") },
  TRM: { NTX: ix("major", "Tramadol + Naltrexone: opioid blockade, precipitated withdrawal") },
  TRA: { NTX: ix("major", "Tramadol + Naltrexone: opioid blockade, precipitated withdrawal") },
  PET: { NTX: ix("major", "Pethidine + Naltrexone: opioid blockade, precipitated withdrawal") },
  FNT: { NTX: ix("major", "Fentanyl + Naltrexone: opioid blockade, precipitated withdrawal") },
  FAS: { NTX: ix("major", "Fentanyl patch + Naltrexone: opioid blockade, precipitated withdrawal") },
  BUP: { NTX: ix("major", "Buprenorphine + Naltrexone: antagonist blocks the agonist, precipitated withdrawal") },
  FUR: { EMP: ix("moderate", "Furosemide + Empagliflozin: volume depletion and hypotension") },
  INS: { EMP: ix("moderate", "Insulin + Empagliflozin: hypoglycemia, consider lowering the insulin dose") },
  GLP: { EMP: ix("moderate", "Glipizide + Empagliflozin: hypoglycemia") },
  DIA: { MEC: ix("moderate", "Diazepam + Meclizine: additive sedation") },
};

export const US_DRUG_CONTRAINDICATIONS: readonly { drugCode: string; diagCodes: string[]; rationale: string }[] = [
  { drugCode: "APX", diagCodes: ["I60", "S06"], rationale: "Apixaban: contraindicated with intracranial hemorrhage or injury" },
  { drugCode: "APX", diagCodes: ["K25", "K26"], rationale: "Apixaban: peptic ulcer bleeding risk, review before anticoagulation" },
  { drugCode: "NTX", diagCodes: ["K70", "K71", "K72", "K73", "K74"], rationale: "Naltrexone: hepatotoxic at high doses, caution in liver disease" },
  { drugCode: "EMP", diagCodes: ["N17", "N18", "N19"], rationale: "Empagliflozin: avoid in acute kidney injury, limited effect with reduced eGFR" },
  { drugCode: "DIC", diagCodes: ["K56", "N40"], rationale: "Dicyclomine: avoid in intestinal obstruction and urinary retention (anticholinergic)" },
  { drugCode: "PIP", diagCodes: ["N17"], rationale: "Piperacillin-tazobactam: dose adjustment in acute kidney injury" },
];
