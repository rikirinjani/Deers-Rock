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
 * CALIBRATED (M10.5c): weights are the FY 2026 CMS-1833-F Table 5 values (10 % cap applied) and the
 * base rate is the FY 2026 CMS figure (see below); docs/us-calibration-targets.md T-DRG-1..3. Remaining
 * placeholder: family 131/132 (cleft repair, Q36/Q37), which has no FY 2026 DRG of that number and whose
 * v43 assignment was not found. Severity split structure and the no-CC-exclusion approximation are unchanged.
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
  med(871, "2m", [1.9425, 1.0233], "Septicemia or severe sepsis", ["A40", "A41", "R57"]),
  med(867, "3", [2.0932, 1.0311, 0.7297], "Other infectious and parasitic diseases", ["A01", "A27", "A30", "A37", "A39", "A49", "A82", "A91", "A95", "B50"]),
  med(391, "2m", [1.2683, 0.7796], "Esophagitis, gastroenteritis and misc digestive disorders", ["A09", "K21", "K29", "R10"]),
  med(177, "3", [1.5627, 0.9760, 0.7550], "Respiratory infections and inflammations", ["A15", "U07"]),
  med(974, "3", [2.8860, 1.2950, 0.9027], "HIV w major related condition", ["B20"]),
  med(441, "3", [1.7947, 0.9653, 0.6997], "Disorders of liver except malignancy, cirrhosis, alcoholic hepatitis", ["B18", "B19", "K74"]),
  med(606, "2m", [1.5132, 0.9064], "Minor skin disorders", ["B86", "L40"]),
  med(602, "2m", [1.4213, 0.8709], "Cellulitis", ["L03"]),
  // Neoplasms
  med(180, "3", [1.7660, 1.0710, 0.7538], "Respiratory neoplasms", ["C34"]),
  med(374, "3", [2.1387, 1.2096, 0.9243], "Digestive malignancy", ["C16", "C18", "C22"]),
  med(597, "3", [1.6671, 1.1313, 0.7694], "Malignant breast disorders", ["C50"]),
  med(754, "3", [1.8417, 1.0878, 0.9605], "Malignancy, female reproductive system", ["C53"]),
  med(722, "3", [1.8097, 1.1427, 0.6557], "Malignancy, male reproductive system", ["C61"]),
  med(686, "3", [1.8037, 1.0478, 0.7903], "Kidney and urinary tract neoplasms", ["C67"]),
  med(54, "2m", [1.5269, 1.0196], "Nervous system neoplasms", ["C70"]),
  med(840, "3", [3.2349, 1.6314, 1.0104], "Lymphoma and non-acute leukemia", ["C85"]),
  med(834, "3", [5.4899, 2.0858, 1.2195], "Acute leukemia", ["C91"]),
  // Blood
  med(811, "2c", [1.4043, 0.9182], "Red blood cell disorders", ["D50", "D55", "D57", "D64"]),
  med(813, "1", [1.5253], "Coagulation disorders", ["D69"]),
  med(742, "2c", [1.8348, 1.2407], "Uterine and adnexa procedures for non-malignancy", ["D25"]),
  // Endocrine
  med(637, "3", [1.4367, 0.8962, 0.6212], "Diabetes", ["E10", "E11"]),
  med(643, "3", [1.6461, 1.0250, 0.7683], "Endocrine disorders", ["E03", "E04", "E05", "E20", "E21", "E24", "E27"]),
  med(640, "2m", [1.3356, 0.7782], "Misc disorders of nutrition, metabolism, fluids and electrolytes", ["E66", "E78", "E86"]),
  // Mental
  med(884, "1", [1.6089], "Organic disturbances and intellectual disability", ["F00", "F06"]),
  med(885, "1", [1.3968], "Psychoses", ["F20", "F31"]),
  med(881, "1", [0.9409], "Depressive neuroses", ["F32"]),
  med(882, "1", [1.0738], "Neuroses except depressive", ["F41", "F42", "F43"]),
  med(887, "1", [1.0709], "Other mental disorder diagnoses", ["F90"]),
  // Nervous system
  med(56, "2m", [2.3231, 1.2956], "Degenerative nervous system disorders", ["G20"]),
  med(100, "2m", [1.9368, 0.9026], "Seizures", ["G40"]),
  med(102, "2m", [1.1209, 0.8363], "Headaches", ["G43", "R51"]),
  med(91, "3", [1.7562, 1.0230, 0.7963], "Other disorders of nervous system", ["G56", "G58", "G61"]),
  med(64, "3", [2.0110, 1.0103, 0.6844], "Intracranial hemorrhage or cerebral infarction", ["I60", "I63"]),
  // Eye / ear
  med(124, "2m", [1.3231, 0.7678], "Other disorders of the eye", ["H10", "H25"]),
  med(152, "2m", [1.1822, 0.7382], "Otitis media and URI", ["H66", "J06", "J32"]),
  med(149, "1", [0.7516], "Dysequilibrium", ["H81"]),
  // Circulatory
  med(280, "3", [1.6041, 0.9191, 0.7231], "Acute myocardial infarction, discharged alive", ["I21"]),
  med(291, "3", [1.2838, 0.8490, 0.5660], "Heart failure and shock", ["I50", "I11"]),
  med(304, "2m", [1.1900, 0.7551], "Hypertension", ["I10"]),
  med(308, "3", [1.2040, 0.7357, 0.5661], "Cardiac arrhythmia and conduction disorders", ["I48", "I49"]),
  med(311, "1", [0.7019], "Angina pectoris / chronic ischemic heart disease", ["I25"]),
  med(314, "3", [2.0852, 0.9633, 0.6821], "Other circulatory system diagnoses", ["I05", "I09", "I00", "I30", "I42"]),
  med(288, "3", [2.7062, 1.7069, 0.9297], "Acute and subacute endocarditis", ["I33"]),
  med(175, "2m", [1.3736, 0.8050], "Pulmonary embolism", ["I26"]),
  med(299, "3", [1.6327, 1.0675, 0.7197], "Peripheral vascular disorders", ["I70", "I73", "I77", "I80", "I82", "I83"]),
  med(682, "3", [1.4810, 0.8758, 0.6003], "Renal failure", ["N17", "N18", "N19", "I12"]),
  // Respiratory
  med(193, "3", [1.3144, 0.8059, 0.6285], "Simple pneumonia and pleurisy", ["J12", "J14", "J15", "J18"]),
  med(202, "2c", [0.9712, 0.6700], "Bronchitis and asthma", ["J20", "J45", "J47"]),
  med(190, "3", [1.1077, 0.8430, 0.6420], "Chronic obstructive pulmonary disease", ["J44"]),
  med(205, "2m", [1.8310, 0.9411], "Other respiratory system diagnoses", ["J10", "J11"]),
  med(196, "3", [1.8872, 0.9491, 0.7162], "Interstitial lung disease", ["J84"]),
  med(186, "3", [1.5585, 0.9891, 0.7172], "Pleural effusion", ["J90", "J91"]),
  med(189, "1", [1.2354], "Pulmonary edema and respiratory failure", ["J96"]),
  // Digestive
  med(393, "3", [1.5993, 0.9357, 0.6490], "Other digestive system diagnoses", ["K35", "K64", "R23"]),
  med(380, "3", [1.9622, 1.0835, 0.8006], "Complicated peptic ulcer", ["K25", "K26"]),
  med(388, "3", [1.4768, 0.7898, 0.5440], "GI obstruction", ["K56"]),
  med(444, "3", [1.6709, 1.0944, 0.8273], "Disorders of the biliary tract", ["K80"]),
  med(438, "3", [1.6302, 0.8412, 0.6214], "Disorders of pancreas except malignancy", ["K85"]),
  // Musculoskeletal
  med(553, "2m", [1.2963, 0.8301], "Bone diseases and arthropathies", ["M06", "M17", "M75", "M81"]),
  med(551, "2m", [1.6761, 0.9613], "Medical back problems", ["M54"]),
  med(535, "2m", [1.2820, 0.8076], "Fractures of hip and pelvis", ["S72"]),
  med(183, "3", [1.5299, 1.0641, 0.7865], "Major chest trauma", ["S22"]),
  med(562, "2m", [1.4248, 0.8955], "Fracture, sprain, strain and dislocation except femur, hip, pelvis", ["S62"]),
  med(88, "3", [1.3518, 1.0986, 0.8232], "Concussion", ["S06"]),
  med(604, "2m", [1.4721, 0.9160], "Trauma to the skin, subcutaneous tissue and breast", ["T14"]),
  med(933, "2m", [3.8942, 2.2106], "Nonextensive burns", ["T20"]),
  med(917, "2m", [1.5684, 0.8571], "Poisoning and toxic effects of drugs", ["T63", "T39", "T40"]),
  med(896, "2m", [1.7451, 0.8828], "Alcohol, drug abuse or dependence", ["F10", "F11"]),
  med(432, "3", [1.9682, 1.0562, 0.7125], "Cirrhosis and alcoholic hepatitis", ["K70"]),
  med(919, "3", [1.8308, 1.0023, 0.6884], "Complications of treatment", ["T81"]),
  // Genitourinary
  med(689, "2m", [1.1603, 0.8095], "Kidney and urinary tract infections", ["N10", "N39"]),
  med(693, "2m", [1.3445, 0.7817], "Urinary stones and obstruction", ["N13", "N20"]),
  med(725, "2m", [1.1702, 0.7220], "Benign prostatic hypertrophy", ["N40"]),
  med(729, "2c", [1.0587, 0.6720], "Other male reproductive system diagnoses", ["N41"]),
  med(760, "2c", [1.0075, 0.5705], "Menstrual and other female reproductive disorders", ["N76"]),
  med(698, "3", [1.6544, 1.0150, 0.6899], "Other kidney and urinary tract diagnoses", ["R31"]),
  // Pregnancy and newborn
  med(831, "3", [1.2025, 0.7216, 0.5229], "Other antepartum diagnoses", ["O14", "O15", "O20"]),
    med(805, "3", [1.0792, 0.7540, 0.6742], "Vaginal delivery", ["O80"]),
  med(791, "2m", [4.0590, 2.4492], "Prematurity", ["P07"]),
  med(793, "1", [4.1696], "Neonate with major problems", ["P10", "P36"]),
  med(794, "1", [1.4759], "Neonate with other significant problems", ["P58", "P59"]),
  med(306, "2m", [1.5758, 0.9132], "Congenital heart disease", ["Q21"]),
  med(131, "2c", [2.10, 1.40], "Cranial and facial (cleft repair)", ["Q36", "Q37"]),
  // Symptoms
  med(313, "1", [0.7200], "Chest pain", ["R07"]),
  med(864, "1", [0.8877], "Fever and inflammatory conditions", ["R50"]),
  med(312, "1", [0.8716], "Syncope and collapse", ["R55"]),
  med(947, "2m", [1.2694, 0.8005], "Signs and symptoms", ["R70"]),
  // Surgical variants (used when the chart carries a procedure)
  surg(397, "3", [2.3949, 1.5136, 1.1447], "Appendix procedures", ["K35"]),
  surg(417, "3", [2.3864, 1.6916, 1.3658], "Laparoscopic cholecystectomy w/o CDE", ["K80"]),
  surg(469, "2m", [3.0332, 1.9289], "Major joint replacement or reattachment of lower extremity", ["M17"]),
  surg(480, "3", [2.9123, 2.0945, 1.6310], "Hip and femur procedures except major joint", ["S72"]),
  surg(582, "2c", [1.9266, 1.7244], "Mastectomy for malignancy", ["C50"]),
  surg(713, "2c", [1.5034, 1.0574], "Transurethral prostatectomy", ["N40"]),
  surg(25, "3", [4.5467, 3.1092, 2.5229], "Craniotomy and endovascular intracranial procedures", ["S06"]),
  surg(321, "2m", [2.7208, 1.7630], "Percutaneous cardiovascular procedures with intraluminal device", ["I21"]),
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

/**
 * FY 2026 national standard amounts, USD per unit relative weight (CMS-1833-F; docs/us-calibration-targets.md T-DRG-2 and T-DRG-3).
 * Operating: Table 1A/1B, full update, quality data submitted, meaningful EHR user (labor + nonlabor, 6,752.61 for both wage-index cases).
 * Capital: Table 1D, national standard federal payment rate.
 */
export const MEDICARE_OPERATING_RATE = 6_752.61;
export const MEDICARE_CAPITAL_RATE = 524.15;

/** National base payment (operating + capital), USD per unit weight. No wage-index, DSH, IME or outlier adjustment. */
export const MEDICARE_BASE_RATE = Math.round((MEDICARE_OPERATING_RATE + MEDICARE_CAPITAL_RATE) * 100) / 100;

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
