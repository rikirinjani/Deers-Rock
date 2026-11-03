/**
 * MS-DRG grouper (simplified) for the US adapter. Epic X M10.4.
 *
 * Maps a principal ICD-10 category (3 characters; "J18.9" -> "J18") plus the
 * secondary diagnoses and a procedure flag to an MS-DRG, its relative weight
 * and a Medicare payment (weight x base rate). Public CMS data only; no CPT.
 *
 * SIMPLIFICATIONS (this is a structural model, not the CMS grouper): family
 * level mapping by category instead of full ICD-10-CM code lists; CC/MCC sets
 * are short approximations with no CC-exclusion logic; no outlier, transfer,
 * DSH/IME or wage-index adjustments; surgical DRGs only for the few
 * diagnoses where the engine generates a matching procedure.
 *
 * CALIBRATION PENDING: DRG numbers and weights are approximate recollections
 * of the FY2024-25 tables and are UNVERIFIED. M10.5c replaces them with CMS
 * Table 5 values and the base rate with the IPPS final-rule figure.
 *
 * Deterministic: pure functions, no RNG.
 */

export type DrgSeverity = "MCC" | "CC" | "none";

export interface DrgAssignment {
  drg: string;
  description: string;
  weight: number;
  severity: DrgSeverity;
  surgical: boolean;
}

/**
 * How a family splits by severity:
 *  "3"  w MCC / w CC / w/o CC/MCC   (DRG n, n+1, n+2)
 *  "2m" w MCC / w/o MCC             (n, n+1)
 *  "2c" w CC or MCC / w/o CC/MCC    (n, n+1)
 *  "1"  no split                    (n)
 */
type Split = "3" | "2m" | "2c" | "1";

interface Family { base: number; split: Split; weights: number[]; label: string; codes: string[]; surgical: boolean }

const med = (base: number, split: Split, weights: number[], label: string, codes: string[]): Family =>
  ({ base, split, weights, label, codes, surgical: false });
const surg = (base: number, split: Split, weights: number[], label: string, codes: string[]): Family =>
  ({ base, split, weights, label, codes, surgical: true });

const FAMILIES: Family[] = [
  // Infectious
  med(871, "2m", [1.80, 1.00], "Septicemia or severe sepsis", ["A40", "A41", "R57"]),
  med(867, "3", [1.90, 1.10, 0.80], "Other infectious and parasitic diseases", ["A01", "A27", "A30", "A37", "A39", "A49", "A82", "A91", "A95", "B50"]),
  med(391, "2m", [1.20, 0.75], "Esophagitis, gastroenteritis and misc digestive disorders", ["A09", "K21", "K29", "R10"]),
  med(177, "3", [1.80, 1.20, 0.90], "Respiratory infections and inflammations", ["A15", "U07"]),
  med(974, "3", [2.30, 1.15, 0.85], "HIV w major related condition", ["B20"]),
  med(441, "3", [1.90, 1.00, 0.75], "Disorders of liver except malignancy, cirrhosis, alcoholic hepatitis", ["B18", "B19", "K74"]),
  med(606, "2m", [0.95, 0.60], "Minor skin disorders", ["B86", "L40"]),
  med(602, "2m", [1.25, 0.85], "Cellulitis", ["L03"]),
  // Neoplasms
  med(180, "3", [1.70, 1.10, 0.90], "Respiratory neoplasms", ["C34"]),
  med(374, "3", [1.80, 1.10, 0.80], "Digestive malignancy", ["C16", "C18", "C22"]),
  med(597, "3", [1.50, 1.00, 0.70], "Malignant breast disorders", ["C50"]),
  med(754, "3", [1.60, 1.00, 0.70], "Malignancy, female reproductive system", ["C53"]),
  med(722, "3", [1.60, 1.00, 0.70], "Malignancy, male reproductive system", ["C61"]),
  med(686, "3", [1.50, 1.00, 0.80], "Kidney and urinary tract neoplasms", ["C67"]),
  med(54, "2m", [1.50, 0.90], "Nervous system neoplasms", ["C70"]),
  med(840, "3", [2.00, 1.30, 0.90], "Lymphoma and non-acute leukemia", ["C85"]),
  med(834, "3", [4.20, 2.00, 1.40], "Acute leukemia", ["C91"]),
  // Blood
  med(811, "2c", [1.30, 0.80], "Red blood cell disorders", ["D50", "D55", "D57", "D64"]),
  med(813, "1", [1.00], "Coagulation disorders", ["D69"]),
  med(742, "2c", [1.30, 0.85], "Uterine and adnexa procedures for non-malignancy", ["D25"]),
  // Endocrine
  med(637, "3", [1.35, 0.85, 0.55], "Diabetes", ["E10", "E11"]),
  med(643, "3", [1.40, 0.95, 0.75], "Endocrine disorders", ["E03", "E04", "E05", "E20", "E21", "E24", "E27"]),
  med(640, "2m", [1.10, 0.75], "Misc disorders of nutrition, metabolism, fluids and electrolytes", ["E66", "E78", "E86"]),
  // Mental
  med(884, "1", [0.95], "Organic disturbances and intellectual disability", ["F00", "F06"]),
  med(885, "1", [1.25], "Psychoses", ["F20", "F31"]),
  med(881, "1", [0.75], "Depressive neuroses", ["F32"]),
  med(882, "1", [0.75], "Neuroses except depressive", ["F41", "F42", "F43"]),
  med(887, "1", [0.90], "Other mental disorder diagnoses", ["F90"]),
  // Nervous system
  med(56, "2m", [1.50, 0.80], "Degenerative nervous system disorders", ["G20"]),
  med(100, "2m", [1.40, 0.80], "Seizures", ["G40"]),
  med(102, "2m", [0.85, 0.70], "Headaches", ["G43", "R51"]),
  med(91, "3", [1.50, 0.90, 0.70], "Other disorders of nervous system", ["G56", "G58", "G61"]),
  med(64, "3", [1.85, 1.00, 0.70], "Intracranial hemorrhage or cerebral infarction", ["I60", "I63"]),
  // Eye / ear
  med(124, "2m", [1.30, 0.80], "Other disorders of the eye", ["H10", "H25"]),
  med(152, "2m", [0.90, 0.65], "Otitis media and URI", ["H66", "J06", "J32"]),
  med(149, "1", [0.70], "Dysequilibrium", ["H81"]),
  // Circulatory
  med(280, "3", [1.75, 0.95, 0.70], "Acute myocardial infarction, discharged alive", ["I21"]),
  med(291, "3", [1.30, 0.90, 0.65], "Heart failure and shock", ["I50", "I11"]),
  med(304, "2m", [1.00, 0.65], "Hypertension", ["I10"]),
  med(308, "3", [1.10, 0.75, 0.55], "Cardiac arrhythmia and conduction disorders", ["I48", "I49"]),
  med(311, "1", [0.65], "Angina pectoris / chronic ischemic heart disease", ["I25"]),
  med(314, "3", [1.90, 1.00, 0.70], "Other circulatory system diagnoses", ["I05", "I09", "I00", "I30", "I42"]),
  med(288, "3", [2.00, 1.20, 0.90], "Acute and subacute endocarditis", ["I33"]),
  med(175, "2m", [1.50, 0.90], "Pulmonary embolism", ["I26"]),
  med(299, "3", [1.30, 0.90, 0.65], "Peripheral vascular disorders", ["I70", "I73", "I77", "I80", "I82", "I83"]),
  med(682, "3", [1.45, 0.90, 0.60], "Renal failure", ["N17", "N18", "N19", "I12"]),
  // Respiratory
  med(193, "3", [1.30, 0.85, 0.65], "Simple pneumonia and pleurisy", ["J12", "J14", "J15", "J18"]),
  med(202, "2c", [0.95, 0.65], "Bronchitis and asthma", ["J20", "J45", "J47"]),
  med(190, "3", [1.15, 0.90, 0.70], "Chronic obstructive pulmonary disease", ["J44"]),
  med(205, "2m", [1.20, 0.80], "Other respiratory system diagnoses", ["J10", "J11"]),
  med(196, "3", [1.90, 1.20, 0.90], "Interstitial lung disease", ["J84"]),
  med(186, "3", [1.60, 1.00, 0.75], "Pleural effusion", ["J90", "J91"]),
  med(189, "1", [1.25], "Pulmonary edema and respiratory failure", ["J96"]),
  // Digestive
  med(393, "3", [1.60, 0.95, 0.70], "Other digestive system diagnoses", ["K35", "K64", "R23"]),
  med(380, "3", [1.70, 1.00, 0.75], "Complicated peptic ulcer", ["K25", "K26"]),
  med(388, "3", [1.50, 0.90, 0.60], "GI obstruction", ["K56"]),
  med(444, "3", [1.60, 1.05, 0.80], "Disorders of the biliary tract", ["K80"]),
  med(438, "3", [1.90, 1.00, 0.80], "Disorders of pancreas except malignancy", ["K85"]),
  // Musculoskeletal
  med(553, "2m", [1.30, 0.85], "Bone diseases and arthropathies", ["M06", "M17", "M75", "M81"]),
  med(551, "2m", [1.10, 0.80], "Medical back problems", ["M54"]),
  med(535, "2m", [1.10, 0.70], "Fractures of hip and pelvis", ["S72"]),
  med(183, "3", [1.50, 0.90, 0.70], "Major chest trauma", ["S22"]),
  med(562, "2m", [1.10, 0.70], "Fracture, sprain, strain and dislocation except femur, hip, pelvis", ["S62"]),
  med(88, "3", [1.30, 0.85, 0.60], "Concussion", ["S06"]),
  med(604, "2m", [1.10, 0.75], "Trauma to the skin, subcutaneous tissue and breast", ["T14"]),
  med(933, "2m", [1.50, 0.90], "Nonextensive burns", ["T20"]),
  med(917, "2m", [1.50, 0.80], "Poisoning and toxic effects of drugs", ["T63", "T39"]),
  med(919, "3", [1.40, 0.90, 0.65], "Complications of treatment", ["T81"]),
  // Genitourinary
  med(689, "2m", [1.15, 0.80], "Kidney and urinary tract infections", ["N10", "N39"]),
  med(693, "2m", [1.20, 0.75], "Urinary stones and obstruction", ["N13", "N20"]),
  med(725, "2m", [0.95, 0.60], "Benign prostatic hypertrophy", ["N40"]),
  med(729, "2c", [0.95, 0.65], "Other male reproductive system diagnoses", ["N41"]),
  med(760, "2c", [0.90, 0.60], "Menstrual and other female reproductive disorders", ["N76"]),
  med(698, "3", [1.60, 1.00, 0.80], "Other kidney and urinary tract diagnoses", ["R31"]),
  // Pregnancy and newborn
  med(831, "3", [1.10, 0.80, 0.60], "Other antepartum diagnoses", ["O14", "O15"]),
  med(778, "1", [0.50], "Threatened abortion", ["O20"]),
  med(805, "3", [1.25, 0.95, 0.75], "Vaginal delivery", ["O80"]),
  med(791, "2m", [3.50, 1.60], "Prematurity", ["P07"]),
  med(793, "1", [3.00], "Neonate with major problems", ["P10", "P36"]),
  med(794, "1", [1.20], "Neonate with other significant problems", ["P58", "P59"]),
  med(306, "2m", [1.60, 0.90], "Congenital heart disease", ["Q21"]),
  med(131, "2c", [2.10, 1.40], "Cranial and facial (cleft repair)", ["Q36", "Q37"]),
  // Symptoms
  med(313, "1", [0.65], "Chest pain", ["R07"]),
  med(864, "1", [0.85], "Fever and inflammatory conditions", ["R50"]),
  med(312, "1", [0.80], "Syncope and collapse", ["R55"]),
  med(947, "2m", [1.00, 0.65], "Signs and symptoms", ["R70"]),
  // Surgical variants (used when the chart carries a procedure)
  surg(341, "3", [2.00, 1.30, 0.95], "Appendectomy w/o complicated principal diagnosis", ["K35"]),
  surg(417, "3", [3.20, 1.90, 1.30], "Laparoscopic cholecystectomy w/o CDE", ["K80"]),
  surg(469, "2m", [3.10, 1.90], "Major joint replacement or reattachment of lower extremity", ["M17"]),
  surg(480, "3", [3.30, 2.10, 1.80], "Hip and femur procedures except major joint", ["S72"]),
  surg(582, "2c", [1.70, 1.20], "Mastectomy for malignancy", ["C50"]),
  surg(713, "2c", [1.50, 0.90], "Transurethral prostatectomy", ["N40"]),
  surg(25, "3", [3.60, 2.40, 1.90], "Craniotomy and endovascular intracranial procedures", ["S06"]),
  surg(247, "2m", [3.20, 2.10], "Percutaneous cardiovascular procedure w drug-eluting stent", ["I21"]),
];

const MEDICAL = new Map<string, Family>();
const SURGICAL = new Map<string, Family>();
for (const f of FAMILIES) for (const c of f.codes) (f.surgical ? SURGICAL : MEDICAL).set(c, f);

/** Approximate MCC / CC sets (secondary-diagnosis severity); no CC-exclusion logic. */
const MCC = new Set(["A40", "A41", "R57", "J96", "N17", "I21", "I60", "I63", "I26", "I33", "A82", "B20", "J12", "J14", "J15", "J18", "T20", "K85"]);
const CC = new Set([
  "I50", "N18", "N19", "E10", "E11", "J44", "I48", "D57", "C16", "C18", "C22", "C34", "C50", "C53", "C61", "C67", "C85", "C91",
  "K56", "K74", "G40", "F06", "N39", "I82", "K25", "K26", "S72", "S06", "E66", "J84", "J90",
]);

/** ICD-10 category: upper-case, up to the first dot, max 3 characters. */
export function icdCategory(code: string): string {
  return code.trim().toUpperCase().split(".")[0]!.slice(0, 3);
}

export function usSeverity(secondaryCodes: string[]): DrgSeverity {
  let sev: DrgSeverity = "none";
  for (const raw of secondaryCodes) {
    const c = icdCategory(raw);
    if (MCC.has(c)) return "MCC";
    if (CC.has(c)) sev = "CC";
  }
  return sev;
}

function tierIndex(split: Split, sev: DrgSeverity): number {
  if (split === "1") return 0;
  if (split === "3") return sev === "MCC" ? 0 : sev === "CC" ? 1 : 2;
  if (split === "2m") return sev === "MCC" ? 0 : 1;
  return sev === "none" ? 1 : 0; // "2c": CC or MCC share the top tier
}

const SUFFIX: Record<Split, string[]> = {
  "3": [" w MCC", " w CC", " w/o CC/MCC"],
  "2m": [" w MCC", " w/o MCC"],
  "2c": [" w CC/MCC", " w/o CC/MCC"],
  "1": [""],
};

/**
 * Assign an MS-DRG. `diagnoses[0]` is the principal diagnosis. A surgical DRG
 * is used when a procedure is on the chart and a surgical family exists for
 * the principal diagnosis. Returns undefined when the principal diagnosis has
 * no mapping (caller bills as an unmapped claim).
 */
export function assignMsDrg(diagnoses: string[], hasProcedure: boolean): DrgAssignment | undefined {
  if (diagnoses.length === 0) return undefined;
  const principal = icdCategory(diagnoses[0]!);
  const fam = (hasProcedure ? SURGICAL.get(principal) : undefined) ?? MEDICAL.get(principal);
  if (!fam) return undefined;
  const severity = usSeverity(diagnoses.slice(1));
  const i = tierIndex(fam.split, severity);
  return {
    drg: String(fam.base + i).padStart(3, "0"),
    description: fam.label + SUFFIX[fam.split][i],
    weight: fam.weights[i]!,
    severity,
    surgical: fam.surgical,
  };
}

/** Placeholder national base payment (operating + capital), USD per unit weight. */
export const MEDICARE_BASE_RATE = 7_000;

export function drgPayment(a: DrgAssignment, baseRate: number = MEDICARE_BASE_RATE): number {
  return Math.round(a.weight * baseRate * 100) / 100;
}

/** Split a set of ICD-10 codes into those the US tariff can group and those it cannot. */
export function drgCoverage(codes: string[]): { mapped: string[]; unmapped: string[] } {
  const mapped: string[] = [];
  const unmapped: string[] = [];
  for (const c of [...new Set(codes)]) (MEDICAL.has(icdCategory(c)) || SURGICAL.has(icdCategory(c)) ? mapped : unmapped).push(c);
  return { mapped, unmapped };
}
