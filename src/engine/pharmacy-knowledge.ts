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
  // ADR-012: BPOM expansion allergens
  "RIS": [], "QUE": [], "CLP": [],
  "LIT": [], "CRB": [],
  "BUS": [], "ZOL": [],
  "GAB": [], "TPM": [], "LAM": [],
  "ACR": [], "GLA": [], "LIS": [],
  "CLN": [], "CLN3": [], "ERT": [], "CPX": [], "MOX": [], "LNZ": [], "COL": [],
  "MTX": [], "HCQ": [], "SZA": ["sulfonamide"],
  "DIG": [], "SPR": [], "FEN": [],
  "RAM": [], "RAM5": [], "LOS50": [], "AML10": [], "VER": [], "AMI": [], "NTG": [],
  "DEX05": [], "SUC": [],
  "BUD": [], "THE": [], "IPR2": [],
  "DDA": [], "CAL2": [], "OCT": [],
  "FLU": [], "TIM": [], "ATD": [], "OMX": [],
  "MUP": [], "HC1": [], "KET2": [], "CAL3": [],
  "IRON": [], "B12": [], "VK1": [], "FOL5": [],
  "KTR": ["NSAID", "propionic acid derivative"], "KET10": ["NSAID", "propionic acid derivative"],
  "PET": [], "FNT": [], "LIDO": [],
  "NS100": [], "NS50": [], "D5W": [], "D10": [],
  "CAG": [], "SBC": [],
  "HEP5": ["heparin"], "HEP10": ["heparin"],
  "CYC": [], "AZA": [],
  "TAM": [], "ALO": [], "ALO3": [],
  "LIDO2": [], "ADE": [],
  "GCG": [], "CAC": [],
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
  // ── ADR-012: BPOM expansion contraindications ─────────────────
  { drugCode: "RIS", diagCodes: ["K70", "K71"], rationale: "Risperidone — caution in liver impairment; monitor prolactin" },
  { drugCode: "QUE", diagCodes: ["K70", "K71"], rationale: "Quetiapine — hepatotoxic; avoid in severe hepatic impairment" },
  { drugCode: "CLP", diagCodes: ["J45"], rationale: "Chlorpromazine — may lower seizure threshold; caution in asthma" },
  { drugCode: "LIT", diagCodes: ["N18", "N17", "I50"], rationale: "Lithium — nephrotoxic and cardiotoxic; monitor levels in renal/cardiac disease" },
  { drugCode: "CRB", diagCodes: ["K70", "K71", "G40"], rationale: "Carbamazepine — hepatotoxic; may lower seizure threshold paradoxically" },
  { drugCode: "BUS", diagCodes: ["J45"], rationale: "Buspirone — caution in severe hepatic/renal impairment" },
  { drugCode: "ZOL", diagCodes: ["J45"], rationale: "Zolpidem — respiratory depression in severe COPD/asthma" },
  { drugCode: "GAB", diagCodes: ["N18", "N17"], rationale: "Gabapentin — dose adjustment in renal impairment" },
  { drugCode: "TPM", diagCodes: ["N18", "N17"], rationale: "Topiramate — dose adjustment in renal impairment; kidney stone risk" },
  { drugCode: "LAM", diagCodes: ["K70", "K71"], rationale: "Lamotrigine — hepatotoxic; Stevens-Johnson syndrome risk" },
  { drugCode: "ACR", diagCodes: ["K25", "K26", "K27"], rationale: "Acarbose — contraindicated in inflammatory bowel disease; caution with ulcers" },
  { drugCode: "GLA", diagCodes: [], rationale: "Insulin glargine — monitor blood glucose; risk of hypoglycemia" },
  { drugCode: "LIS", diagCodes: [], rationale: "Insulin lispro — monitor blood glucose; risk of hypoglycemia" },
  { drugCode: "CLN", diagCodes: ["K70", "K71", "N18"], rationale: "Clindamycin — hepatotoxic; risk of C. difficile colitis; dose adjust in renal impairment" },
  { drugCode: "ERT", diagCodes: ["N18", "N17"], rationale: "Ertapenem — may lower seizure threshold; dose adjust in renal impairment" },
  { drugCode: "CPX", diagCodes: ["N18", "N17"], rationale: "Cefpodoxime — dose adjustment in renal impairment" },
  { drugCode: "MOX", diagCodes: ["K70", "K71", "G40"], rationale: "Moxifloxacin — hepatotoxic; may lower seizure threshold; QT prolongation" },
  { drugCode: "LNZ", diagCodes: ["K70", "K71"], rationale: "Linezolid — hepatotoxic; monitor for serotonin syndrome with SSRIs" },
  { drugCode: "COL", diagCodes: ["N18", "N17"], rationale: "Colistin — nephrotoxic and neurotoxic; dose adjust in renal impairment" },
  { drugCode: "MTX", diagCodes: ["K70", "K71", "N18", "N17", "J45"], rationale: "Methotrexate — hepatotoxic, nephrotoxic; contraindicated in hepatic/renal impairment and severe respiratory disease" },
  { drugCode: "HCQ", diagCodes: ["G40"], rationale: "Hydroxychloroquine — may lower seizure threshold; retinal toxicity with long-term use" },
  { drugCode: "SZA", diagCodes: ["N18", "N17", "K70"], rationale: "Sulfasalazine — hepatotoxic and nephrotoxic; caution in renal/hepatic impairment" },
  { drugCode: "DIG", diagCodes: ["N18", "N17"], rationale: "Digoxin — narrow therapeutic index; nephrotoxicity increases risk of toxicity" },
  { drugCode: "SPR", diagCodes: ["N18", "N17", "E11"], rationale: "Spironolactone — hyperkalemia risk in renal impairment; anti-androgenic effects" },
  { drugCode: "FEN", diagCodes: ["N18", "N17", "K70"], rationale: "Fenofibrate — hepatotoxic and nephrotoxic; dose adjust in renal impairment" },
  { drugCode: "RAM", diagCodes: ["N18", "N17", "I95"], rationale: "Ramipril — monitor renal function and potassium; risk of hypotension" },
  { drugCode: "AMI", diagCodes: ["K70", "K71", "N18", "N17", "J45"], rationale: "Amiodarone — hepatotoxic, pulmonary toxicity; dose adjust in renal impairment" },
  { drugCode: "BUD", diagCodes: ["J45"], rationale: "Budesonide — caution in untreated fungal/viral eye infections; systemic absorption possible" },
  { drugCode: "THE", diagCodes: ["I21", "I25"], rationale: "Theophylline — narrow therapeutic index; cardiac arrhythmias at high levels" },
  { drugCode: "DDA", diagCodes: ["N18", "N17"], rationale: "Desmopressin — hyponatremia risk; dose adjust in renal impairment" },
  { drugCode: "CAL2", diagCodes: ["N18", "N17"], rationale: "Calcitriol — hypercalcemia risk; monitor calcium in renal impairment" },
  { drugCode: "OCT", diagCodes: ["E11", "E10"], rationale: "Octreotide — may alter glucose metabolism; caution in diabetes" },
  { drugCode: "FLU", diagCodes: [], rationale: "Fluorometholone eye drops — avoid in viral eye infections" },
  { drugCode: "TIM", diagCodes: ["J45", "I50"], rationale: "Timolol eye drops — systemic beta-blockade; caution in asthma and heart failure" },
  { drugCode: "MUP", diagCodes: [], rationale: "Mupirocin — local irritation; avoid in known allergy to polyethyleneglycol" },
  { drugCode: "HC1", diagCodes: [], rationale: "Hydrocortisone cream — avoid in untreated skin infections" },
  { drugCode: "KET2", diagCodes: [], rationale: "Ketoconazole cream — local irritation; avoid in known allergy" },
  { drugCode: "IRON", diagCodes: ["N18", "N17"], rationale: "Iron sucrose — risk of anaphylaxis; monitor in renal impairment" },
  { drugCode: "VK1", diagCodes: ["K70", "K71"], rationale: "Vitamin K1 — may interfere with warfarin anticoagulation" },
  { drugCode: "KET10", diagCodes: ["K25", "K26", "N18", "N17", "I50"], rationale: "Ketorolac — GI bleeding, nephrotoxicity; contraindicated in ulcer/CKD/heart failure" },
  { drugCode: "PET", diagCodes: ["J45", "G40"], rationale: "Pethidine — seizures at high doses; respiratory depression in asthma" },
  { drugCode: "FNT", diagCodes: ["J45", "G40"], rationale: "Fentanyl — respiratory depression; caution in asthma and seizure disorders" },
  { drugCode: "LIDO", diagCodes: [], rationale: "Lidocaine — cardiotoxic at high doses; avoid in known allergy" },
  { drugCode: "HEP5", diagCodes: ["D69", "N18"], rationale: "Heparin — bleeding risk in thrombocytopenia; monitor platelets" },
  { drugCode: "HEP10", diagCodes: ["D69", "N18"], rationale: "Heparin IV — bleeding risk; monitor aPTT closely" },
  { drugCode: "CYC", diagCodes: ["N18", "N17", "K70"], rationale: "Cyclosporine — nephrotoxic and hepatotoxic; monitor levels" },
  { drugCode: "AZA", diagCodes: ["N18", "N17", "K70"], rationale: "Azathioprine — hepatotoxic and myelosuppressive; monitor CBC and LFTs" },
  { drugCode: "TAM", diagCodes: ["I95"], rationale: "Tamsulosin — may cause orthostatic hypotension" },
  { drugCode: "ALO", diagCodes: ["D55"], rationale: "Allopurinol — risk of severe hypersensitivity in G6PD deficiency" },
  { drugCode: "LIDO2", diagCodes: ["I21"], rationale: "Lidocaine IV — cardiotoxic at high doses; monitor ECG" },
  { drugCode: "ADE", diagCodes: ["I48"], rationale: "Adenosine — may trigger bronchospasm; caution in asthma" },
  { drugCode: "GCG", diagCodes: ["E11", "E10"], rationale: "Glucagon — may cause vomiting; monitor glucose in diabetes" },
  { drugCode: "CAC", diagCodes: ["N18", "N17"], rationale: "Calcium chloride — tissue necrosis if extravasated; monitor cardiac function" },
  { drugCode: "SBC", diagCodes: ["N18", "N17"], rationale: "Sodium bicarbonate — metabolic alkalosis risk; caution in renal impairment" },
  { drugCode: "D5W", diagCodes: ["E11", "E10"], rationale: "Dextrose 5% — hyperglycemia risk in diabetes; monitor blood glucose" },
  { drugCode: "D10", diagCodes: ["E11", "E10"], rationale: "Dextrose 10% — hyperglycemia risk; monitor blood glucose closely" },
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
    // ADR-012: BPOM expansion dose ranges
    "RIS": { minMg: 0.5, maxMg: 4, maxDailyMg: 6, unit: "mg" },
    "QUE": { minMg: 25, maxMg: 100, maxDailyMg: 300, unit: "mg" },
    "CLP": { minMg: 25, maxMg: 100, maxDailyMg: 600, unit: "mg" },
    "LIT": { minMg: 300, maxMg: 900, maxDailyMg: 1800, unit: "mg" },
    "CRB": { minMg: 200, maxMg: 400, maxDailyMg: 1200, unit: "mg" },
    "BUS": { minMg: 5, maxMg: 10, maxDailyMg: 30, unit: "mg" },
    "ZOL": { minMg: 5, maxMg: 10, maxDailyMg: 10, unit: "mg" },
    "GAB": { minMg: 300, maxMg: 600, maxDailyMg: 3600, unit: "mg" },
    "TPM": { minMg: 25, maxMg: 50, maxDailyMg: 400, unit: "mg" },
    "LAM": { minMg: 25, maxMg: 100, maxDailyMg: 400, unit: "mg" },
    "ACR": { minMg: 50, maxMg: 100, maxDailyMg: 300, unit: "mg" },
    "GLA": { minMg: 10, maxMg: 40, maxDailyMg: 80, unit: "U" },
    "LIS": { minMg: 4, maxMg: 10, maxDailyMg: 40, unit: "U" },
    "CLN": { minMg: 150, maxMg: 300, maxDailyMg: 1800, unit: "mg" },
    "CLN3": { minMg: 300, maxMg: 600, maxDailyMg: 2400, unit: "mg" },
    "ERT": { minMg: 500, maxMg: 1000, maxDailyMg: 1000, unit: "mg" },
    "CPX": { minMg: 100, maxMg: 200, maxDailyMg: 400, unit: "mg" },
    "MOX": { minMg: 400, maxMg: 400, maxDailyMg: 400, unit: "mg" },
    "LNZ": { minMg: 600, maxMg: 600, maxDailyMg: 1200, unit: "mg" },
    "COL": { minMg: 50, maxMg: 150, maxDailyMg: 300, unit: "mg" },
    "MTX": { minMg: 2.5, maxMg: 15, maxDailyMg: 25, unit: "mg" },
    "HCQ": { minMg: 200, maxMg: 400, maxDailyMg: 600, unit: "mg" },
    "SZA": { minMg: 500, maxMg: 1000, maxDailyMg: 3000, unit: "mg" },
    "DIG": { minMg: 0.125, maxMg: 0.25, maxDailyMg: 0.5, unit: "mg" },
    "SPR": { minMg: 25, maxMg: 50, maxDailyMg: 200, unit: "mg" },
    "FEN": { minMg: 200, maxMg: 200, maxDailyMg: 200, unit: "mg" },
    "RAM": { minMg: 1.25, maxMg: 2.5, maxDailyMg: 10, unit: "mg" },
    "RAM5": { minMg: 2.5, maxMg: 5, maxDailyMg: 10, unit: "mg" },
    "LOS50": { minMg: 25, maxMg: 50, maxDailyMg: 100, unit: "mg" },
    "AML10": { minMg: 5, maxMg: 10, maxDailyMg: 10, unit: "mg" },
    "VER": { minMg: 40, maxMg: 80, maxDailyMg: 240, unit: "mg" },
    "AMI": { minMg: 200, maxMg: 400, maxDailyMg: 600, unit: "mg" },
    "NTG": { minMg: 0.3, maxMg: 0.6, maxDailyMg: 1.5, unit: "mg" },
    "DEX05": { minMg: 0.5, maxMg: 2, maxDailyMg: 8, unit: "mg" },
    "SUC": { minMg: 1000, maxMg: 2000, maxDailyMg: 8000, unit: "mg" },
    "BUD": { minMg: 0.2, maxMg: 0.8, maxDailyMg: 1.6, unit: "mg" },
    "THE": { minMg: 100, maxMg: 200, maxDailyMg: 600, unit: "mg" },
    "IPR2": { minMg: 0.5, maxMg: 1, maxDailyMg: 2, unit: "mg" },
    "DDA": { minMg: 10, maxMg: 20, maxDailyMg: 40, unit: "mcg" },
    "CAL2": { minMg: 0.25, maxMg: 0.5, maxDailyMg: 1, unit: "mcg" },
    "OCT": { minMg: 50, maxMg: 100, maxDailyMg: 300, unit: "mcg" },
    "FLU": { minMg: 1, maxMg: 2, maxDailyMg: 6, unit: "drop" },
    "TIM": { minMg: 1, maxMg: 2, maxDailyMg: 4, unit: "drop" },
    "ATD": { minMg: 1, maxMg: 2, maxDailyMg: 6, unit: "drop" },
    "OMX": { minMg: 1, maxMg: 2, maxDailyMg: 3, unit: "spray" },
    "MUP": { minMg: 1, maxMg: 2, maxDailyMg: 3, unit: "apply" },
    "HC1": { minMg: 1, maxMg: 2, maxDailyMg: 3, unit: "apply" },
    "KET2": { minMg: 1, maxMg: 2, maxDailyMg: 3, unit: "apply" },
    "KTR": { minMg: 15, maxMg: 30, maxDailyMg: 120, unit: "mg" },
    "CAL3": { minMg: 1, maxMg: 3, maxDailyMg: 5, unit: "apply" },
    "IRON": { minMg: 100, maxMg: 200, maxDailyMg: 200, unit: "mg" },
    "B12": { minMg: 500, maxMg: 1000, maxDailyMg: 2000, unit: "mcg" },
    "VK1": { minMg: 5, maxMg: 10, maxDailyMg: 20, unit: "mg" },
    "FOL5": { minMg: 1, maxMg: 5, maxDailyMg: 15, unit: "mg" },
    "KET10": { minMg: 10, maxMg: 20, maxDailyMg: 80, unit: "mg" },
    "PET": { minMg: 25, maxMg: 50, maxDailyMg: 200, unit: "mg" },
    "FNT": { minMg: 25, maxMg: 100, maxDailyMg: 400, unit: "mcg" },
    "LIDO": { minMg: 1, maxMg: 2, maxDailyMg: 4, unit: "ml" },
    "NS100": { minMg: 50, maxMg: 100, maxDailyMg: 2000, unit: "ml" },
    "NS50": { minMg: 25, maxMg: 50, maxDailyMg: 1000, unit: "ml" },
    "D5W": { minMg: 250, maxMg: 500, maxDailyMg: 3000, unit: "ml" },
    "D10": { minMg: 125, maxMg: 250, maxDailyMg: 1000, unit: "ml" },
    "CAG": { minMg: 5, maxMg: 10, maxDailyMg: 20, unit: "ml" },
    "SBC": { minMg: 25, maxMg: 50, maxDailyMg: 150, unit: "ml" },
    "HEP5": { minMg: 2500, maxMg: 5000, maxDailyMg: 10000, unit: "IU" },
    "HEP10": { minMg: 5000, maxMg: 10000, maxDailyMg: 20000, unit: "IU" },
    "CYC": { minMg: 50, maxMg: 100, maxDailyMg: 250, unit: "mg" },
    "AZA": { minMg: 25, maxMg: 50, maxDailyMg: 150, unit: "mg" },
    "TAM": { minMg: 0.2, maxMg: 0.4, maxDailyMg: 0.8, unit: "mg" },
    "ALO": { minMg: 100, maxMg: 300, maxDailyMg: 600, unit: "mg" },
    "ALO3": { minMg: 100, maxMg: 300, maxDailyMg: 600, unit: "mg" },
    "LIDO2": { minMg: 1, maxMg: 2, maxDailyMg: 3, unit: "ml" },
    "ADE": { minMg: 6, maxMg: 12, maxDailyMg: 12, unit: "mg" },
    "GCG": { minMg: 1, maxMg: 1, maxDailyMg: 1, unit: "mg" },
    "CAC": { minMg: 5, maxMg: 10, maxDailyMg: 20, unit: "ml" },
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
