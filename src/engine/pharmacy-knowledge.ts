import type { Medication, Diagnosis } from "../patient/schema.js";
import { DRUG_CATALOG, getDrug } from "./drug-catalog.js";

/** Allergen groups per drug code. Extended from 22 to 50 drugs. */
export const MED_ALLERGEN_MAP: Record<string, string[]> = {
  // Existing
  "ACE": ["ACE inhibitor"], "MET": [], "ATR": ["statin"], "OMP": [],
  "LVF": ["fluoroquinolone"], "PRC": ["paracetamol"], "HEP": ["heparin", "LMWH"],
  "SAL": [], "FUR": ["sulfonamide"], "DIA": ["benzodiazepine"],
  "AMX": ["penicillin", "amoxicillin"], "CTR": ["cephalosporin", "ceftriaxone"],
  "MTZ": ["nitroimidazole"], "CIP": ["fluoroquinolone", "ciprofloxacin"],
  "AML": [], "BIS": [], "ASP": ["aspirin", "NSAID", "salicylate"],
  "INS": [], "OND": ["ondansetron"], "MOR": ["morphine", "opioid"],
  "KCL": [], "RL": [],
  // New — antihypertensives
  "LOS": [], "HCT": ["sulfonamide"], "NIF": [], "LAB": [], "ISO": [],
  // New — antidiabetics
  "GLP": [], "PIO": [], "CAN": [], "DIA2": [], "PCA": [],
  // New — antibiotics oral
  "DOX": [], "CLI": [], "TIN": ["nitroimidazole"], "CPM": ["cephalosporin"],
  // New — antibiotics IV
  "MEM": [], "VAN": [], "AMG": [],
  // New — antivirals
  "ACT": [], "TDF": [], "3TC": [],
  // New — antifungal
  "FLC": [],
  // New — anticoagulants / antiplatelets
  "WAF": [], "RIV": [], "CLO": [],
  // New — statins
  "SIM": ["statin"], "ROS": ["statin"],
  // New — analgesics / NSAIDs
  "IBU": ["NSAID", "propionic acid derivative"], "NEC": ["NSAID", "fenamate"],
  "TRM": [],
  // New — anticonvulsants
  "PHT": [], "VAL": [], "LEV": [],
  // New — antipsychotics
  "OLA": [], "HAL": [],
  // New — antidepressants
  "SER": [], "ESC": [],
  // New — corticosteroids
  "PRED": [], "DEX": [], "HYD": [],
  // New — bronchodilators
  "IPR": [],
  // New — PPI / H2 blocker
  "PNT": [], "RAN": [],
  // New — antiemetic
  "MET2": [],
  // New — electrolytes / fluids
  "CA": [], "NS": [],
  // New — antimalarials
  "ART": [], "PRQ": [],
  // New — antituberculous
  "H": [], "R": [], "Z": [], "E": [],
  // ADR-011: New drugs for protocol coverage
  "AZM": [], "PCN": ["penicillin"], "DAP": ["sulfone"],
  "VALA": [], "LVT": [], "PTU": [], "KET": [],
  "METO": [], "NIM": [], "PRA": [], "MAG": [],
  "DON": [], "MPH": [], "SUM": [], "BET": [],
  "MOR5": ["morphine", "opioid"], "NAC": [],
  "TOB": [], "PREDN": [], "FOL": [],
};

/**
 * Drug ↔ diagnosis contraindications.
 * Expanded from 18 to ~50 rules covering new drug classes.
 */
export const DRUG_DIAGNOSIS_CONTRA: { drugCode: string; diagCodes: string[]; rationale: string }[] = [
  // ── Existing ──────────────────────────────────────────────────
  { drugCode: "ACE", diagCodes: ["I95", "N18"], rationale: "ACE inhibitors may worsen hypotension or require renal monitoring in CKD" },
  { drugCode: "MET", diagCodes: ["N18", "N17"], rationale: "Metformin contraindicated in severe renal impairment (eGFR <30)" },
  { drugCode: "MET", diagCodes: ["E10"], rationale: "Monitor for lactic acidosis with Metformin in T1DM" },
  { drugCode: "ATR", diagCodes: ["K70", "K71", "K72", "K73", "K74"], rationale: "Statin use with caution in active liver disease" },
  { drugCode: "LVF", diagCodes: ["G40"], rationale: "Fluoroquinolones may lower seizure threshold" },
  { drugCode: "FUR", diagCodes: ["N18", "N19", "N17"], rationale: "Monitor renal function and electrolytes with furosemide in CKD/AKF" },
  { drugCode: "DIA", diagCodes: ["J45"], rationale: "Benzodiazepines may cause respiratory depression in severe asthma" },
  { drugCode: "AMX", diagCodes: ["B20"], rationale: "Monitor for rash in HIV patients on amoxicillin" },
  { drugCode: "CTR", diagCodes: ["N18", "N19", "N17"], rationale: "Ceftriaxone dose adjustment in severe renal impairment" },
  { drugCode: "MTZ", diagCodes: ["K70", "K71"], rationale: "Metronidazole metabolized by liver; caution in hepatic impairment" },
  { drugCode: "CIP", diagCodes: ["G40"], rationale: "Ciprofloxacin may lower seizure threshold" },
  { drugCode: "BIS", diagCodes: ["J45", "I50"], rationale: "Beta-blockers may exacerbate asthma or worsen acute heart failure" },
  { drugCode: "ASP", diagCodes: ["K25", "K26", "K27", "K29"], rationale: "Aspirin may exacerbate peptic ulcer disease" },
  { drugCode: "INS", diagCodes: ["E10", "E11"], rationale: "Monitor blood glucose closely with insulin therapy" },
  { drugCode: "MOR", diagCodes: ["J45"], rationale: "Opioids may cause respiratory depression in severe asthma" },
  { drugCode: "KCL", diagCodes: ["N18", "N19", "N17"], rationale: "KCl administration with caution in renal impairment (hyperkalemia risk)" },
  // ── New: ARBs ─────────────────────────────────────────────────
  { drugCode: "LOS", diagCodes: ["N18", "N19", "N17"], rationale: "Losartan — monitor renal function and potassium in CKD/AKF" },
  { drugCode: "LOS", diagCodes: ["O14", "O15"], rationale: "Losartan contraindicated in pregnancy (teratogenic)" },
  // ── New: Thiazides ────────────────────────────────────────────
  { drugCode: "HCT", diagCodes: ["N18", "N17"], rationale: "Hydrochlorothiazide — reduced efficacy in severe CKD; monitor electrolytes" },
  // ── New: CCBs ─────────────────────────────────────────────────
  { drugCode: "NIF", diagCodes: ["I21"], rationale: "Nifedipine — short-acting form contraindicated in acute MI" },
  // ── New: Beta-blockers (non-selective) ────────────────────────
  { drugCode: "LAB", diagCodes: ["J45", "J44"], rationale: "Labetalol — caution in asthma/COPD (beta-2 blockade)" },
  // ── New: Sulfonylureas ────────────────────────────────────────
  { drugCode: "GLP", diagCodes: ["E10"], rationale: "Glipizide — hypoglycemia risk in T1DM; avoid monotherapy" },
  { drugCode: "GLP", diagCodes: ["N18", "N17"], rationale: "Glipizide — dose reduction in renal impairment" },
  // ── New: SGLT2 inhibitors ─────────────────────────────────────
  { drugCode: "CAN", diagCodes: ["N18", "N17"], rationale: "Canagliflozin — contraindicated if eGFR <30; risk of DKA" },
  { drugCode: "CAN", diagCodes: ["E10"], rationale: "Canagliflozin — increased DKA risk in T1DM" },
  // ── New: DPP-4 inhibitors ─────────────────────────────────────
  { drugCode: "DIA2", diagCodes: ["N18", "N17"], rationale: "Sitagliptin — dose adjustment in renal impairment" },
  // ── New: Insulin NPH ──────────────────────────────────────────
  { drugCode: "PCA", diagCodes: ["E10", "E11"], rationale: "NPH insulin — monitor for hypoglycemia, especially with renal/hepatic impairment" },
  // ── New: Tetracyclines ────────────────────────────────────────
  { drugCode: "DOX", diagCodes: ["N18", "N17"], rationale: "Doxycycline — avoid in severe renal impairment (accumulation)" },
  { drugCode: "DOX", diagCodes: ["K70", "K71", "K72", "K73", "K74"], rationale: "Doxycycline — hepatotoxicity risk in liver disease" },
  // ── New: Macrolides ───────────────────────────────────────────
  { drugCode: "CLI", diagCodes: ["I48"], rationale: "Clarithromycin — QT prolongation risk with antiarrhythmics" },
  // ── New: Carbapenems ──────────────────────────────────────────
  { drugCode: "MEM", diagCodes: ["G40"], rationale: "Meropenem — may lower seizure threshold, especially in CNS disorders" },
  // ── New: Vancomycin ───────────────────────────────────────────
  { drugCode: "VAN", diagCodes: ["N18", "N17"], rationale: "Vancomycin — nephrotoxic; monitor levels in renal impairment" },
  // ── New: Aminoglycosides ──────────────────────────────────────
  { drugCode: "AMG", diagCodes: ["N18", "N17"], rationale: "Amikacin — nephrotoxic and ototoxic; avoid in renal impairment" },
  // ── New: Antivirals ───────────────────────────────────────────
  { drugCode: "TDF", diagCodes: ["N18", "N17"], rationale: "Tenofovir — nephrotoxic; monitor renal function" },
  { drugCode: "3TC", diagCodes: ["N18", "N17"], rationale: "Lamivudine — dose adjustment in renal impairment" },
  // ── New: Anticoagulants ───────────────────────────────────────
  { drugCode: "WAF", diagCodes: ["K25", "K26", "K27", "K29", "N18"], rationale: "Warfarin — bleeding risk with ulcers/CKD; monitor INR" },
  { drugCode: "RIV", diagCodes: ["N18", "N17"], rationale: "Rivaroxaban — contraindicated in severe renal impairment (CrCl <15)" },
  { drugCode: "CLO", diagCodes: ["K25", "K26", "K27", "K29"], rationale: "Clopidogrel — caution with peptic ulcer disease" },
  // ── New: NSAIDs ───────────────────────────────────────────────
  { drugCode: "IBU", diagCodes: ["K25", "K26", "K27", "K29", "N18", "N17", "I50"], rationale: "Ibuprofen — contraindicated in peptic ulcer, CKD, and heart failure" },
  { drugCode: "NEC", diagCodes: ["K25", "K26", "K27", "K29", "N18", "N17"], rationale: "Diclofenac — GI and renal toxicity; avoid in ulcer/CKD" },
  // ── New: Anticonvulsants ──────────────────────────────────────
  { drugCode: "PHT", diagCodes: ["K70", "K71", "K72", "K73", "K74"], rationale: "Phenytoin — hepatotoxic; monitor LFTs" },
  { drugCode: "VAL", diagCodes: ["K70", "K71", "K72", "K73", "K74"], rationale: "Valproate — hepatotoxic; contraindicated in liver disease" },
  { drugCode: "LEV", diagCodes: [], rationale: "Levetiracetam — well-tolerated; adjust in renal impairment" },
  // ── New: Antipsychotics ───────────────────────────────────────
  { drugCode: "OLA", diagCodes: ["E11", "E78", "E66"], rationale: "Olanzapine — metabolic syndrome risk; monitor glucose and lipids" },
  { drugCode: "HAL", diagCodes: ["I50", "I21"], rationale: "Haloperidol — QT prolongation; caution in cardiac disease" },
  // ── New: Antidepressants ──────────────────────────────────────
  { drugCode: "SER", diagCodes: ["K25", "K26"], rationale: "Sertraline — bleeding risk with NSAIDs/antiplatelets; caution in ulcers" },
  { drugCode: "ESC", diagCodes: ["K25", "K26"], rationale: "Escitalopram — similar GI bleeding risk as sertraline" },
  // ── New: Corticosteroids ──────────────────────────────────────
  { drugCode: "PRED", diagCodes: ["E11", "K25", "K26", "K29"], rationale: "Prednisone — exacerbates diabetes and peptic ulcer; use PPI cover" },
  { drugCode: "DEX", diagCodes: ["E11", "E10", "K25", "K26"], rationale: "Dexamethasone — significant hyperglycemia and GI risk" },
  { drugCode: "HYD", diagCodes: ["E11", "E10"], rationale: "Hydrocortisone — stress-dose in adrenal insufficiency; monitor glucose" },
  // ── New: Antimalarials ────────────────────────────────────────
  { drugCode: "ART", diagCodes: ["D55"], rationale: "Artemether-lumefantrine — caution in G6PD deficiency (hemolysis risk)" },
  { drugCode: "PRQ", diagCodes: ["D55"], rationale: "Primaquine — contraindicated in G6PD deficiency (severe hemolysis)" },
  // ── New: Antituberculous ──────────────────────────────────────
  { drugCode: "H", diagCodes: ["K70", "K71", "K72", "K73", "K74"], rationale: "Isoniazid — hepatotoxic; monitor LFTs, give pyridoxine" },
  { drugCode: "R", diagCodes: ["K70", "K71", "K72", "K73", "K74"], rationale: "Rifampicin — hepatotoxic; induces CYP450, interacts with many drugs" },
  { drugCode: "Z", diagCodes: ["K70", "K71", "K72", "K73", "K74"], rationale: "Pyrazinamide — hepatotoxic; monitor LFTs" },
  { drugCode: "E", diagCodes: ["N18", "N17"], rationale: "Ethambutol — optic neuritis risk; dose adjust in renal impairment" },
  // ── New: Bronchodilators ──────────────────────────────────────
  { drugCode: "IPR", diagCodes: ["J45"], rationale: "Ipratropium — caution in glaucoma and urinary retention" },
  // ── New: PPIs ─────────────────────────────────────────────────
  { drugCode: "PNT", diagCodes: ["N18", "N17"], rationale: "Pantoprazole — generally safe in renal impairment; monitor Mg with long-term use" },
  // ── New: Antiemetics ──────────────────────────────────────────
  { drugCode: "MET2", diagCodes: ["K25", "K26"], rationale: "Metoclopramide — extrapyramidal symptoms risk; avoid in GI perforation" },
  // ── ADR-011: New drugs contraindications ──────────────────────
  { drugCode: "AZM", diagCodes: ["K70", "K71", "K72", "K73", "K74"], rationale: "Azithromycin — hepatotoxic; caution in liver disease" },
  { drugCode: "PCN", diagCodes: ["B20"], rationale: "Penicillin — monitor for rash in HIV patients" },
  { drugCode: "DAP", diagCodes: ["D55"], rationale: "Dapsone — contraindicated in G6PD deficiency (hemolysis)" },
  { drugCode: "VALA", diagCodes: ["N18", "N17"], rationale: "Valacyclovir — dose adjustment in renal impairment" },
  { drugCode: "LVT", diagCodes: [], rationale: "Levothyroxine — monitor thyroid function; adjust dose based on TSH" },
  { drugCode: "PTU", diagCodes: ["K70", "K71", "K72", "K73", "K74"], rationale: "Propylthiouracil — hepatotoxic; monitor LFTs" },
  { drugCode: "KET", diagCodes: ["K70", "K71", "K72", "K73", "K74"], rationale: "Ketoconazole — hepatotoxic; avoid in liver disease" },
  { drugCode: "METO", diagCodes: ["J45", "I50"], rationale: "Metoprolol — caution in asthma and heart failure" },
  { drugCode: "NIM", diagCodes: [], rationale: "Nimodipine — monitor BP; risk of hypotension" },
  { drugCode: "PRA", diagCodes: ["I95"], rationale: "Prazosin — may cause first-dose hypotension" },
  { drugCode: "MAG", diagCodes: ["N18", "N17"], rationale: "Magnesium sulfate — caution in renal impairment (hypermagnesemia risk)" },
  { drugCode: "DON", diagCodes: [], rationale: "Donepezil — caution in cardiac conduction disorders" },
  { drugCode: "MPH", diagCodes: [], rationale: "Methylphenidate — monitor BP and heart rate" },
  { drugCode: "SUM", diagCodes: ["I21", "I25"], rationale: "Sumatriptan — contraindicated in ischemic heart disease" },
  { drugCode: "BET", diagCodes: [], rationale: "Betahistine — caution in peptic ulcer disease" },
  { drugCode: "MOR5", diagCodes: ["J45"], rationale: "Morphine — respiratory depression in asthma" },
  { drugCode: "NAC", diagCodes: [], rationale: "N-acetylcysteine — anaphylactoid reactions possible" },
  { drugCode: "TOB", diagCodes: [], rationale: "Tobramycin eye drops — local irritation possible" },
  { drugCode: "PREDN", diagCodes: [], rationale: "Prednisolone eye drops — avoid in viral eye infections" },
  { drugCode: "FOL", diagCodes: [], rationale: "Folic acid — well-tolerated; no significant contraindications" },
];

/**
 * Dose ranges per drug code.
 * Covers all 50 drugs in the catalog.
 */
export function getDoseRange(drugCode: string): { minMg: number; maxMg: number; maxDailyMg: number; unit: string } | null {
  const all: Record<string, { minMg: number; maxMg: number; maxDailyMg: number; unit: string }> = {
    // Existing 22
    "ACE": { minMg: 2.5, maxMg: 10, maxDailyMg: 20, unit: "mg" },
    "MET": { minMg: 250, maxMg: 500, maxDailyMg: 2000, unit: "mg" },
    "ATR": { minMg: 10, maxMg: 20, maxDailyMg: 80, unit: "mg" },
    "OMP": { minMg: 10, maxMg: 20, maxDailyMg: 40, unit: "mg" },
    "LVF": { minMg: 250, maxMg: 500, maxDailyMg: 750, unit: "mg" },
    "PRC": { minMg: 325, maxMg: 500, maxDailyMg: 3000, unit: "mg" },
    "HEP": { minMg: 20, maxMg: 40, maxDailyMg: 80, unit: "mg" },
    "SAL": { minMg: 0.1, maxMg: 0.2, maxDailyMg: 0.8, unit: "mg" },
    "FUR": { minMg: 20, maxMg: 40, maxDailyMg: 80, unit: "mg" },
    "DIA": { minMg: 2, maxMg: 5, maxDailyMg: 10, unit: "mg" },
    "AMX": { minMg: 250, maxMg: 500, maxDailyMg: 1500, unit: "mg" },
    "CTR": { minMg: 500, maxMg: 1000, maxDailyMg: 2000, unit: "mg" },
    "MTZ": { minMg: 250, maxMg: 500, maxDailyMg: 1500, unit: "mg" },
    "CIP": { minMg: 250, maxMg: 500, maxDailyMg: 1000, unit: "mg" },
    "AML": { minMg: 2.5, maxMg: 5, maxDailyMg: 10, unit: "mg" },
    "BIS": { minMg: 2.5, maxMg: 5, maxDailyMg: 10, unit: "mg" },
    "ASP": { minMg: 80, maxMg: 80, maxDailyMg: 160, unit: "mg" },
    "INS": { minMg: 2, maxMg: 10, maxDailyMg: 40, unit: "U" },
    "OND": { minMg: 2, maxMg: 4, maxDailyMg: 12, unit: "mg" },
    "MOR": { minMg: 2, maxMg: 10, maxDailyMg: 30, unit: "mg" },
    "KCL": { minMg: 10, maxMg: 20, maxDailyMg: 60, unit: "mEq" },
    "RL": { minMg: 500, maxMg: 1000, maxDailyMg: 4000, unit: "mL" },
    // New — antihypertensives
    "LOS": { minMg: 25, maxMg: 50, maxDailyMg: 100, unit: "mg" },
    "HCT": { minMg: 12.5, maxMg: 25, maxDailyMg: 50, unit: "mg" },
    "NIF": { minMg: 5, maxMg: 10, maxDailyMg: 30, unit: "mg" },
    "LAB": { minMg: 20, maxMg: 100, maxDailyMg: 600, unit: "mg" },
    "ISO": { minMg: 2.5, maxMg: 5, maxDailyMg: 15, unit: "mg" },
    // New — antidiabetics
    "GLP": { minMg: 2.5, maxMg: 5, maxDailyMg: 20, unit: "mg" },
    "PIO": { minMg: 15, maxMg: 30, maxDailyMg: 45, unit: "mg" },
    "CAN": { minMg: 50, maxMg: 100, maxDailyMg: 300, unit: "mg" },
    "DIA2": { minMg: 25, maxMg: 100, maxDailyMg: 200, unit: "mg" },
    "PCA": { minMg: 10, maxMg: 40, maxDailyMg: 80, unit: "U" },
    // New — antibiotics oral
    "DOX": { minMg: 100, maxMg: 200, maxDailyMg: 200, unit: "mg" },
    "CLI": { minMg: 125, maxMg: 250, maxDailyMg: 500, unit: "mg" },
    "TIN": { minMg: 500, maxMg: 500, maxDailyMg: 1000, unit: "mg" },
    "CPM": { minMg: 100, maxMg: 200, maxDailyMg: 400, unit: "mg" },
    // New — antibiotics IV
    "MEM": { minMg: 500, maxMg: 1000, maxDailyMg: 3000, unit: "mg" },
    "VAN": { minMg: 500, maxMg: 1000, maxDailyMg: 4000, unit: "mg" },
    "AMG": { minMg: 250, maxMg: 500, maxDailyMg: 1000, unit: "mg" },
    // New — antivirals
    "ACT": { minMg: 200, maxMg: 400, maxDailyMg: 1200, unit: "mg" },
    "TDF": { minMg: 300, maxMg: 300, maxDailyMg: 300, unit: "mg" },
    "3TC": { minMg: 150, maxMg: 150, maxDailyMg: 300, unit: "mg" },
    // New — antifungal
    "FLC": { minMg: 100, maxMg: 200, maxDailyMg: 400, unit: "mg" },
    // New — anticoagulants / antiplatelets
    "WAF": { minMg: 1, maxMg: 5, maxDailyMg: 10, unit: "mg" },
    "RIV": { minMg: 10, maxMg: 20, maxDailyMg: 20, unit: "mg" },
    "CLO": { minMg: 75, maxMg: 75, maxDailyMg: 75, unit: "mg" },
    // New — statins
    "SIM": { minMg: 10, maxMg: 20, maxDailyMg: 40, unit: "mg" },
    "ROS": { minMg: 5, maxMg: 10, maxDailyMg: 20, unit: "mg" },
    // New — analgesics / NSAIDs
    "IBU": { minMg: 200, maxMg: 400, maxDailyMg: 1200, unit: "mg" },
    "NEC": { minMg: 25, maxMg: 50, maxDailyMg: 150, unit: "mg" },
    "TRM": { minMg: 25, maxMg: 50, maxDailyMg: 200, unit: "mg" },
    // New — anticonvulsants
    "PHT": { minMg: 100, maxMg: 300, maxDailyMg: 400, unit: "mg" },
    "VAL": { minMg: 200, maxMg: 400, maxDailyMg: 1200, unit: "mg" },
    "LEV": { minMg: 250, maxMg: 500, maxDailyMg: 1000, unit: "mg" },
    // New — antipsychotics
    "OLA": { minMg: 2.5, maxMg: 5, maxDailyMg: 20, unit: "mg" },
    "HAL": { minMg: 0.5, maxMg: 5, maxDailyMg: 20, unit: "mg" },
    // New — antidepressants
    "SER": { minMg: 25, maxMg: 50, maxDailyMg: 200, unit: "mg" },
    "ESC": { minMg: 5, maxMg: 10, maxDailyMg: 20, unit: "mg" },
    // New — corticosteroids
    "PRED": { minMg: 1, maxMg: 5, maxDailyMg: 60, unit: "mg" },
    "DEX": { minMg: 0.5, maxMg: 4, maxDailyMg: 24, unit: "mg" },
    "HYD": { minMg: 50, maxMg: 100, maxDailyMg: 400, unit: "mg" },
    // New — bronchodilators
    "IPR": { minMg: 10, maxMg: 20, maxDailyMg: 80, unit: "mcg" },
    // New — PPI / H2 blocker
    "PNT": { minMg: 20, maxMg: 40, maxDailyMg: 80, unit: "mg" },
    "RAN": { minMg: 50, maxMg: 100, maxDailyMg: 400, unit: "mg" },
    // New — antiemetic
    "MET2": { minMg: 5, maxMg: 10, maxDailyMg: 30, unit: "mg" },
    // New — electrolytes / fluids
    "CA": { minMg: 500, maxMg: 1000, maxDailyMg: 2000, unit: "mg" },
    "NS": { minMg: 250, maxMg: 500, maxDailyMg: 4000, unit: "mL" },
    // New — antimalarials
    "ART": { minMg: 1, maxMg: 1, maxDailyMg: 1, unit: "tab" },
    "PRQ": { minMg: 7.5, maxMg: 15, maxDailyMg: 30, unit: "mg" },
    // New — antituberculous
    "H": { minMg: 100, maxMg: 300, maxDailyMg: 500, unit: "mg" },
    "R": { minMg: 150, maxMg: 450, maxDailyMg: 600, unit: "mg" },
    "Z": { minMg: 500, maxMg: 1500, maxDailyMg: 2000, unit: "mg" },
    "E": { minMg: 400, maxMg: 800, maxDailyMg: 1200, unit: "mg" },
    // ADR-011: New drug dose ranges
    "AZM": { minMg: 250, maxMg: 500, maxDailyMg: 500, unit: "mg" },
    "PCN": { minMg: 1, maxMg: 4, maxDailyMg: 24, unit: "MU" },
    "DAP": { minMg: 50, maxMg: 100, maxDailyMg: 200, unit: "mg" },
    "VALA": { minMg: 500, maxMg: 1000, maxDailyMg: 3000, unit: "mg" },
    "LVT": { minMg: 25, maxMg: 100, maxDailyMg: 300, unit: "mcg" },
    "PTU": { minMg: 50, maxMg: 100, maxDailyMg: 300, unit: "mg" },
    "KET": { minMg: 200, maxMg: 400, maxDailyMg: 800, unit: "mg" },
    "METO": { minMg: 25, maxMg: 50, maxDailyMg: 200, unit: "mg" },
    "NIM": { minMg: 30, maxMg: 60, maxDailyMg: 180, unit: "mg" },
    "PRA": { minMg: 0.5, maxMg: 1, maxDailyMg: 20, unit: "mg" },
    "MAG": { minMg: 1, maxMg: 4, maxDailyMg: 8, unit: "g" },
    "DON": { minMg: 5, maxMg: 10, maxDailyMg: 23, unit: "mg" },
    "MPH": { minMg: 5, maxMg: 10, maxDailyMg: 60, unit: "mg" },
    "SUM": { minMg: 25, maxMg: 50, maxDailyMg: 200, unit: "mg" },
    "BET": { minMg: 8, maxMg: 16, maxDailyMg: 48, unit: "mg" },
    "MOR5": { minMg: 2.5, maxMg: 5, maxDailyMg: 15, unit: "mg" },
    "NAC": { minMg: 600, maxMg: 1400, maxDailyMg: 3000, unit: "mg" },
    "TOB": { minMg: 1, maxMg: 2, maxDailyMg: 6, unit: "drop" },
    "PREDN": { minMg: 1, maxMg: 2, maxDailyMg: 8, unit: "drop" },
    "FOL": { minMg: 1, maxMg: 5, maxDailyMg: 10, unit: "mg" },
  };
  return all[drugCode] ?? null;
}

export function checkDrugAllergy(drugCode: string, patientAllergies: string[]): string | null {
  const allergens = MED_ALLERGEN_MAP[drugCode];
  if (!allergens || allergens.length === 0) return null;
  for (const a of allergens) {
    if (patientAllergies.some(pa => pa.toLowerCase().includes(a.toLowerCase()))) {
      return `Patient has documented allergy to ${a} (${drugCode})`;
    }
  }
  return null;
}

export function checkDiagnosisContraindication(drugCode: string, diagnoses: Diagnosis[]): { contraindicated: boolean; warnings: string[] } {
  const warnings: string[] = [];
  for (const contra of DRUG_DIAGNOSIS_CONTRA) {
    if (contra.drugCode !== drugCode) continue;
    for (const dx of diagnoses) {
      if (contra.diagCodes.some(code => dx.code.startsWith(code))) {
        warnings.push(contra.rationale);
      }
    }
  }
  return { contraindicated: warnings.length > 0, warnings };
}

/**
 * Drug–drug interaction table.
 * Covers high-severity interactions among the 50-drug formulary.
 * Only clinically significant pairs are included; absence = no known interaction.
 */
export function checkDrugInteraction(
  newDrug: { code: string; name: string },
  existingMedications: Medication[],
): { severity: "none" | "minor" | "moderate" | "major" | "contraindicated"; description: string | null } {
  const INTERACTIONS: Record<string, Record<string, { severity: "minor" | "moderate" | "major" | "contraindicated"; desc: string }>> = {
    // ── Existing ──────────────────────────────────────────────────
    "ACE": {
      "DIA": { severity: "moderate", desc: "ACE inhibitors + Diazepam may potentiate hypotensive effects" },
      "FUR": { severity: "moderate", desc: "ACE inhibitors + Furosemide: monitor for hypotension and renal function" },
      "KCL": { severity: "major", desc: "ACE inhibitors + KCl: risk of hyperkalemia" },
    },
    "LOS": {
      "FUR": { severity: "moderate", desc: "Losartan + Furosemide: risk of hypotension and renal impairment" },
      "KCL": { severity: "major", desc: "Losartan + KCl: risk of hyperkalemia" },
      "IBU": { severity: "moderate", desc: "Losartan + Ibuprofen: NSAIDs may reduce antihypertensive effect and worsen renal function" },
      "NEC": { severity: "moderate", desc: "Losartan + Diclofenac: same NSAID-ARB interaction" },
    },
    "MET": { "FUR": { severity: "minor", desc: "Metformin + Furosemide may increase metformin levels" } },
    "LVF": { "DIA": { severity: "moderate", desc: "Fluoroquinolones + Diazepam may increase CNS effects" } },
    "FUR": {
      "ACE": { severity: "moderate", desc: "Furosemide + ACE inhibitors: monitor renal function" },
      "MET": { severity: "minor", desc: "Furosemide may increase Metformin levels" },
      "KCL": { severity: "moderate", desc: "Furosemide + KCl: monitor potassium levels" },
    },
    "DIA": {
      "ACE": { severity: "moderate", desc: "Diazepam + ACE inhibitors may potentiate hypotension" },
      "LVF": { severity: "moderate", desc: "Diazepam + Fluoroquinolones may increase CNS depression" },
      "MOR": { severity: "major", desc: "Diazepam + Morphine: risk of respiratory depression" },
      "TRM": { severity: "major", desc: "Diazepam + Tramadol: risk of respiratory depression and sedation" },
      "OLA": { severity: "moderate", desc: "Diazepam + Olanzapine: increased CNS depression" },
      "HAL": { severity: "moderate", desc: "Diazepam + Haloperidol: increased sedation" },
    },
    "HEP": {
      "PRC": { severity: "moderate", desc: "Enoxaparin + Paracetamol: monitor for bleeding risk" },
      "ASP": { severity: "major", desc: "Enoxaparin + Aspirin: increased bleeding risk" },
      "IBU": { severity: "major", desc: "Enoxaparin + Ibuprofen: increased bleeding risk" },
      "NEC": { severity: "major", desc: "Enoxaparin + Diclofenac: increased bleeding risk" },
      "CLO": { severity: "major", desc: "Enoxaparin + Clopidogrel: increased bleeding risk" },
      "WAF": { severity: "major", desc: "Enoxaparin + Warfarin: additive anticoagulant effect" },
      "RIV": { severity: "major", desc: "Enoxaparin + Rivaroxaban: doubled anticoagulant effect" },
    },
    "ASP": {
      "HEP": { severity: "major", desc: "Aspirin + Enoxaparin: increased bleeding risk" },
      "IBU": { severity: "moderate", desc: "Aspirin + Ibuprofen: reduced cardioprotective effect of aspirin" },
      "WAF": { severity: "major", desc: "Aspirin + Warfarin: synergistic bleeding risk" },
      "CLO": { severity: "major", desc: "Aspirin + Clopidogrel: dual antiplatelet — monitor for bleeding" },
      "RIV": { severity: "major", desc: "Aspirin + Rivaroxaban: increased bleeding risk" },
    },
    "MOR": {
      "DIA": { severity: "major", desc: "Morphine + Diazepam: risk of respiratory depression" },
      "TRM": { severity: "major", desc: "Morphine + Tramadol: additive opioid toxicity and seizure risk" },
      "OLA": { severity: "moderate", desc: "Morphine + Olanzapine: increased sedation" },
    },
    "CIP": { "DIA": { severity: "moderate", desc: "Ciprofloxacin + Diazepam: increased CNS effects" } },
    // ── New: QT-prolonging drugs ──────────────────────────────────
    "CLI": {
      "HAL": { severity: "major", desc: "Clarithromycin + Haloperidol: QT prolongation — risk of torsades" },
      "LEV": { severity: "moderate", desc: "Clarithromycin + Levetiracetam: monitor QT interval" },
    },
    "HAL": {
      "CLI": { severity: "major", desc: "Haloperidol + Clarithromycin: QT prolongation" },
      "CIP": { severity: "moderate", desc: "Haloperidol + Ciprofloxacin: QT prolongation" },
      "LVF": { severity: "moderate", desc: "Haloperidol + Levofloxacin: QT prolongation" },
    },
    // ── New: Serotonin syndrome risk ──────────────────────────────
    "SER": {
      "DIA": { severity: "moderate", desc: "Sertraline + Diazepam: increased sedation" },
      "TRM": { severity: "major", desc: "Sertraline + Tramadol: serotonin syndrome risk" },
      "OLA": { severity: "moderate", desc: "Sertraline + Olanzapine: increased sedation and metabolic risk" },
    },
    "ESC": {
      "TRM": { severity: "major", desc: "Escitalopram + Tramadol: serotonin syndrome risk" },
      "DIA": { severity: "moderate", desc: "Escitalopram + Diazepam: increased sedation" },
    },
    // ── New: Metabolic interactions ────────────────────────────────
    "OLA": {
      "GLP": { severity: "moderate", desc: "Olanzapine + Glipizide: olanzapine worsens glycemic control" },
      "CAN": { severity: "moderate", desc: "Olanzapine + Canagliflozin: counteracts glucose-lowering" },
      "MET": { severity: "moderate", desc: "Olanzapine + Metformin: olanzapine may increase insulin resistance" },
    },
    // ── New: CYP interactions ─────────────────────────────────────
    "R": {
      "CLO": { severity: "moderate", desc: "Rifampicin induces CYP2B6/CYP2C9 — reduces clopidogrel efficacy" },
      "WAF": { severity: "major", desc: "Rifampicin strongly induces CYP2C9 — reduces warfarin effect" },
      "CIP": { severity: "moderate", desc: "Rifampicin induces CYP — may reduce ciprofloxacin levels" },
      "PHT": { severity: "moderate", desc: "Rifampicin induces CYP — reduces phenytoin levels" },
      "VAL": { severity: "moderate", desc: "Rifampicin induces glucuronidation — reduces valproate levels" },
      "OLA": { severity: "moderate", desc: "Rifampicin induces CYP3A4 — reduces olanzapine levels" },
      "SER": { severity: "moderate", desc: "Rifampicin induces CYP — may reduce sertraline levels" },
      "CAN": { severity: "moderate", desc: "Rifampicin — complex metabolic interaction" },
      "DIA2": { severity: "moderate", desc: "Rifampicin — may reduce sitagliptin efficacy" },
      "H": { severity: "minor", desc: "Isoniazid + Rifampicin: standard TB combo; monitor LFTs" },
      "Z": { severity: "minor", desc: "Pyrazinamide + Rifampicin: standard TB combo; monitor LFTs" },
      "E": { severity: "minor", desc: "Ethambutol + Rifampicin: standard TB combo" },
    },
    // ── New: NSAID + antihypertensive ────────────────────────────
    "IBU": {
      "ACE": { severity: "moderate", desc: "Ibuprofen + ACE inhibitor: reduced antihypertensive effect, renal risk" },
      "LOS": { severity: "moderate", desc: "Ibuprofen + Losartan: reduced antihypertensive effect, renal risk" },
      "BIS": { severity: "moderate", desc: "Ibuprofen + Bisoprolol: may blunt antihypertensive effect" },
      "AML": { severity: "minor", desc: "Ibuprofen + Amlodipine: minor BP effect" },
    },
    "NEC": {
      "ACE": { severity: "moderate", desc: "Diclofenac + ACE inhibitor: renal risk, reduced BP control" },
      "LOS": { severity: "moderate", desc: "Diclofenac + Losartan: renal risk" },
    },
    // ── New: QT + QT ──────────────────────────────────────────────
    "ACT": { "CLI": { severity: "moderate", desc: "Acyclovir + Clarithromycin: monitor renal function" } },
    // ── New: Bleeding risk combos ─────────────────────────────────
    "WAF": {
      "ASP": { severity: "major", desc: "Warfarin + Aspirin: synergistic bleeding" },
      "HEP": { severity: "major", desc: "Warfarin + Enoxaparin: additive anticoagulation" },
      "IBU": { severity: "major", desc: "Warfarin + Ibuprofen: GI bleeding risk" },
      "NEC": { severity: "major", desc: "Warfarin + Diclofenac: GI bleeding risk" },
      "CLO": { severity: "major", desc: "Warfarin + Clopidogrel: high bleeding risk" },
      "RIV": { severity: "major", desc: "Warfarin + Rivaroxaban: DOAC + VKA — do not combine" },
    },
    "RIV": {
      "WAF": { severity: "major", desc: "Rivaroxaban + Warfarin: do not combine" },
      "ASP": { severity: "major", desc: "Rivaroxaban + Aspirin: increased bleeding" },
      "HEP": { severity: "major", desc: "Rivaroxaban + Enoxaparin: double anticoagulation" },
      "CLO": { severity: "major", desc: "Rivaroxaban + Clopidogrel: increased bleeding" },
    },
    // ── New: Renal toxicity ───────────────────────────────────────
    "VAN": { "AMG": { severity: "major", desc: "Vancomycin + Amikacin: additive nephrotoxicity and ototoxicity" } },
    "MEM": { "DIA": { severity: "moderate", desc: "Meropenem + Diazepam: may lower seizure threshold" } },
    // ── New: Electrolyte ──────────────────────────────────────────
    "HCT": { "FUR": { severity: "moderate", desc: "HCTZ + Furosemide: additive electrolyte depletion" },
      "KCL": { severity: "minor", desc: "HCTZ + KCl: often co-prescribed for potassium replacement" } },
    // ── ADR-011: New drug interactions ────────────────────────────
    "AZM": {
      "HEP": { severity: "moderate", desc: "Azithromycin + Enoxaparin: monitor for bleeding" },
      "WAF": { severity: "moderate", desc: "Azithromycin + Warfarin: may enhance anticoagulant effect" },
      "CLI": { severity: "moderate", desc: "Azithromycin + Clarithromycin: additive QT prolongation" },
    },
    "PCN": {
      "TDF": { severity: "moderate", desc: "Penicillin + Tenofovir: monitor renal function" },
      "HEP": { severity: "moderate", desc: "Penicillin + Enoxaparin: monitor for bleeding" },
    },
    "DAP": {
      "MET": { severity: "moderate", desc: "Dapsone + Metformin: increased methemoglobin risk" },
      "AZM": { severity: "minor", desc: "Dapsone + Azithromycin: monitor for hemolysis" },
    },
    "VALA": {
      "ARI": { severity: "minor", desc: "Valacyclovir + Allopurinol: increased valacyclovir levels" },
    },
    "LVT": {
      "WAF": { severity: "moderate", desc: "Levothyroxine + Warfarin: may enhance anticoagulant effect" },
      "IRON": { severity: "minor", desc: "Levothyroxine + Iron: reduced absorption; separate by 4h" },
    },
    "PTU": {
      "WAF": { severity: "moderate", desc: "PTU + Warfarin: monitor INR" },
      "IPH": { severity: "minor", desc: "PTU + Isoniazid: increased hepatotoxicity risk" },
    },
    "KET": {
      "WAF": { severity: "major", desc: "Ketoconazole + Warfarin: increased bleeding risk" },
      "CLO": { severity: "moderate", desc: "Ketoconazole + Clopidogrel: CYP3A4 inhibition" },
    },
    "METO": {
      "DIA": { severity: "moderate", desc: "Metoprolol + Diazepam: additive bradycardia" },
      "FUR": { severity: "minor", desc: "Metoprolol + Furosemide: monitor BP" },
      "IBU": { severity: "moderate", desc: "Metoprolol + Ibuprofen: reduced antihypertensive effect" },
    },
    "NIM": {
      "CLI": { severity: "moderate", desc: "Nimodipine + Clarithromycin: CYP3A4 inhibition increases nimodipine levels" },
      "WAF": { severity: "moderate", desc: "Nimodipine + Warfarin: monitor INR" },
    },
    "PRA": {
      "BIS": { severity: "moderate", desc: "Prazosin + Bisoprolol: additive hypotension" },
      "SILD": { severity: "major", desc: "Prazosin + Sildenafil: severe hypotension" },
    },
    "MAG": {
      "FUR": { severity: "minor", desc: "Magnesium + Furosemide: monitor electrolytes" },
      "ANT": { severity: "moderate", desc: "Magnesium + Antacids: hypermagnesemia risk" },
    },
    "DON": {
      "CLI": { severity: "moderate", desc: "Donepezil + Clarithromycin: CYP3A4 interaction" },
      "BIS": { severity: "minor", desc: "Donepezil + Beta-blockers: additive bradycardia" },
    },
    "MPH": {
      "MAOI": { severity: "major", desc: "Methylphenidate + MAOIs: hypertensive crisis" },
      "DIA": { severity: "moderate", desc: "Methylphenidate + Diazepam: opposing CNS effects" },
    },
    "SUM": {
      "CLI": { severity: "moderate", desc: "Sumatriptan + Clarithromycin: CYP3A4 interaction" },
      "SSRI": { severity: "moderate", desc: "Sumatriptan + SSRIs: serotonin syndrome risk" },
    },
    "BET": {
      "ASP": { severity: "minor", desc: "Betahistine + Aspirin: may reduce betahistine efficacy" },
    },
    "MOR5": {
      "DIA": { severity: "major", desc: "Morphine + Diazepam: respiratory depression" },
      "TRM": { severity: "major", desc: "Morphine + Tramadol: additive opioid toxicity" },
      "OLA": { severity: "moderate", desc: "Morphine + Olanzapine: increased sedation" },
    },
    "NAC": {
      " activated charcoal": { severity: "minor", desc: "NAC + Activated charcoal: reduced absorption" },
    },
    "TOB": { "HEP": { severity: "minor", desc: "Tobramycin eye drops — local use, minimal systemic interaction" } },
    "PREDN": { "IPR": { severity: "minor", desc: "Prednisolone eye drops — local use, minimal systemic interaction" } },
    "FOL": {
      "MET": { severity: "minor", desc: "Folic acid + Metformin: metformin may reduce folate levels" },
      "PHN": { severity: "minor", desc: "Folic acid + Phenytoin: may reduce anticonvulsant efficacy" },
    },
  };

  if (!INTERACTIONS[newDrug.code]) return { severity: "none", description: null };

  for (const existing of existingMedications) {
    const interaction = INTERACTIONS[newDrug.code]?.[existing.code];
    if (interaction) return { severity: interaction.severity, description: interaction.desc };
  }
  return { severity: "none", description: null };
}
