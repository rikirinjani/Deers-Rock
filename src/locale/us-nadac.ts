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
 * hyclate/monohydrate, or tablet and capsule) the median is used and all descriptions are listed. Every other
 * drug (injectables, topicals, inhalers, 20 oral drugs without a clean match) still uses the derived placeholder
 * in us-prices.ts. The mapping to the simulator's drug is by name and
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
  unit: "EA";
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

export const US_NADAC_BY_CODE: ReadonlyMap<string, NadacEntry> = new Map(US_NADAC.map(e => [e.code, e]));
