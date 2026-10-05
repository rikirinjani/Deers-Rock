/**
 * INA-CBG (Indonesia Case-Based Groups) mapping — ADR-010 expanded.
 *
 * Each ICD-10 code maps to a Case Based Group (CBG) with a fixed all-inclusive
 * tariff covering room, drugs, procedures, and labs. Tariff based on
 * PMK 28/2020 (INA-CBG tariff table) for RS Tipe C (0.7× Tipe A baseline).
 *
 * Severity is scored via SEP (Severity of Illness Points), 0–4:
 *   SEP 0 (Level I, w/o CC)  → ×1.00  base tariff
 *   SEP 1 (Level I, minor CC) → ×1.15
 *   SEP 2 (Level II, w CC)    → ×1.35
 *   SEP 3 (Level III, w CC)   → ×1.60
 *   SEP 4 (Level III, w MCC)  → ×1.90
 *
 * Base tariff is the SEP-0 price. lookupCbgTariff() computes the final price
 * from the inferred SEP level. Entries tagged with an explicit severity override
 * inference for that specific code+severity combination.
 *
 * Reference: Permenkes No. 28/2020, PMK 3/2023 tentang INA-CBG
 */

export type SeverityLevel = "I" | "II" | "III";

export interface CbgEntry {
  icdCode: string;
  cbgGroup: string;
  /** SEP-0 base tariff in IDR */
  tariffIdr: number;
  description: string;
  /** Explicit severity override (rare — most entries are SEP-0) */
  severity?: SeverityLevel;
  /** Default SEP level for this code when no secondaries (0–4) */
  defaultSep?: number;
}

/**
 * CC/MCC classification for each ICD-10 code.
 * Used by inferSeverity() to determine SEP elevation from comorbidities.
 *
 * "major"  → code triggers SEP +2 when present as secondary (MCC-level)
 * "mild"   → code triggers SEP +1 when present as secondary (CC-level)
 * omitted  → no severity elevation from this code
 */
export const CC_LIST: Record<string, "mild" | "major"> = {
  // Major CC (MCC-level, +2 SEP points)
  "B20": "major",     // HIV
  "I21": "major",     // AMI
  "I50": "major",     // Heart failure
  "I63": "major",     // Cerebral infarction
  "R57": "major",     // Septic shock
  "A41": "major",     // Sepsis
  "N17": "major",     // Acute kidney failure
  "J96": "major",     // Respiratory failure
  "G40": "major",     // Epilepsy (status)
  "E10": "major",     // T1DM (critical)
  "E11": "major",     // T2DM w/ complications
  "N18": "major",     // CKD
  "J44": "major",     // COPD (severe)
  "C34": "major",     // Lung cancer
  "C16": "major",     // Stomach cancer
  "C22": "major",     // Liver cancer
  "F06": "major",     // Delirium
  "T20": "major",     // Burns (severe)

  // Mild CC (CC-level, +1 SEP point)
  "I10": "mild",      // Hypertension
  "E78": "mild",      // Hyperlipidemia
  "E05": "mild",      // Hyperthyroidism
  "E03": "mild",      // Hypothyroidism
  "M81": "mild",      // Osteoporosis
  "D64": "mild",      // Anemia
  "E86": "mild",      // Dehydration
  "N39": "mild",      // UTI
  "N20": "mild",      // Renal colic
  "J45": "mild",      // Asthma
  "J15": "mild",      // Pneumonia
  "F32": "mild",      // Depression
  "F31": "mild",      // Bipolar
  "G43": "mild",      // Migraine
  "K29": "mild",      // Gastritis
  "K21": "mild",      // GERD
  "K80": "mild",      // Cholelithiasis
  "O14": "mild",      // Pre-eclampsia
  "O15": "major",     // Eclampsia
  "S72": "mild",      // Femur fracture
  "S06": "mild",      // Concussion
  "D50": "mild",      // Iron deficiency anemia
  "D25": "mild",      // Leiomyoma
  "N40": "mild",      // BPH
  "H25": "mild",      // Cataract
  "M17": "mild",      // Osteoarthritis
  "I48": "mild",      // A-fib
  "I70": "mild",      // Atherosclerosis
  "C50": "mild",      // Breast cancer
  "C61": "mild",      // Prostate cancer
  "C53": "mild",      // Cervical cancer
  "C70": "mild",      // Thyroid cancer
  "A01": "mild",      // Typhoid
  "A91": "mild",      // Dengue
  "A15": "mild",      // TB
  "B50": "mild",      // Malaria
  "L03": "mild",      // Cellulitis
  "T14": "mild",      // Open wound
  "T63": "mild",      // Snake bite
  "H66": "mild",      // Otitis media
  "J20": "mild",      // Bronchitis
  "K35": "mild",      // Appendicitis
  "P36": "mild",      // Neonatal sepsis
  "I05": "mild",      // Rheumatic heart
};

/**
 * SEP (Severity of Illness Points) tariff multipliers per PMK 3/2023.
 * Five-point scale matching Indonesian BPJS severity bands.
 */
const SEP_MULTIPLIER: Record<number, number> = {
  0: 1.00,  // Level I, w/o CC
  1: 1.15,  // Level I, minor CC
  2: 1.35,  // Level II, w CC
  3: 1.60,  // Level III, w CC (severe)
  4: 1.90,  // Level III, w MCC
};

/**
 * ICD-9-CM procedure codes commonly performed for each diagnosis.
 * Expanded from 21 to ~40 entries to cover all surgical ICD codes.
 */
export const ICD9_PROCEDURES: { code: string; name: string; icdCodes: string[] }[] = [
  { code: "47.01", name: "Laparoscopic appendectomy", icdCodes: ["K35"] },
  { code: "51.23", name: "Laparoscopic cholecystectomy", icdCodes: ["K80"] },
  { code: "85.43", name: "Mastectomy", icdCodes: ["C50"] },
  { code: "60.29", name: "TURP (Transurethral prostatectomy)", icdCodes: ["N40"] },
  { code: "68.29", name: "Myomectomy", icdCodes: ["D25"] },
  { code: "81.54", name: "Total knee arthroplasty", icdCodes: ["M17"] },
  { code: "79.35", name: "Open reduction femur fx w internal fixation", icdCodes: ["S72"] },
  { code: "01.24", name: "Craniotomy", icdCodes: ["S06"] },
  { code: "86.22", name: "Debridement of wound", icdCodes: ["T20", "T14", "E11"] },
  { code: "86.28", name: "Skin graft", icdCodes: ["T20"] },
  { code: "99.10", name: "Thrombolytic therapy", icdCodes: ["I63", "I21"] },
  { code: "36.07", name: "Drug-eluting coronary stent insertion", icdCodes: ["I21"] },
  { code: "39.95", name: "Hemodialysis", icdCodes: ["N18", "N17"] },
  { code: "73.59", name: "Vaginal delivery", icdCodes: ["O80"] },
  { code: "74.1", name: "Cesarean section", icdCodes: ["O80", "O14", "O15"] },
  { code: "84.17", name: "Below knee amputation", icdCodes: ["E11", "T63"] },
  { code: "96.04", name: "Mechanical ventilation >96h", icdCodes: ["J44", "J15", "J18", "R57"] },
  { code: "20.01", name: "Myringotomy with tube insertion", icdCodes: ["H66"] },
  { code: "88.56", name: "Coronary angiography", icdCodes: ["I21", "I05", "I25"] },
  { code: "45.23", name: "Colonoscopy", icdCodes: ["C18", "K80"] },
  { code: "39.25", name: "AV fistula creation for dialysis", icdCodes: ["N18"] },
  { code: "86.59", name: "Wound closure", icdCodes: ["T14"] },
  { code: "84.10", name: "Partial amputation lower limb", icdCodes: ["E11", "T63"] },
  { code: "54.91", name: "Laparoscopic abdominoperineal resection", icdCodes: ["C18"] },
  { code: "17.11", name: "Closed [percutaneous] [needle] biopsy of breast", icdCodes: ["C50"] },
  { code: "34.04", name: "Thoracentesis", icdCodes: ["J90"] },
  { code: "87.44", name: "Computerized tomography of head", icdCodes: ["S06", "G40", "I63"] },
  { code: "88.38", name: " coronary angiography", icdCodes: ["I21", "I25"] },
  { code: "51.10", name: "Endoscopic retrograde cholangiopancreatography", icdCodes: ["K80", "K85"] },
  { code: "38.93", name: "Venous catheterization", icdCodes: ["A09", "A27", "A91", "R57", "E86"] },
  { code: "99.25", name: "Injection or infusion of cancer chemotherapeutic substance", icdCodes: ["C34", "C16", "C22", "C18", "C53", "C61", "C67", "C85", "C91"] },
  { code: "99.29", name: "Injection or infusion of other therapeutic or prophylactic substance", icdCodes: ["A01", "A15", "B50", "A91", "A27", "A82"] },
  { code: "96.71", name: "Continuous invasive mechanical ventilation <96 hours", icdCodes: ["J15", "J18", "J44", "R57"] },
  { code: "86.22", name: "Incision and drainage of skin and subcutaneous tissue", icdCodes: ["L03", "T14", "H66"] },
  { code: "59.81", name: "Insertion of indwelling urinary catheter", icdCodes: ["N39", "N10", "N20", "N40", "N17"] },
  { code: "96.07", name: "Insertion of endotracheal tube", icdCodes: ["J45", "J15", "J18", "R57", "A91"] },
  { code: "39.95", name: "Hemodialysis", icdCodes: ["N18", "N17", "E10", "E11"] },
  { code: "87.41", name: "Magnetic resonance imaging of brain", icdCodes: ["G40", "G43", "S06"] },
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
 * Infer SEP (Severity of Illness Points) from diagnosis list.
 *
 * Algorithm (matches BPJS clinical logic):
 *   1. Start with primary diagnosis base SEP (defaultSep if defined, else 0)
 *   2. For each secondary diagnosis:
 *      - "major" CC → max(currentSep, baseSep + 2)
 *      - "mild" CC  → max(currentSep, baseSep + 1)
 *   3. Cap at SEP 4
 *
 * Examples:
 *   [I21] → SEP 0 (base), no secondaries → tariff ×1.00
 *   [I21, I10] → SEP max(0, 0+1)=1 (hypertension is mild CC) → tariff ×1.15
 *   [I21, I50] → SEP max(0, 0+2)=2 (heart failure is major CC) → tariff ×1.35
 *   [R57, B20] → SEP max(0, 0+2)=2 but R57 is already major → tariff ×1.35
 *   [A41] → SEP 3 (sepsis base is high) → tariff ×1.60
 */
export function inferSeverity(diagnosisCodes: string[]): { sep: number; level: SeverityLevel } {
  if (diagnosisCodes.length === 0) return { sep: 0, level: "I" };
  const [primary, ...secondaries] = diagnosisCodes;
  const base = PRIMARY_SEP.get(primary) ?? 0;
  let sep = base;
  const seen = new Set<string>();
  for (const code of secondaries) {
    if (seen.has(code)) continue;
    seen.add(code);
    const cc = CC_LIST[code];
    if (cc === "major") sep = Math.max(sep, base + 2);
    else if (cc === "mild") sep = Math.max(sep, base + 1);
  }
  const level: SeverityLevel = sep >= 3 ? "III" : sep >= 2 ? "II" : "I";
  return { sep: Math.min(sep, 4), level };
}

/**
 * Base SEP for primary diagnosis codes that inherently carry severity.
 * Codes not listed default to SEP 0 (straightforward, uncomplicated case).
 */
const PRIMARY_SEP = new Map<string, number>([
  // Life-threatening conditions
  ["R57", 3],   // Septic shock
  ["A41", 3],   // Sepsis
  ["I21", 2],   // AMI
  ["I63", 2],   // Cerebral infarction
  ["N17", 2],   // Acute kidney failure
  ["J96", 2],   // Respiratory failure
  ["T20", 2],   // Severe burns
  ["A82", 2],   // Rabies
  ["T63", 2],   // Snake bite
  ["B20", 1],   // HIV (chronic but serious)
  ["C34", 1],   // Lung cancer
  ["C16", 1],   // Stomach cancer
  ["C22", 1],   // Liver cancer
  ["C18", 1],   // Colon cancer
  ["C50", 1],   // Breast cancer
  ["C61", 1],   // Prostate cancer
  ["C53", 1],   // Cervical cancer
  ["C67", 1],   // Bladder cancer
  ["C85", 1],   // Lymphoma
  ["C91", 1],   // Leukemia
  ["F06", 2],   // Delirium
  ["O15", 2],   // Eclampsia
  ["P36", 2],   // Neonatal sepsis
  ["P07", 1],   // Preterm newborn
]);

export const INA_CBG: CbgEntry[] = [
  // ═══════════════════════════════════════════════════════════════
  // A — Infectious & Parasitic Diseases
  // ═══════════════════════════════════════════════════════════════
  { icdCode: "A01", cbgGroup: "I01A", tariffIdr: 4_200_000, description: "Typhoid fever, w/o CC", defaultSep: 0 },
  { icdCode: "A09", cbgGroup: "I06A", tariffIdr: 3_100_000, description: "Infectious gastroenteritis, w/o CC", defaultSep: 0 },
  { icdCode: "A15", cbgGroup: "I03A", tariffIdr: 8_500_000, description: "Respiratory tuberculosis, w/o CC", defaultSep: 0 },
  { icdCode: "A27", cbgGroup: "I04A", tariffIdr: 6_800_000, description: "Leptospirosis, w/o CC", defaultSep: 0 },
  { icdCode: "A30", cbgGroup: "I05A", tariffIdr: 5_500_000, description: "Leprosy, w/o CC", defaultSep: 0 },
  { icdCode: "A37", cbgGroup: "I07A", tariffIdr: 3_800_000, description: "Pertussis, w/o CC", defaultSep: 0 },
  { icdCode: "A39", cbgGroup: "I08A", tariffIdr: 9_500_000, description: "Meningococcal infection, w/o CC", defaultSep: 1 },
  { icdCode: "A40", cbgGroup: "I09A", tariffIdr: 8_000_000, description: "Streptococcal sepsis, w/o CC", defaultSep: 2 },
  { icdCode: "A41", cbgGroup: "I10C", tariffIdr: 12_000_000, description: "Sepsis, w MCC", severity: "III" },
  { icdCode: "A49", cbgGroup: "I11A", tariffIdr: 8_500_000, description: "Bacterial sepsis unspecified", defaultSep: 2 },
  { icdCode: "A82", cbgGroup: "I15A", tariffIdr: 15_000_000, description: "Rabies, w/o CC", defaultSep: 2 },
  { icdCode: "A91", cbgGroup: "I12A", tariffIdr: 7_200_000, description: "Dengue hemorrhagic fever", defaultSep: 1 },
  { icdCode: "U07", cbgGroup: "I13A", tariffIdr: 8_000_000, description: "COVID-19, w/o CC", defaultSep: 0 },
  { icdCode: "A95", cbgGroup: "I14A", tariffIdr: 3_500_000, description: "Chikungunya", defaultSep: 0 },

  // ═══════════════════════════════════════════════════════════════
  // B — Viral & Parasitic Diseases
  // ═══════════════════════════════════════════════════════════════
  { icdCode: "B18", cbgGroup: "I21A", tariffIdr: 6_500_000, description: "Chronic hepatitis B", defaultSep: 0 },
  { icdCode: "B19", cbgGroup: "I22A", tariffIdr: 5_000_000, description: "Unspecified viral hepatitis", defaultSep: 0 },
  { icdCode: "B20", cbgGroup: "I20B", tariffIdr: 9_500_000, description: "HIV disease w opportunistic infections", severity: "II" },
  { icdCode: "B50", cbgGroup: "I08A", tariffIdr: 5_500_000, description: "Malaria, severe", defaultSep: 1 },
  { icdCode: "B86", cbgGroup: "I22A", tariffIdr: 2_800_000, description: "Scabies, w/o CC", defaultSep: 0 },

  // ═══════════════════════════════════════════════════════════════
  // C — Neoplasms
  // ═══════════════════════════════════════════════════════════════
  { icdCode: "C16", cbgGroup: "M03A", tariffIdr: 16_000_000, description: "Malignant neoplasm of stomach", defaultSep: 1 },
  { icdCode: "C18", cbgGroup: "M04A", tariffIdr: 15_000_000, description: "Malignant neoplasm of colon", defaultSep: 1 },
  { icdCode: "C22", cbgGroup: "M05A", tariffIdr: 14_000_000, description: "Malignant neoplasm of liver", defaultSep: 1 },
  { icdCode: "C34", cbgGroup: "M06A", tariffIdr: 17_000_000, description: "Malignant neoplasm of lung", defaultSep: 1 },
  { icdCode: "C50", cbgGroup: "M01A", tariffIdr: 14_000_000, description: "Malignant neoplasm of breast, w/o CC", defaultSep: 1 },
  { icdCode: "C53", cbgGroup: "M07A", tariffIdr: 12_000_000, description: "Malignant neoplasm of cervix", defaultSep: 1 },
  { icdCode: "C61", cbgGroup: "M02A", tariffIdr: 10_500_000, description: "Malignant neoplasm of prostate, w/o CC", defaultSep: 1 },
  { icdCode: "C67", cbgGroup: "M08A", tariffIdr: 11_000_000, description: "Malignant neoplasm of bladder", defaultSep: 1 },
  { icdCode: "C70", cbgGroup: "M09A", tariffIdr: 9_000_000, description: "Malignant neoplasm of thyroid", defaultSep: 1 },
  { icdCode: "C85", cbgGroup: "M10A", tariffIdr: 13_000_000, description: "Non-Hodgkin lymphoma", defaultSep: 1 },
  { icdCode: "C91", cbgGroup: "M11A", tariffIdr: 18_000_000, description: "Lymphoid leukemia", defaultSep: 1 },

  // ═══════════════════════════════════════════════════════════════
  // D — Blood & Immune Disorders
  // ═══════════════════════════════════════════════════════════════
  { icdCode: "D25", cbgGroup: "H01A", tariffIdr: 8_500_000, description: "Leiomyoma of uterus", defaultSep: 0 },
  { icdCode: "D50", cbgGroup: "H02A", tariffIdr: 3_500_000, description: "Iron deficiency anemia", defaultSep: 0 },
  { icdCode: "D55", cbgGroup: "H04A", tariffIdr: 4_000_000, description: "Hemolytic anemia G6PD", defaultSep: 0 },
  { icdCode: "D57", cbgGroup: "H05A", tariffIdr: 5_500_000, description: "Sickle cell disease", defaultSep: 1 },
  { icdCode: "D64", cbgGroup: "H03A", tariffIdr: 4_200_000, description: "Anemia unspecified, w/o CC", defaultSep: 0 },
  { icdCode: "D69", cbgGroup: "H06A", tariffIdr: 4_500_000, description: "Immune thrombocytopenic purpura", defaultSep: 0 },

  // ═══════════════════════════════════════════════════════════════
  // E — Endocrine, Nutritional & Metabolic
  // ═══════════════════════════════════════════════════════════════
  { icdCode: "E03", cbgGroup: "E07A", tariffIdr: 4_500_000, description: "Hypothyroidism, w/o CC", defaultSep: 0 },
  { icdCode: "E04", cbgGroup: "E08A", tariffIdr: 5_000_000, description: "Toxic nodular goiter", defaultSep: 0 },
  { icdCode: "E05", cbgGroup: "E01A", tariffIdr: 5_800_000, description: "Hyperthyroidism, w/o CC", defaultSep: 0 },
  { icdCode: "E10", cbgGroup: "E02A", tariffIdr: 5_200_000, description: "Type 1 diabetes mellitus", defaultSep: 1 },
  { icdCode: "E11", cbgGroup: "E03A", tariffIdr: 4_800_000, description: "Type 2 diabetes mellitus, w/o CC", defaultSep: 0 },
  { icdCode: "E20", cbgGroup: "E09A", tariffIdr: 3_500_000, description: "Hypoparathyroidism", defaultSep: 0 },
  { icdCode: "E21", cbgGroup: "E10A", tariffIdr: 4_000_000, description: "Hyperparathyroidism", defaultSep: 0 },
  { icdCode: "E24", cbgGroup: "E11A", tariffIdr: 5_500_000, description: "Cushing's syndrome", defaultSep: 0 },
  { icdCode: "E27", cbgGroup: "E12A", tariffIdr: 4_500_000, description: "Adrenal insufficiency", defaultSep: 0 },
  { icdCode: "E66", cbgGroup: "E05A", tariffIdr: 3_800_000, description: "Obesity, w/o CC", defaultSep: 0 },
  { icdCode: "E78", cbgGroup: "E04A", tariffIdr: 3_200_000, description: "Hyperlipidemia, w/o CC", defaultSep: 0 },
  { icdCode: "E86", cbgGroup: "E06A", tariffIdr: 2_800_000, description: "Volume depletion / dehydration", defaultSep: 0 },

  // ═══════════════════════════════════════════════════════════════
  // F — Mental & Behavioral Disorders
  // ═══════════════════════════════════════════════════════════════
  { icdCode: "F00", cbgGroup: "F03A", tariffIdr: 6_000_000, description: "Alzheimer's disease", defaultSep: 0 },
  { icdCode: "F06", cbgGroup: "F04A", tariffIdr: 7_000_000, description: "Delirium", defaultSep: 2 },
  { icdCode: "F20", cbgGroup: "F05A", tariffIdr: 5_500_000, description: "Schizophrenia", defaultSep: 0 },
  { icdCode: "F31", cbgGroup: "F06A", tariffIdr: 5_000_000, description: "Bipolar disorder", defaultSep: 0 },
  { icdCode: "F32", cbgGroup: "F01A", tariffIdr: 5_500_000, description: "Major depressive disorder, single episode", defaultSep: 0 },
  { icdCode: "F41", cbgGroup: "F02A", tariffIdr: 4_200_000, description: "Anxiety disorder, w/o CC", defaultSep: 0 },
  { icdCode: "F42", cbgGroup: "F07A", tariffIdr: 4_500_000, description: "Obsessive-compulsive disorder", defaultSep: 0 },
  { icdCode: "F43", cbgGroup: "F08A", tariffIdr: 5_000_000, description: "Post-traumatic stress disorder", defaultSep: 0 },
  { icdCode: "F90", cbgGroup: "F09A", tariffIdr: 3_500_000, description: "ADHD", defaultSep: 0 },

  // ═══════════════════════════════════════════════════════════════
  // G — Nervous System
  // ═══════════════════════════════════════════════════════════════
  { icdCode: "G20", cbgGroup: "G01A", tariffIdr: 6_500_000, description: "Parkinson disease, w/o CC", defaultSep: 0 },
  { icdCode: "G40", cbgGroup: "G02A", tariffIdr: 5_800_000, description: "Epilepsy, w/o CC", defaultSep: 0 },
  { icdCode: "G43", cbgGroup: "G03A", tariffIdr: 3_500_000, description: "Migraine", defaultSep: 0 },
  { icdCode: "G58", cbgGroup: "G04A", tariffIdr: 4_000_000, description: "Mononeuritis multiplex", defaultSep: 0 },
  { icdCode: "G61", cbgGroup: "G05A", tariffIdr: 3_800_000, description: "Bell's palsy", defaultSep: 0 },
  { icdCode: "I63", cbgGroup: "B01A", tariffIdr: 14_500_000, description: "Cerebral infarction, w/o CC", defaultSep: 2 },

  // ═══════════════════════════════════════════════════════════════
  // H — Eye & Adnexa / Ear
  // ═══════════════════════════════════════════════════════════════
  { icdCode: "H10", cbgGroup: "H04A", tariffIdr: 2_500_000, description: "Acute conjunctivitis", defaultSep: 0 },
  { icdCode: "H25", cbgGroup: "H05A", tariffIdr: 8_000_000, description: "Age-related cataract", defaultSep: 0 },
  { icdCode: "H66", cbgGroup: "H03A", tariffIdr: 3_200_000, description: "Otitis media, w/o CC", defaultSep: 0 },
  { icdCode: "H81", cbgGroup: "H06A", tariffIdr: 4_500_000, description: "Meniere's disease", defaultSep: 0 },

  // ═══════════════════════════════════════════════════════════════
  // I — Circulatory System
  // ═══════════════════════════════════════════════════════════════
  { icdCode: "I05", cbgGroup: "B06B", tariffIdr: 22_000_000, description: "Rheumatic heart disease, w CC", severity: "II" },
  { icdCode: "I09", cbgGroup: "B08A", tariffIdr: 5_500_000, description: "Rheumatic valvulitis", defaultSep: 0 },
  { icdCode: "I10", cbgGroup: "B02A", tariffIdr: 3_500_000, description: "Essential hypertension, w/o CC", defaultSep: 0 },
  { icdCode: "I21", cbgGroup: "B03A", tariffIdr: 18_000_000, description: "Acute myocardial infarction", defaultSep: 2 },
  { icdCode: "I25", cbgGroup: "B09A", tariffIdr: 6_000_000, description: "Chronic ischemic heart disease", defaultSep: 0 },
  { icdCode: "I48", cbgGroup: "B04A", tariffIdr: 8_500_000, description: "Atrial fibrillation, w/o CC", defaultSep: 0 },
  { icdCode: "I50", cbgGroup: "B05A", tariffIdr: 10_500_000, description: "Heart failure, w/o CC", defaultSep: 0 },
  { icdCode: "I60", cbgGroup: "B10A", tariffIdr: 20_000_000, description: "Subarachnoid hemorrhage", defaultSep: 2 },
  { icdCode: "I70", cbgGroup: "B11A", tariffIdr: 5_000_000, description: "Atherosclerosis", defaultSep: 0 },
  { icdCode: "I83", cbgGroup: "B07A", tariffIdr: 3_200_000, description: "Varicose veins, w/o CC", defaultSep: 0 },

  // ═══════════════════════════════════════════════════════════════
  // J — Respiratory System
  // ═══════════════════════════════════════════════════════════════
  { icdCode: "J12", cbgGroup: "C01A", tariffIdr: 6_200_000, description: "Viral pneumonia, w/o CC", defaultSep: 0 },
  { icdCode: "J14", cbgGroup: "C09A", tariffIdr: 7_000_000, description: "Haemophilus influenzae pneumonia", defaultSep: 0 },
  { icdCode: "J15", cbgGroup: "C02A", tariffIdr: 7_500_000, description: "Bacterial pneumonia, w/o CC", defaultSep: 0 },
  { icdCode: "J18", cbgGroup: "C03A", tariffIdr: 5_800_000, description: "Pneumonia unspecified", defaultSep: 0 },
  { icdCode: "J20", cbgGroup: "C04A", tariffIdr: 2_500_000, description: "Acute bronchitis, w/o CC", defaultSep: 0 },
  { icdCode: "J32", cbgGroup: "C05A", tariffIdr: 3_800_000, description: "Chronic sinusitis, w/o CC", defaultSep: 0 },
  { icdCode: "J44", cbgGroup: "C06A", tariffIdr: 6_500_000, description: "COPD, w/o CC", defaultSep: 0 },
  { icdCode: "J45", cbgGroup: "C07A", tariffIdr: 3_500_000, description: "Asthma, w/o CC", defaultSep: 0 },
  { icdCode: "J47", cbgGroup: "C09B", tariffIdr: 7_000_000, description: "Bronchiectasis", defaultSep: 0 },
  { icdCode: "J84", cbgGroup: "C08A", tariffIdr: 8_500_000, description: "Interstitial lung disease, w/o CC", defaultSep: 0 },
  { icdCode: "J90", cbgGroup: "C10A", tariffIdr: 5_500_000, description: "Pleural effusion", defaultSep: 0 },
  { icdCode: "R23", cbgGroup: "C11A", tariffIdr: 4_000_000, description: "Pulmonary nodule", defaultSep: 0 },

  // ═══════════════════════════════════════════════════════════════
  // K — Digestive System
  // ═══════════════════════════════════════════════════════════════
  { icdCode: "K21", cbgGroup: "D06A", tariffIdr: 4_500_000, description: "GERD, w/o CC", defaultSep: 0 },
  { icdCode: "K25", cbgGroup: "D01A", tariffIdr: 5_500_000, description: "Gastric ulcer, w/o CC", defaultSep: 0 },
  { icdCode: "K26", cbgGroup: "D07A", tariffIdr: 5_000_000, description: "Duodenal ulcer, w/o CC", defaultSep: 0 },
  { icdCode: "K29", cbgGroup: "D02A", tariffIdr: 3_200_000, description: "Gastritis, w/o CC", defaultSep: 0 },
  { icdCode: "K35", cbgGroup: "D03A", tariffIdr: 10_500_000, description: "Acute appendicitis, w/o CC", defaultSep: 0 },
  { icdCode: "K56", cbgGroup: "D04A", tariffIdr: 8_500_000, description: "Intestinal obstruction, w/o CC", defaultSep: 0 },
  { icdCode: "K64", cbgGroup: "D08A", tariffIdr: 4_000_000, description: "Hemorrhoids", defaultSep: 0 },
  { icdCode: "K74", cbgGroup: "D09A", tariffIdr: 9_000_000, description: "Hepatic fibrosis / cirrhosis", defaultSep: 1 },
  { icdCode: "K80", cbgGroup: "D05B", tariffIdr: 12_000_000, description: "Cholelithiasis, w CC", severity: "II" },
  { icdCode: "K85", cbgGroup: "D10A", tariffIdr: 11_000_000, description: "Acute pancreatitis", defaultSep: 1 },

  // ═══════════════════════════════════════════════════════════════
  // L — Skin & Subcutaneous Tissue
  // ═══════════════════════════════════════════════════════════════
  { icdCode: "L03", cbgGroup: "K01A", tariffIdr: 3_500_000, description: "Cellulitis, w/o CC", defaultSep: 0 },
  { icdCode: "L40", cbgGroup: "K02A", tariffIdr: 2_800_000, description: "Psoriasis, w/o CC", defaultSep: 0 },

  // ═══════════════════════════════════════════════════════════════
  // M — Musculoskeletal & Connective Tissue
  // ═══════════════════════════════════════════════════════════════
  { icdCode: "M06", cbgGroup: "J01A", tariffIdr: 5_200_000, description: "Rheumatoid arthritis, w/o CC", defaultSep: 0 },
  { icdCode: "M17", cbgGroup: "J02A", tariffIdr: 15_000_000, description: "Osteoarthritis of knee", defaultSep: 0 },
  { icdCode: "M54", cbgGroup: "J03A", tariffIdr: 4_500_000, description: "Low back pain, w/o CC", defaultSep: 0 },
  { icdCode: "M75", cbgGroup: "J05A", tariffIdr: 5_000_000, description: "Rotator cuff syndrome", defaultSep: 0 },
  { icdCode: "M81", cbgGroup: "J04A", tariffIdr: 3_800_000, description: "Osteoporosis, w/o CC", defaultSep: 0 },
  { icdCode: "G56", cbgGroup: "J06A", tariffIdr: 4_000_000, description: "Carpal tunnel syndrome", defaultSep: 0 },

  // ═══════════════════════════════════════════════════════════════
  // N — Genitourinary System
  // ═══════════════════════════════════════════════════════════════
  { icdCode: "N10", cbgGroup: "L07A", tariffIdr: 5_000_000, description: "Acute pyelonephritis", defaultSep: 0 },
  { icdCode: "N13", cbgGroup: "L01A", tariffIdr: 4_500_000, description: "Obstructive uropathy, w/o CC", defaultSep: 0 },
  { icdCode: "N17", cbgGroup: "L08A", tariffIdr: 12_000_000, description: "Acute kidney failure", defaultSep: 2 },
  { icdCode: "N18", cbgGroup: "L02A", tariffIdr: 6_500_000, description: "Chronic kidney disease, w/o CC", defaultSep: 0 },
  { icdCode: "N20", cbgGroup: "L03A", tariffIdr: 4_800_000, description: "Renal colic / kidney stone", defaultSep: 0 },
  { icdCode: "N39", cbgGroup: "L04A", tariffIdr: 3_200_000, description: "Urinary tract infection, w/o CC", defaultSep: 0 },
  { icdCode: "N40", cbgGroup: "L05A", tariffIdr: 6_500_000, description: "BPH, w/o CC", defaultSep: 0 },
  { icdCode: "N41", cbgGroup: "L09A", tariffIdr: 4_000_000, description: "Prostatitis", defaultSep: 0 },
  { icdCode: "N76", cbgGroup: "L06A", tariffIdr: 2_500_000, description: "Vulvovaginitis, w/o CC", defaultSep: 0 },

  // ═══════════════════════════════════════════════════════════════
  // O — Pregnancy, Childbirth & Puerperium
  // ═══════════════════════════════════════════════════════════════
  { icdCode: "O14", cbgGroup: "O03A", tariffIdr: 8_000_000, description: "Pre-eclampsia", defaultSep: 0 },
  { icdCode: "O15", cbgGroup: "O04A", tariffIdr: 12_000_000, description: "Eclampsia", defaultSep: 2 },
  { icdCode: "O20", cbgGroup: "O01A", tariffIdr: 4_500_000, description: "Threatened abortion", defaultSep: 0 },
  { icdCode: "O80", cbgGroup: "O02A", tariffIdr: 6_800_000, description: "Single spontaneous delivery", defaultSep: 0 },

  // ═══════════════════════════════════════════════════════════════
  // P — Perinatal Period
  // ═══════════════════════════════════════════════════════════════
  { icdCode: "P07", cbgGroup: "P01A", tariffIdr: 12_000_000, description: "Preterm newborn, w/o CC", defaultSep: 0 },
  { icdCode: "P10", cbgGroup: "P05A", tariffIdr: 10_000_000, description: "Intracranial birth injury", defaultSep: 1 },
  { icdCode: "P36", cbgGroup: "P02A", tariffIdr: 10_500_000, description: "Neonatal sepsis", defaultSep: 2 },
  { icdCode: "P58", cbgGroup: "P06A", tariffIdr: 5_000_000, description: "Neonatal jaundice due to haemolysis", defaultSep: 0 },
  { icdCode: "P59", cbgGroup: "P03A", tariffIdr: 4_200_000, description: "Neonatal jaundice", defaultSep: 0 },

  // ═══════════════════════════════════════════════════════════════
  // Q — Congenital Malformations
  // ═══════════════════════════════════════════════════════════════
  { icdCode: "Q21", cbgGroup: "P04A", tariffIdr: 25_000_000, description: "Congenital heart disease", defaultSep: 0 },
  { icdCode: "Q36", cbgGroup: "P07A", tariffIdr: 12_000_000, description: "Cleft lip", defaultSep: 0 },
  { icdCode: "Q37", cbgGroup: "P08A", tariffIdr: 13_000_000, description: "Cleft palate", defaultSep: 0 },

  // ═══════════════════════════════════════════════════════════════
  // R — Symptoms & Abnormal Findings
  // ═══════════════════════════════════════════════════════════════
  { icdCode: "R07", cbgGroup: "R01A", tariffIdr: 4_000_000, description: "Chest pain", defaultSep: 0 },
  { icdCode: "R50", cbgGroup: "R02A", tariffIdr: 3_000_000, description: "Fever unspecified", defaultSep: 0 },
  { icdCode: "R51", cbgGroup: "R03A", tariffIdr: 2_500_000, description: "Headache", defaultSep: 0 },
  { icdCode: "R55", cbgGroup: "R04A", tariffIdr: 3_500_000, description: "Syncope and collapse", defaultSep: 0 },
  { icdCode: "R70", cbgGroup: "R05A", tariffIdr: 2_000_000, description: "Elevated ESR", defaultSep: 0 },
  { icdCode: "R57", cbgGroup: "I11A", tariffIdr: 22_000_000, description: "Septic shock", defaultSep: 3 },

  // ═══════════════════════════════════════════════════════════════
  // S — Injury, Poisoning & Certain Other Consequences
  // ═══════════════════════════════════════════════════════════════
  { icdCode: "S06", cbgGroup: "T01A", tariffIdr: 18_000_000, description: "Intracranial injury, w/o CC", defaultSep: 0 },
  { icdCode: "S22", cbgGroup: "T06A", tariffIdr: 8_000_000, description: "Fracture of rib(s)", defaultSep: 0 },
  { icdCode: "S62", cbgGroup: "T07A", tariffIdr: 6_000_000, description: "Fracture of wrist/hand", defaultSep: 0 },
  { icdCode: "S72", cbgGroup: "T02A", tariffIdr: 16_000_000, description: "Fracture of femur", defaultSep: 0 },

  // ═══════════════════════════════════════════════════════════════
  // T — External Causes
  // ═══════════════════════════════════════════════════════════════
  { icdCode: "T14", cbgGroup: "T03A", tariffIdr: 3_800_000, description: "Open wound, w/o CC", defaultSep: 0 },
  { icdCode: "T20", cbgGroup: "T04A", tariffIdr: 12_000_000, description: "Burns, 2nd degree, w/o CC", defaultSep: 0 },
  { icdCode: "T63", cbgGroup: "T05A", tariffIdr: 8_500_000, description: "Snake bite envenomation", defaultSep: 0 },
  { icdCode: "T39", cbgGroup: "T08A", tariffIdr: 4_000_000, description: "Poisoning by analgesic", defaultSep: 0 },
  { icdCode: "T81", cbgGroup: "T09A", tariffIdr: 7_000_000, description: "Complication following procedure", defaultSep: 0 },

  // ═══════════════════════════════════════════════════════════════
  // Additional entries for existing codes not yet covered
  // ═══════════════════════════════════════════════════════════════
  { icdCode: "E11.5", cbgGroup: "E03B", tariffIdr: 7_500_000, description: "Type 2 diabetes w diabetic foot", severity: "II" },
];

/**
 * Look up INA-CBG tariff for an ICD code at a given severity level.
 * Returns the SEP-adjusted tariff. Returns undefined if code not found.
 */
export function lookupCbgTariff(icdCode: string, severity: SeverityLevel = "I"): CbgEntry | undefined {
  const base = INA_CBG.find(e => e.icdCode === icdCode);
  if (!base) return undefined;
  const baseSeverity = base.severity ?? "I";
  if (severity === baseSeverity) return base;
  if (severity !== "I") {
    const baseSep = baseSeverity === "I" ? 0 : baseSeverity === "II" ? 2 : 3;
    const targetSep = severity === "II" ? 2 : 3;
    const multiplier = SEP_MULTIPLIER[targetSep] / SEP_MULTIPLIER[baseSep];
    return {
      ...base,
      tariffIdr: Math.round(base.tariffIdr * multiplier),
      severity,
      description: `${base.description.replace(/, (w\/o CC|w CC|w MCC)$/i, "")}, ${severity === "II" ? "w CC" : "w MCC"}`,
    };
  }
  return base;
}

/**
 * Get the full tariff for an ICD code given a list of diagnosis codes.
 * Infers SEP from primary + secondaries, then returns the adjusted entry.
 * This is the main entry point used by the billing handler.
 */
export function getFullCbgTariff(icdCode: string, allDiagnoses: string[]): CbgEntry | undefined {
  const { sep, level } = inferSeverity(allDiagnoses);
  return lookupCbgTariff(icdCode, level);
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
