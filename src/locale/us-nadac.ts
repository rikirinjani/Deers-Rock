/**
 * US drug acquisition cost from CMS NADAC (National Average Drug Acquisition Cost). Epic X M10.5c, pilot.
 *
 * Source: CMS, NADAC 2026 dataset, data.medicaid.gov (identifier fbb83258-11c7-47f5-8b18-5f8e79f7e704),
 * rates with as_of_date 2026-11-04, retrieved 2026-11-09 through the datastore query API
 * (docs/us-calibration-targets.md T-DRUG-1). NADAC is the average invoice price a retail pharmacy pays
 * per pricing unit; it excludes dispensing fees, hospital markup and rebates. The rate is the same for
 * every NDC of one description, so a description identifies one number.
 *
 * Scope: 94 oral and sublingual solids priced per tablet or capsule (pricing unit EA): the first ten were the
 * pilot, 84 were added by name-and-strength matching and reviewed by hand (NAC and methylphenidate matched the
 * wrong product and were dropped). Where one name has several matching descriptions (for example doxycycline
 * hyclate/monohydrate, or tablet and capsule) the median is used and all descriptions are listed. 36 more
 * (US_NADAC_DOSES, below) cover injectables and a few orals. Every other drug (topicals, inhalers, insulins, drugs
 * without a clean match) still uses the derived placeholder in us-prices.ts. The mapping to the simulator's drug is by name and
 * strength; where the strengths differ (aspirin 80 mg vs 81 mg) the nearest NADAC entry is used.
 *
 * Deterministic constants: no RNG, no clock.
 */
export interface NadacEntry {
  /** Engine drug code */
  code: string;
  /** NADAC `ndc_description` the rate was read from */
  ndcDescription: string;
  /** USD per pricing unit (NADAC `nadac_per_unit`) */
  perUnitUsd: number;
  /** NADAC pricing unit */
  unit: "EA" | "ML";
  /** NADAC pricing units in one simulator dose (default 1; vials and mL doses, see US_NADAC_DOSES) */
  qty?: number;
  /** NADAC `as_of_date` */
  asOf: string;
}

const entry = (code: string, ndcDescription: string, perUnitUsd: number): NadacEntry =>
  ({ code, ndcDescription, perUnitUsd, unit: "EA", asOf: "2026-11-04" });

export const US_NADAC: readonly NadacEntry[] = [
  entry("MET", "METFORMIN HCL 500 MG TABLET", 0.01483),
  entry("ATR", "ATORVASTATIN 20 MG TABLET", 0.02858),
  entry("OMP", "OMEPRAZOLE DR 20 MG CAPSULE", 0.03045),
  entry("PRC", "ACETAMINOPHEN 500 MG TABLET", 0.03448),
  entry("AMX", "AMOXICILLIN 500 MG CAPSULE", 0.07925),
  entry("CIP", "CIPROFLOXACIN HCL 500 MG TAB", 0.12065),
  entry("AML", "AMLODIPINE BESYLATE 5 MG TAB", 0.01015),
  entry("ASP", "ASPIRIN 81 MG CHEWABLE TABLET", 0.02528),
  entry("LOS", "LOSARTAN POTASSIUM 50 MG TAB", 0.03316),
  entry("SIM", "SIMVASTATIN 20 MG TABLET", 0.03245),
  // Extension (M10.5c): oral solids matched by name and strength, plain tablet or capsule, median over the matching NDC descriptions.
  entry("ACE", "ENALAPRIL MALEATE 5 MG TABLET", 0.0845),
  entry("DIA", "DIAZEPAM 5 MG TABLET", 0.02591),
  entry("BIS", "BISOPROLOL FUMARATE 5 MG TAB", 0.11496),
  entry("HCT", "HYDROCHLOROTHIAZIDE 25 MG TAB", 0.01142),
  entry("NIF", "NIFEDIPINE 10 MG CAPSULE", 0.27243),
  entry("ISO", "ISOSORBIDE DINITRATE 5 MG TAB", 0.16013),
  entry("GLP", "GLIPIZIDE 5 MG TABLET", 0.03285),
  entry("PIO", "PIOGLITAZONE HCL 30 MG TABLET", 0.0965),
  entry("DIA2", "SITAGLIPTIN PHOSPHATE 100 MG TABLET", 3.84929),
  entry("DOX", "DOXYCYCLINE MONO 100 MG TABLET / DOXYCYCLINE MONO 100 MG CAP / DOXYCYCLINE HYCLATE 100 MG TAB / DOXYCYCLINE HYCLATE 100 MG CAP", 0.11995),
  entry("CLI", "CLARITHROMYCIN 250 MG TABLET", 0.38875),
  entry("TIN", "TINIDAZOLE 500 MG TABLET", 2.46882),
  entry("ACT", "ACYCLOVIR 400 MG TABLET", 0.09553),
  entry("TDF", "TENOFOVIR DISOPROXIL FUMARATE 300 MG TABLET", 0.29568),
  entry("3TC", "LAMIVUDINE 150 MG TABLET", 0.48008),
  entry("FLC", "FLUCONAZOLE 200 MG TABLET", 0.36756),
  entry("WAF", "WARFARIN SODIUM 5 MG TABLET", 0.08916),
  entry("CLO", "CLOPIDOGREL 75 MG TABLET", 0.04691),
  entry("ROS", "ROSUVASTATIN CALCIUM 10 MG TAB", 0.03553),
  entry("IBU", "IBUPROFEN 400 MG TABLET", 0.03749),
  entry("NEC", "DICLOFENAC SOD EC 50 MG TAB / DICLOFENAC POT 50 MG TABLET", 0.12129),
  entry("TRM", "TRAMADOL HCL 50 MG TABLET", 0.02604),
  entry("PHT", "PHENYTOIN SOD EXT 100 MG CAP", 0.1438),
  entry("LEV", "LEVETIRACETAM 500 MG TABLET", 0.07225),
  entry("OLA", "OLANZAPINE 5 MG TABLET", 0.08821),
  entry("SER", "SERTRALINE HCL 50 MG TABLET", 0.03484),
  entry("ESC", "ESCITALOPRAM 10 MG TABLET", 0.03911),
  entry("PRED", "PREDNISONE 5 MG TABLET", 0.03714),
  entry("H", "ISONIAZID 100 MG TABLET", 1.73222),
  entry("Z", "PYRAZINAMIDE 500 MG TABLET", 1.31424),
  entry("E", "ETHAMBUTOL HCL 400 MG TABLET", 0.46827),
  entry("AZM", "AZITHROMYCIN 250 MG TABLET", 0.27085),
  entry("DAP", "DAPSONE 100 MG TABLET", 0.79942),
  entry("VALA", "VALACYCLOVIR HCL 500 MG TABLET", 0.22895),
  entry("LVT", "LEVOTHYROXINE 100 MCG TABLET", 0.04954),
  entry("KET", "KETOCONAZOLE 200 MG TABLET", 0.67913),
  entry("METO", "METOPROLOL TARTRATE 50 MG TAB", 0.02048),
  entry("PRA", "PRAZOSIN 1 MG CAPSULE", 0.08376),
  entry("DON", "DONEPEZIL HCL 10 MG TABLET", 0.04888),
  entry("SUM", "SUMATRIPTAN SUCC 50 MG TABLET", 0.31262),
  entry("FOL", "FOLIC ACID 1 MG TABLET", 0.01995),
  entry("RIS", "RISPERIDONE 1 MG TABLET", 0.0388),
  entry("QUE", "QUETIAPINE FUMARATE 25 MG TAB", 0.0209),
  entry("CLP", "CHLORPROMAZINE 25 MG TABLET", 0.32868),
  entry("LIT", "LITHIUM CARBONATE 300 MG TAB / LITHIUM CARBONATE 300 MG CAP", 0.11293),
  entry("CRB", "CARBAMAZEPINE 200 MG TABLET", 0.11926),
  entry("BUS", "BUSPIRONE HCL 5 MG TABLET", 0.02184),
  entry("ZOL", "ZOLPIDEM TARTRATE 5 MG TABLET", 0.03461),
  entry("GAB", "GABAPENTIN 300 MG CAPSULE", 0.03283),
  entry("TPM", "TOPIRAMATE 50 MG TABLET / TOPIRAMATE 50 MG SPRINKLE CAP", 0.03974),
  entry("LAM", "LAMOTRIGINE 25 MG TABLET / LAMOTRIGINE 25 MG DISPER TAB", 0.02696),
  entry("ACR", "ACARBOSE 50 MG TABLET", 0.16466),
  entry("CLN", "CLINDAMYCIN HCL 150 MG CAPSULE", 0.10479),
  entry("CPX", "CEFPODOXIME 100 MG TABLET", 1.06678),
  entry("MOX", "MOXIFLOXACIN HCL 400 MG TABLET", 1.42223),
  entry("MTX", "METHOTREXATE 2.5 MG TABLET", 0.16319),
  entry("HCQ", "HYDROXYCHLOROQUINE 200 MG TAB", 0.14412),
  entry("SZA", "SULFASALAZINE 500 MG TABLET", 0.19849),
  entry("SPR", "SPIRONOLACTONE 25 MG TABLET", 0.0426),
  entry("FEN", "FENOFIBRATE 200 MG CAPSULE", 0.17123),
  entry("RAM", "RAMIPRIL 2.5 MG CAPSULE", 0.04936),
  entry("RAM5", "RAMIPRIL 5 MG CAPSULE", 0.05192),
  entry("LOS50", "LOSARTAN POTASSIUM 50 MG TAB", 0.03316),
  entry("AML10", "AMLODIPINE BESYLATE 10 MG TAB", 0.01441),
  entry("VER", "VERAPAMIL 40 MG TABLET", 0.11232),
  entry("AMI", "AMIODARONE HCL 200 MG TABLET", 0.12111),
  entry("DEX05", "DEXAMETHASONE 0.5 MG TABLET", 0.07084),
  entry("CAL2", "CALCITRIOL 0.25 MCG CAPSULE", 0.15074),
  entry("KET10", "KETOROLAC 10 MG TABLET", 0.17027),
  entry("CYC", "CYCLOSPORINE 100 MG CAPSULE", 7.40479),
  entry("AZA", "AZATHIOPRINE 50 MG TABLET", 0.12818),
  entry("TAM", "TAMSULOSIN HCL 0.4 MG CAPSULE", 0.04892),
  entry("ALO", "ALLOPURINOL 100 MG TABLET", 0.03118),
  entry("ALO3", "ALLOPURINOL 300 MG TABLET", 0.05221),
  entry("CSZ", "CILOSTAZOL 100 MG TABLET", 0.12504),
  entry("NBL", "NEBIVOLOL 5 MG TABLET", 0.1153),
  entry("OSL", "OSELTAMIVIR PHOS 75 MG CAPSULE", 0.79808),
  entry("SIT", "SITAGLIPTIN PHOSPHATE 100 MG TABLET", 3.84929),
  entry("TRA", "TRAMADOL HCL 50 MG TABLET", 0.02604),
  entry("BUP", "BUPRENORPHINE 2 MG TABLET SL", 0.28717),
  entry("TET", "TETRACYCLINE 250 MG CAPSULE", 0.26669),
  entry("ACY", "ACYCLOVIR 400 MG TABLET", 0.09553),
  entry("FLU2", "FLUCONAZOLE 200 MG TABLET", 0.36756),
  entry("DAX", "DEXAMETHASONE 2 MG TABLET", 0.26016),
];

/** Dose-priced entry: `qty` NADAC pricing units make one simulator dose (one vial, or the dose volume in mL). */
const dose = (code: string, ndcDescription: string, perUnitUsd: number, unit: "EA" | "ML", qty: number): NadacEntry =>
  ({ code, ndcDescription, perUnitUsd, unit, qty, asOf: "2026-11-11" });

/**
 * Epic X M10.5c extension (T-DRUG-1): 36 more drugs matched to NADAC by exact name, strength and form, reviewed
 * by hand: 8 oral solids, 22 injectables priced per vial (EA) or per mL x the dose volume implied by the
 * description (for example furosemide 40 mg = 4 mL of the 40 mg/4 mL vial), one emergency glucagon vial and the
 * desmopressin spray. NADAC is a retail-pharmacy acquisition price; hospital injectable contract prices differ,
 * so these are an order-of-magnitude acquisition cost, not hospital contract rates. Not matched (strength, form
 * or concentration differs, or no NADAC row): meropenem 500 mg (only 1 g), cefazolin 2 g (only 1 g), rocuronium and
 * primaquine (stale rows), insulins, inhalers, topicals, vaccines, antineoplastics, iron sucrose, calcium and
 * magnesium salts, dextrose and saline bags, adenosine, epinephrine 1 mg/mL, pethidine, nimodipine, colchicine,
 * folic acid 5 mg, propylthiouracil 100 mg, rivaroxaban 20 mg, apixaban, empagliflozin, canagliflozin.
 */
export const US_NADAC_DOSES: readonly NadacEntry[] = [
  // vials priced per vial
  dose("CTR", "CEFTRIAXONE 1 GM VIAL", 1.45713, "EA", 1),
  dose("VAN", "VANCOMYCIN 500 MG VIAL", 2.3054, "EA", 1),
  dose("ERT", "ERTAPENEM 1 GRAM VIAL", 47.2056, "EA", 1),
  dose("COL", "COLISTIMETHATE 150 MG VIAL", 15.48667, "EA", 1),
  dose("PNT", "PANTOPRAZOLE SODIUM 40 MG VIAL", 2.374, "EA", 1),
  dose("HYD", "HYDROCORTISONE SS 100 MG VIAL", 14.45933, "EA", 1),
  dose("GCG", "GLUCAGON 1 MG VIAL", 134.45828, "EA", 1),
  // injectables priced per mL x dose volume
  dose("FUR", "FUROSEMIDE 40 MG/4 ML VIAL", 0.26455, "ML", 4),
  dose("OND", "ONDANSETRON HCL 4 MG/2 ML VIAL", 0.17718, "ML", 2),
  dose("LAB", "LABETALOL HCL 100 MG/20 ML VL", 0.1852, "ML", 20),
  dose("MET2", "METOCLOPRAMIDE 10 MG/2 ML VIAL", 0.52896, "ML", 2),
  dose("KTR", "KETOROLAC 30 MG/ML VIAL", 1.00455, "ML", 1),
  dose("KETOR", "KETOROLAC 30 MG/ML VIAL", 1.00455, "ML", 1),
  dose("DEX", "DEXAMETHASONE 4 MG/ML VIAL", 0.67002, "ML", 1),
  dose("MOR", "MORPHINE SULFATE 10 MG/ML VIAL", 2.34224, "ML", 1),
  dose("FNT", "FENTANYL 250 MCG/5 ML VIAL", 1.75935, "ML", 1),
  dose("GEN", "GENTAMICIN 80 MG/2 ML VIAL", 1.25757, "ML", 2),
  dose("HEP10", "HEPARIN SODIUM 10,000 UNIT/ML VIAL", 2.20185, "ML", 1),
  dose("HEP5", "HEPARIN SODIUM 5,000 UNIT/ML VIAL", 1.21589, "ML", 1),
  dose("NAL", "NALOXONE 0.4 MG/ML VIAL", 3.76348, "ML", 1),
  dose("THI", "THIAMINE 200 MG/2 ML VIAL", 2.12563, "ML", 1),
  dose("HEP", "ENOXAPARIN 40 MG/0.4 ML SYR", 7.47202, "ML", 0.4),
  dose("PROP", "PROPOFOL 200 MG/20 ML VIAL", 0.17094, "ML", 20),
  dose("OCT", "OCTREOTIDE ACET 100 MCG/ML VL", 2.67924, "ML", 1),
  dose("DDA", "DESMOPRESSIN 10 MCG/0.1 ML SPR", 10.52954, "ML", 0.1),
  dose("AMG", "AMIKACIN SULF 500 MG/2 ML VIAL", 2.4323, "ML", 1),
  dose("HAL", "HALOPERIDOL LAC 5 MG/ML VIAL", 0.77924, "ML", 1),
  dose("B12", "CYANOCOBALAMIN 1,000 MCG/ML VL", 3.14264, "ML", 1),
  // oral solids per tablet or capsule
  dose("DIG", "DIGOXIN 250 MCG TABLET", 0.14452, "EA", 1),
  dose("SUC", "SUCRALFATE 1 GM TABLET", 0.16938, "EA", 1),
  dose("BSM", "BISMUTH 262 MG TABLET CHEW", 0.08219, "EA", 1),
  dose("MEC", "MECLIZINE 25 MG TABLET", 0.13024, "EA", 1),
  dose("FAM", "FAMOTIDINE 20 MG TABLET", 0.13826, "EA", 1),
  dose("DIC", "DICYCLOMINE 20 MG TABLET", 0.05911, "EA", 1),
  dose("NTX", "NALTREXONE 50 MG TABLET", 1.12306, "EA", 1),
  dose("R", "RIFAMPIN 150 MG CAPSULE", 0.98157, "EA", 1),
];

export const US_NADAC_BY_CODE: ReadonlyMap<string, NadacEntry> = new Map([...US_NADAC, ...US_NADAC_DOSES].map(e => [e.code, e]));
