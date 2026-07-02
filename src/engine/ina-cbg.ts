/**
 * INA-CBG (Indonesia Case-Based Groups) mapping.
 *
 * Each ICD-10 code maps to a Case Based Group (CBG) with a fixed all-inclusive
 * tariff covering room, drugs, procedures, and labs. Tariff based on
 * PMK 28/2020 (INA-CBG tariff table) for RS Tipe A, regional index 1.0.
 *
 * Payment is per episode — hospital profits if actual cost < tariff,
 * absorbs loss if actual cost > tariff.
 *
 * Severity levels (PMK 3/2023):
 *   Level I  — w/o CC (without complication/comorbidity)
 *   Level II — w CC (with complication/comorbidity, mild)
 *   Level III — w MCC (with major complication/comorbidity)
 *
 * Reference: Permenkes No. 28/2020, PMK 3/2023 tentang INA-CBG
 */

export type SeverityLevel = "I" | "II" | "III";

export interface CbgEntry {
  icdCode: string;
  cbgGroup: string;
  tariffIdr: number;
  description: string;
  severity?: SeverityLevel;
}

/**
 * Simplified CC list for simulation.
 * Tags each ICD-10 code as mild (w CC) or major (w MCC).
 * Codes not in the list are treated as w/o CC (Level I).
 */
export const CC_LIST: Record<string, "mild" | "major"> = {
  "I10": "mild",      // Essential hypertension
  "E11": "mild",      // Type 2 diabetes
  "E78": "mild",      // Hyperlipidemia
  "N18": "mild",      // CKD
  "J44": "mild",      // COPD
  "E05": "mild",      // Hyperthyroidism
  "M81": "mild",      // Osteoporosis
  "D64": "mild",      // Anemia
  "E86": "mild",      // Dehydration
  "N39": "mild",      // UTI
  "B20": "major",     // HIV
  "I50": "major",     // Heart failure
  "I21": "major",     // AMI
  "N18.5": "major",   // CKD stage 5
  "J96": "major",     // Respiratory failure
  "R57": "major",     // Septic shock
};

/**
 * ICD-9-CM procedure codes commonly performed for each diagnosis.
 * Only diagnoses that typically involve a procedure are listed.
 * Used for chart coding completeness and INA-CBG severity awareness.
 */
export const ICD9_PROCEDURES: { code: string; name: string; icdCodes: string[] }[] = [
  { code: "47.01", name: "Laparoscopic appendectomy", icdCodes: ["K35"] },
  { code: "51.23", name: "Laparoscopic cholecystectomy", icdCodes: ["K80"] },
  { code: "85.43", name: "Mastectomy", icdCodes: ["C50"] },
  { code: "60.29", name: "TURP (Transurethral prostatectomy)", icdCodes: ["N40"] },
  { code: "68.29", name: "Myomectomy", icdCodes: ["D25"] },
  { code: "81.54", name: "Total knee arthroplasty", icdCodes: ["M17"] },
  { code: "79.35", name: "Open reduction of femur fracture with internal fixation", icdCodes: ["S72"] },
  { code: "01.24", name: "Craniotomy", icdCodes: ["S06"] },
  { code: "86.22", name: "Debridement of wound", icdCodes: ["T20", "T14", "E11.5"] },
  { code: "86.28", name: "Skin graft", icdCodes: ["T20"] },
  { code: "99.10", name: "Thrombolytic therapy", icdCodes: ["I63"] },
  { code: "36.07", name: "Drug-eluting coronary stent insertion", icdCodes: ["I21"] },
  { code: "39.95", name: "Hemodialysis", icdCodes: ["N18"] },
  { code: "73.59", name: "Vaginal delivery", icdCodes: ["O80"] },
  { code: "74.1", name: "Cesarean section", icdCodes: ["O80"] },
  { code: "84.17", name: "Below knee amputation", icdCodes: ["E11.5"] },
  { code: "96.04", name: "Mechanical ventilation >96 hours", icdCodes: ["J44", "J15", "J18"] },
  { code: "20.01", name: "Myringotomy with tube insertion", icdCodes: ["H66"] },
  { code: "88.56", name: "Coronary angiography", icdCodes: ["I21", "I05"] },
  { code: "45.23", name: "Colonoscopy", icdCodes: ["D25", "K80"] },
  { code: "39.25", name: "AV fistula creation for dialysis", icdCodes: ["N18"] },
  { code: "86.59", name: "Wound closure", icdCodes: ["T14"] },
  { code: "84.10", name: "Partial amputation of lower limb", icdCodes: ["E11.5"] },
];

/**
 * Get procedure codes that could apply to a given diagnosis.
 */
export function getProceduresForDiagnosis(icdCode: string): { code: string; name: string }[] {
  return ICD9_PROCEDURES
    .filter(p => p.icdCodes.includes(icdCode))
    .map(p => ({ code: p.code, name: p.name }));
}

/**
 * Given a list of diagnosis codes, infer severity level (I/II/III).
 * Uses CC list classification + diagnosis count as approximation.
 *
 * Rules:
 * - 0 secondary diagnoses → Level I (w/o CC)
 * - Any secondary is "major" CC → Level III (w MCC)
 * - Any secondary is "mild" CC → Level II (w CC)
 * - No CC-tagged secondaries but 2+ diagnoses → Level II
 */
export function inferSeverity(diagnosisCodes: string[]): SeverityLevel {
  if (diagnosisCodes.length <= 1) return "I";
  const [, ...secondaries] = diagnosisCodes;
  const seen = new Set<string>();
  for (const code of secondaries) {
    if (seen.has(code)) continue;
    seen.add(code);
    const cc = CC_LIST[code];
    if (cc === "major") return "III";
  }
  for (const code of secondaries) {
    if (seen.has(code)) continue;
    seen.add(code);
    const cc = CC_LIST[code];
    if (cc === "mild") return "II";
  }
  // Multiple diagnoses but none CC-tagged → Level II
  return "II";
}

export const INA_CBG: CbgEntry[] = [
  // === Infectious Diseases ===
  { icdCode: "A01", cbgGroup: "I01A", tariffIdr: 4_200_000, description: "Typhoid fever, w/o CC" },
  { icdCode: "A09", cbgGroup: "I06A", tariffIdr: 3_100_000, description: "Infectious gastroenteritis, w/o CC" },
  { icdCode: "A15", cbgGroup: "I03A", tariffIdr: 8_500_000, description: "Tuberculosis, w/o CC" },
  { icdCode: "A27", cbgGroup: "I04A", tariffIdr: 6_800_000, description: "Leptospirosis, w/o CC" },
  { icdCode: "A41", cbgGroup: "I10C", tariffIdr: 12_000_000, description: "Sepsis, w MCC", severity: "III" },
  { icdCode: "A82", cbgGroup: "I15A", tariffIdr: 15_000_000, description: "Rabies, w/o CC" },
  { icdCode: "A91", cbgGroup: "I12A", tariffIdr: 7_200_000, description: "Dengue hemorrhagic fever" },
  { icdCode: "B20", cbgGroup: "I20B", tariffIdr: 9_500_000, description: "HIV disease w opportunistic infections", severity: "II" },
  { icdCode: "B50", cbgGroup: "I08A", tariffIdr: 5_500_000, description: "Malaria, severe" },
  { icdCode: "B86", cbgGroup: "I22A", tariffIdr: 2_800_000, description: "Scabies, w/o CC" },

  // === Neoplasms ===
  { icdCode: "C50", cbgGroup: "M01A", tariffIdr: 14_000_000, description: "Breast malignancy, w/o CC" },
  { icdCode: "C61", cbgGroup: "M02A", tariffIdr: 10_500_000, description: "Prostate malignancy, w/o CC" },

  // === Blood Disorders ===
  { icdCode: "D25", cbgGroup: "H01A", tariffIdr: 8_500_000, description: "Leiomyoma of uterus" },
  { icdCode: "D50", cbgGroup: "H02A", tariffIdr: 3_500_000, description: "Iron deficiency anemia" },
  { icdCode: "D64", cbgGroup: "H03A", tariffIdr: 4_200_000, description: "Anemia unspecified, w/o CC" },

  // === Endocrine ===
  { icdCode: "E05", cbgGroup: "E01A", tariffIdr: 5_800_000, description: "Hyperthyroidism, w/o CC" },
  { icdCode: "E10", cbgGroup: "E02A", tariffIdr: 5_200_000, description: "Type 1 diabetes mellitus" },
  { icdCode: "E11", cbgGroup: "E03A", tariffIdr: 4_800_000, description: "Type 2 diabetes mellitus, w/o CC" },
  { icdCode: "E66", cbgGroup: "E05A", tariffIdr: 3_800_000, description: "Obesity, w/o CC" },
  { icdCode: "E78", cbgGroup: "E04A", tariffIdr: 3_200_000, description: "Hyperlipidemia, w/o CC" },
  { icdCode: "E86", cbgGroup: "E06A", tariffIdr: 2_800_000, description: "Volume depletion / dehydration" },

  // === Mental Disorders ===
  { icdCode: "F32", cbgGroup: "F01A", tariffIdr: 5_500_000, description: "Major depressive disorder, single episode" },
  { icdCode: "F41", cbgGroup: "F02A", tariffIdr: 4_200_000, description: "Anxiety disorder, w/o CC" },

  // === Nervous System ===
  { icdCode: "G20", cbgGroup: "G01A", tariffIdr: 6_500_000, description: "Parkinson disease, w/o CC" },
  { icdCode: "G40", cbgGroup: "G02A", tariffIdr: 5_800_000, description: "Epilepsy, w/o CC" },
  { icdCode: "I63", cbgGroup: "B01A", tariffIdr: 14_500_000, description: "Cerebral infarction, w/o CC" },

  // === Circulatory ===
  { icdCode: "I10", cbgGroup: "B02A", tariffIdr: 3_500_000, description: "Essential hypertension, w/o CC" },
  { icdCode: "I21", cbgGroup: "B03A", tariffIdr: 18_000_000, description: "Acute myocardial infarction" },
  { icdCode: "I48", cbgGroup: "B04A", tariffIdr: 8_500_000, description: "Atrial fibrillation, w/o CC" },
  { icdCode: "I50", cbgGroup: "B05A", tariffIdr: 10_500_000, description: "Heart failure, w/o CC" },
  { icdCode: "I05", cbgGroup: "B06B", tariffIdr: 22_000_000, description: "Rheumatic heart disease, w CC", severity: "II" },
  { icdCode: "I83", cbgGroup: "B07A", tariffIdr: 3_200_000, description: "Varicose veins, w/o CC" },

  // === Respiratory ===
  { icdCode: "J12", cbgGroup: "C01A", tariffIdr: 6_200_000, description: "Viral pneumonia, w/o CC" },
  { icdCode: "J15", cbgGroup: "C02A", tariffIdr: 7_500_000, description: "Bacterial pneumonia, w/o CC" },
  { icdCode: "J18", cbgGroup: "C03A", tariffIdr: 5_800_000, description: "Pneumonia unspecified" },
  { icdCode: "J20", cbgGroup: "C04A", tariffIdr: 2_500_000, description: "Acute bronchitis, w/o CC" },
  { icdCode: "J32", cbgGroup: "C05A", tariffIdr: 3_800_000, description: "Chronic sinusitis, w/o CC" },
  { icdCode: "J44", cbgGroup: "C06A", tariffIdr: 6_500_000, description: "COPD, w/o CC" },
  { icdCode: "J45", cbgGroup: "C07A", tariffIdr: 3_500_000, description: "Asthma, w/o CC" },
  { icdCode: "J84", cbgGroup: "C08A", tariffIdr: 8_500_000, description: "Interstitial lung disease, w/o CC" },

  // === Digestive ===
  { icdCode: "K25", cbgGroup: "D01A", tariffIdr: 5_500_000, description: "Gastric ulcer, w/o CC" },
  { icdCode: "K29", cbgGroup: "D02A", tariffIdr: 3_200_000, description: "Gastritis, w/o CC" },
  { icdCode: "K35", cbgGroup: "D03A", tariffIdr: 10_500_000, description: "Acute appendicitis, w/o CC" },
  { icdCode: "K56", cbgGroup: "D04A", tariffIdr: 8_500_000, description: "Paralytic ileus, w/o CC" },
  { icdCode: "K80", cbgGroup: "D05B", tariffIdr: 12_000_000, description: "Cholelithiasis, w CC", severity: "II" },

  // === Musculoskeletal ===
  { icdCode: "M06", cbgGroup: "J01A", tariffIdr: 5_200_000, description: "Rheumatoid arthritis, w/o CC" },
  { icdCode: "M17", cbgGroup: "J02A", tariffIdr: 15_000_000, description: "Osteoarthritis of knee" },
  { icdCode: "M54", cbgGroup: "J03A", tariffIdr: 4_500_000, description: "Low back pain, w/o CC" },
  { icdCode: "M81", cbgGroup: "J04A", tariffIdr: 3_800_000, description: "Osteoporosis, w/o CC" },

  // === Skin ===
  { icdCode: "L03", cbgGroup: "K01A", tariffIdr: 3_500_000, description: "Cellulitis, w/o CC" },
  { icdCode: "L40", cbgGroup: "K02A", tariffIdr: 2_800_000, description: "Psoriasis, w/o CC" },

  // === Genitourinary ===
  { icdCode: "N13", cbgGroup: "L01A", tariffIdr: 4_500_000, description: "Obstructive uropathy, w/o CC" },
  { icdCode: "N18", cbgGroup: "L02A", tariffIdr: 6_500_000, description: "Chronic kidney disease, w/o CC" },
  { icdCode: "N20", cbgGroup: "L03A", tariffIdr: 4_800_000, description: "Renal colic / kidney stone" },
  { icdCode: "N39", cbgGroup: "L04A", tariffIdr: 3_200_000, description: "Urinary tract infection, w/o CC" },
  { icdCode: "N40", cbgGroup: "L05A", tariffIdr: 6_500_000, description: "BPH, w/o CC" },
  { icdCode: "N76", cbgGroup: "L06A", tariffIdr: 2_500_000, description: "Vulvovaginitis, w/o CC" },

  // === Pregnancy & Neonatal ===
  { icdCode: "O20", cbgGroup: "O01A", tariffIdr: 4_500_000, description: "Threatened abortion" },
  { icdCode: "O80", cbgGroup: "O02A", tariffIdr: 6_800_000, description: "Single spontaneous delivery" },
  { icdCode: "P07", cbgGroup: "P01A", tariffIdr: 12_000_000, description: "Preterm newborn, w/o CC" },
  { icdCode: "P36", cbgGroup: "P02A", tariffIdr: 10_500_000, description: "Neonatal sepsis" },
  { icdCode: "P59", cbgGroup: "P03A", tariffIdr: 4_200_000, description: "Neonatal jaundice" },
  { icdCode: "Q21", cbgGroup: "P04A", tariffIdr: 25_000_000, description: "Congenital heart disease" },

  // === Trauma & External ===
  { icdCode: "S06", cbgGroup: "T01A", tariffIdr: 18_000_000, description: "Intracranial injury, w/o CC" },
  { icdCode: "S72", cbgGroup: "T02A", tariffIdr: 16_000_000, description: "Fracture of femur" },
  { icdCode: "T14", cbgGroup: "T03A", tariffIdr: 3_800_000, description: "Open wound, w/o CC" },
  { icdCode: "T20", cbgGroup: "T04A", tariffIdr: 12_000_000, description: "Burns, 2nd degree, w/o CC" },
  { icdCode: "T63", cbgGroup: "T05A", tariffIdr: 8_500_000, description: "Snake bite envenomation" },

  // === Septic Shock ===
  { icdCode: "R57", cbgGroup: "I11A", tariffIdr: 22_000_000, description: "Septic shock" },

  // === ENT ===
  { icdCode: "H66", cbgGroup: "H03A", tariffIdr: 3_200_000, description: "Otitis media, w/o CC" },

  // === Congenital (extra) ===
  { icdCode: "E11.5", cbgGroup: "E03B", tariffIdr: 7_500_000, description: "Type 2 diabetes w diabetic foot" },
];

// Severity tariff multipliers (approximate based on PMK 3/2023 patterns)
// Level II (w CC): ~35% above base
// Level III (w MCC): ~70% above base
const SEVERITY_MULTIPLIER: Record<SeverityLevel, number> = {
  I: 1.0,
  II: 1.35,
  III: 1.70,
};

/**
 * Look up INA-CBG tariff for an ICD code at a given severity level.
 * Returns Level I tariff by default. Computes II/III tariff via multiplier
 * when the base entry is Level I. Entries already tagged with II/III use their tariff as-is.
 * Returns undefined if code not found.
 */
export function lookupCbgTariff(icdCode: string, severity: SeverityLevel = "I"): CbgEntry | undefined {
  const base = INA_CBG.find(e => e.icdCode === icdCode);
  if (!base) return undefined;
  const baseSeverity = base.severity ?? "I";
  // If entry already has this severity, return as-is
  if (severity === baseSeverity) return base;
  // If entry is lower severity, compute up
  if (severity !== "I") {
    const multiplier = SEVERITY_MULTIPLIER[severity] / SEVERITY_MULTIPLIER[baseSeverity];
    return {
      ...base,
      tariffIdr: Math.round(base.tariffIdr * multiplier),
      severity,
      description: `${base.description.replace(/, (w\/o CC|w CC|w MCC)$/i, "")}, ${severity === "II" ? "w CC" : "w MCC"}`,
    };
  }
  // Requested severity I but entry is higher — shouldn't normally happen, return as-is
  return base;
}

/**
 * Get severity-specific CBG code suffix (A/B/C).
 */
export function getCbgSuffix(severity: SeverityLevel): string {
  if (severity === "I") return "A";
  if (severity === "II") return "B";
  return "C";
}

/**
 * Compute severity-adjusted CBG group code.
 * E.g., "B02A" + Level III → "B02C"
 */
export function getSeverityCbgGroup(cbgGroup: string, severity: SeverityLevel): string {
  return cbgGroup.slice(0, -1) + getCbgSuffix(severity);
}

/**
 * Get all unique CBG groups.
 */
export function listCbgGroups(): string[] {
  return [...new Set(INA_CBG.map(e => e.cbgGroup))];
}
