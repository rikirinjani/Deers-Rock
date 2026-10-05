/**
 * Drug catalog — Indonesian INN-based generic drug database.
 *
 * Every entry is a stable, deterministic constant. No RNG, no clock dependency.
 * Codes are 3-letter uppercase abbreviations (e.g. "LOS" = Losartan).
 * Supply codes follow the existing "MED-XXX" convention in central-supply.ts.
 *
 * Covers 73 drugs across 24 categories.
 * Existing 22 codes preserved for backward-compatibility with all downstream tables.
 */

export type DrugCategory =
  | "antihypertensive" | "antidiabetic" | "antibiotic" | "antiviral"
  | "antifungal" | "anticoagulant" | "antiplatelet" | "statin"
  | "analgesic" | "antipyretic" | "nsaid" | "opioid"
  | "anticonvulsant" | "anxiolytic" | "antipsychotic" | "antidepressant"
  | "bronchodilator" | "corticosteroid" | "diuretic"
  | "antiemetic" | "ppi" | "h2blocker"
  | "antimalarial" | "antituberculous" | "antivenom" | "vaccine"
  | "electrolyte" | "fluid" | "blood_product" | "other";

export type Route = "PO" | "IV" | "IM" | "SC" | "INH" | "PR" | "SL" | "TOP";

export interface DrugEntry {
  /** 3-letter generic code used throughout the engine */
  code: string;
  /** Indonesian INN name (e.g. "Losartan 50mg") */
  innName: string;
  category: DrugCategory;
  dose: string;
  route: Route;
  /** Central supply key (e.g. "MED-LOS") */
  supplyCode: string;
  /** Acquisition cost per unit in IDR (e-catalogue flat prices) */
  costIdr: number;
  /** Allergen groups for allergy checking */
  allergens: string[];
  /** Dose range in mg (or equivalent unit); null = use default per category */
  minMg?: number;
  maxMg?: number;
  maxDailyMg?: number;
  /** Clinical notes for contraindication engine */
  classTag?: string;
}

export const DRUG_CATALOG: DrugEntry[] = [
  // ═══════════════════════════════════════════════════════════════
  // EXISTING 22 DRUGS — codes preserved for backward-compatibility
  // ═══════════════════════════════════════════════════════════════
  { code: "ACE", innName: "Enalapril 5mg", category: "antihypertensive", dose: "5 mg", route: "PO", supplyCode: "MED-ACE", costIdr: 500, allergens: ["ACE inhibitor"], classTag: "ace_inhibitor", minMg: 2.5, maxMg: 10, maxDailyMg: 20 },
  { code: "MET", innName: "Metformin 500mg", category: "antidiabetic", dose: "500 mg", route: "PO", supplyCode: "MED-MET", costIdr: 300, allergens: [], classTag: "biguanide", minMg: 250, maxMg: 500, maxDailyMg: 2000 },
  { code: "ATR", innName: "Atorvastatin 20mg", category: "statin", dose: "20 mg", route: "PO", supplyCode: "MED-ATR", costIdr: 1000, allergens: ["statin"], classTag: "statin", minMg: 10, maxMg: 20, maxDailyMg: 80 },
  { code: "OMP", innName: "Omeprazole 20mg", category: "ppi", dose: "20 mg", route: "PO", supplyCode: "MED-OMP", costIdr: 500, allergens: [], classTag: "ppi", minMg: 10, maxMg: 20, maxDailyMg: 40 },
  { code: "LVF", innName: "Levofloxacin 500mg", category: "antibiotic", dose: "500 mg", route: "IV", supplyCode: "MED-LVF", costIdr: 5000, allergens: ["fluoroquinolone"], classTag: "fluoroquinolone", minMg: 250, maxMg: 500, maxDailyMg: 750 },
  { code: "PRC", innName: "Paracetamol 500mg", category: "antipyretic", dose: "500 mg", route: "PO", supplyCode: "MED-PRC", costIdr: 200, allergens: [], classTag: "analgesic_antipyretic", minMg: 325, maxMg: 500, maxDailyMg: 3000 },
  { code: "HEP", innName: "Enoxaparin 40mg", category: "anticoagulant", dose: "40 mg", route: "SC", supplyCode: "MED-HEP", costIdr: 30000, allergens: ["heparin", "LMWH"], classTag: "lmwh", minMg: 20, maxMg: 40, maxDailyMg: 80 },
  { code: "SAL", innName: "Salbutamol Inhaler", category: "bronchodilator", dose: "100 mcg", route: "INH", supplyCode: "MED-SAL", costIdr: 50000, allergens: [], classTag: "saba", minMg: 0.1, maxMg: 0.2, maxDailyMg: 0.8 },
  { code: "FUR", innName: "Furosemide 40mg", category: "diuretic", dose: "40 mg", route: "IV", supplyCode: "MED-FUR", costIdr: 500, allergens: ["sulfonamide"], classTag: "loop_diuretic", minMg: 20, maxMg: 40, maxDailyMg: 80 },
  { code: "DIA", innName: "Diazepam 5mg", category: "anxiolytic", dose: "5 mg", route: "PO", supplyCode: "MED-DIA", costIdr: 300, allergens: ["benzodiazepine"], classTag: "benzodiazepine", minMg: 2, maxMg: 5, maxDailyMg: 10 },
  { code: "AMX", innName: "Amoxicillin 500mg", category: "antibiotic", dose: "500 mg", route: "PO", supplyCode: "MED-AMX", costIdr: 500, allergens: ["penicillin", "amoxicillin"], classTag: "penicillin", minMg: 250, maxMg: 500, maxDailyMg: 1500 },
  { code: "CTR", innName: "Ceftriaxone 1g", category: "antibiotic", dose: "1 g", route: "IV", supplyCode: "MED-CTR", costIdr: 15000, allergens: ["cephalosporin", "ceftriaxone"], classTag: "cephalosporin", minMg: 500, maxMg: 1000, maxDailyMg: 2000 },
  { code: "MTZ", innName: "Metronidazole 500mg", category: "antibiotic", dose: "500 mg", route: "IV", supplyCode: "MED-MTZ", costIdr: 2000, allergens: ["nitroimidazole"], classTag: "nitroimidazole", minMg: 250, maxMg: 500, maxDailyMg: 1500 },
  { code: "CIP", innName: "Ciprofloxacin 500mg", category: "antibiotic", dose: "500 mg", route: "PO", supplyCode: "MED-CIP", costIdr: 2000, allergens: ["fluoroquinolone", "ciprofloxacin"], classTag: "fluoroquinolone", minMg: 250, maxMg: 500, maxDailyMg: 1000 },
  { code: "AML", innName: "Amlodipine 5mg", category: "antihypertensive", dose: "5 mg", route: "PO", supplyCode: "MED-AML", costIdr: 500, allergens: [], classTag: "ccb", minMg: 2.5, maxMg: 5, maxDailyMg: 10 },
  { code: "BIS", innName: "Bisoprolol 5mg", category: "antihypertensive", dose: "5 mg", route: "PO", supplyCode: "MED-BIS", costIdr: 500, allergens: [], classTag: "beta_blocker", minMg: 2.5, maxMg: 5, maxDailyMg: 10 },
  { code: "ASP", innName: "Aspirin 80mg", category: "antiplatelet", dose: "80 mg", route: "PO", supplyCode: "MED-ASP", costIdr: 100, allergens: ["aspirin", "NSAID", "salicylate"], classTag: "antiplatelet", minMg: 80, maxMg: 80, maxDailyMg: 160 },
  { code: "INS", innName: "Insulin Regular 10U", category: "antidiabetic", dose: "10 U", route: "SC", supplyCode: "MED-INS", costIdr: 20000, allergens: [], classTag: "regular_insulin", minMg: 2, maxMg: 10, maxDailyMg: 40 },
  { code: "OND", innName: "Ondansetron 4mg", category: "antiemetic", dose: "4 mg", route: "IV", supplyCode: "MED-OND", costIdr: 5000, allergens: ["ondansetron"], classTag: "5ht3_antagonist", minMg: 2, maxMg: 4, maxDailyMg: 12 },
  { code: "MOR", innName: "Morphine 10mg", category: "opioid", dose: "10 mg", route: "IV", supplyCode: "MED-MOR", costIdr: 5000, allergens: ["morphine", "opioid"], classTag: "opioid", minMg: 2, maxMg: 10, maxDailyMg: 30 },
  { code: "KCL", innName: "KCl 20mEq", category: "electrolyte", dose: "20 mEq", route: "IV", supplyCode: "MED-KCL", costIdr: 3000, allergens: [], classTag: "potassium", minMg: 10, maxMg: 20, maxDailyMg: 60 },
  { code: "RL", innName: "Ringer's Lactate IV", category: "fluid", dose: "1000 mL", route: "IV", supplyCode: "MED-RL", costIdr: 15000, allergens: [], classTag: "crystalloid", minMg: 500, maxMg: 1000, maxDailyMg: 4000 },

  // ═══════════════════════════════════════════════════════════════
  // NEW DRUGS 23–50
  // ═══════════════════════════════════════════════════════════════

  // ── Antihypertensives ──────────────────────────────────────────
  { code: "LOS", innName: "Losartan 50mg", category: "antihypertensive", dose: "50 mg", route: "PO", supplyCode: "MED-LOS", costIdr: 1500, allergens: [], classTag: "arb", minMg: 25, maxMg: 50, maxDailyMg: 100 },
  { code: "HCT", innName: "Hydrochlorothiazide 25mg", category: "antihypertensive", dose: "25 mg", route: "PO", supplyCode: "MED-HCT", costIdr: 400, allergens: ["sulfonamide"], classTag: "thiazide", minMg: 12.5, maxMg: 25, maxDailyMg: 50 },
  { code: "NIF", innName: "Nifedipine 10mg", category: "antihypertensive", dose: "10 mg", route: "PO", supplyCode: "MED-NIF", costIdr: 600, allergens: [], classTag: "ccb", minMg: 5, maxMg: 10, maxDailyMg: 30 },
  { code: "LAB", innName: "Labetalol 100mg", category: "antihypertensive", dose: "100 mg", route: "IV", supplyCode: "MED-LAB", costIdr: 4000, allergens: [], classTag: "beta_blocker", minMg: 20, maxMg: 100, maxDailyMg: 600 },
  { code: "ISO", innName: "Isosorbide dinitrate 5mg", category: "antihypertensive", dose: "5 mg", route: "SL", supplyCode: "MED-ISO", costIdr: 800, allergens: [], classTag: "nitrate", minMg: 2.5, maxMg: 5, maxDailyMg: 15 },

  // ── Antidiabetics ──────────────────────────────────────────────
  { code: "GLP", innName: "Glipizide 5mg", category: "antidiabetic", dose: "5 mg", route: "PO", supplyCode: "MED-GLP", costIdr: 600, allergens: [], classTag: "sulfonylurea", minMg: 2.5, maxMg: 5, maxDailyMg: 20 },
  { code: "PIO", innName: "Pioglitazone 30mg", category: "antidiabetic", dose: "30 mg", route: "PO", supplyCode: "MED-PIO", costIdr: 3000, allergens: [], classTag: "thiazolidinedione", minMg: 15, maxMg: 30, maxDailyMg: 45 },
  { code: "CAN", innName: "Canagliflozin 100mg", category: "antidiabetic", dose: "100 mg", route: "PO", supplyCode: "MED-CAN", costIdr: 15000, allergens: [], classTag: "sglt2_inhibitor", minMg: 50, maxMg: 100, maxDailyMg: 300 },
  { code: "DIA2", innName: "Sitagliptin 100mg", category: "antidiabetic", dose: "100 mg", route: "PO", supplyCode: "MED-DIA2", costIdr: 12000, allergens: [], classTag: "dpp4_inhibitor", minMg: 25, maxMg: 100, maxDailyMg: 200 },
  { code: "PCA", innName: "Insulin NPH 40U", category: "antidiabetic", dose: "40 U", route: "SC", supplyCode: "MED-PCA", costIdr: 25000, allergens: [], classTag: "nph_insulin", minMg: 10, maxMg: 40, maxDailyMg: 80 },

  // ── Antibiotics (oral) ─────────────────────────────────────────
  { code: "DOX", innName: "Doxycycline 100mg", category: "antibiotic", dose: "100 mg", route: "PO", supplyCode: "MED-DOX", costIdr: 2000, allergens: [], classTag: "tetracycline", minMg: 100, maxMg: 200, maxDailyMg: 200 },
  { code: "CLI", innName: "Clarithromycin 250mg", category: "antibiotic", dose: "250 mg", route: "PO", supplyCode: "MED-CLI", costIdr: 4000, allergens: [], classTag: "macrolide", minMg: 125, maxMg: 250, maxDailyMg: 500 },
  { code: "TIN", innName: "Tinidazole 500mg", category: "antibiotic", dose: "500 mg", route: "PO", supplyCode: "MED-TIN", costIdr: 1500, allergens: ["nitroimidazole"], classTag: "nitroimidazole", minMg: 500, maxMg: 500, maxDailyMg: 1000 },
  { code: "CPM", innName: "Cefixime 200mg", category: "antibiotic", dose: "200 mg", route: "PO", supplyCode: "MED-CPM", costIdr: 5000, allergens: ["cephalosporin"], classTag: "cephalosporin", minMg: 100, maxMg: 200, maxDailyMg: 400 },

  // ── Antibiotics (IV) ───────────────────────────────────────────
  { code: "MEM", innName: "Meropenem 500mg", category: "antibiotic", dose: "500 mg", route: "IV", supplyCode: "MED-MEM", costIdr: 45000, allergens: [], classTag: "carbapenem", minMg: 500, maxMg: 1000, maxDailyMg: 3000 },
  { code: "VAN", innName: "Vancomycin 500mg", category: "antibiotic", dose: "500 mg", route: "IV", supplyCode: "MED-VAN", costIdr: 55000, allergens: [], classTag: "glycopeptide", minMg: 500, maxMg: 1000, maxDailyMg: 4000 },
  { code: "AMG", innName: "Amikacin 250mg", category: "antibiotic", dose: "250 mg", route: "IM", supplyCode: "MED-AMG", costIdr: 12000, allergens: [], classTag: "aminoglycoside", minMg: 250, maxMg: 500, maxDailyMg: 1000 },

  // ── Antivirals ─────────────────────────────────────────────────
  { code: "ACT", innName: "Acyclovir 400mg", category: "antiviral", dose: "400 mg", route: "PO", supplyCode: "MED-ACT", costIdr: 3000, allergens: [], classTag: "antiviral", minMg: 200, maxMg: 400, maxDailyMg: 1200 },
  { code: "TDF", innName: "Tenofovir 300mg", category: "antiviral", dose: "300 mg", route: "PO", supplyCode: "MED-TDF", costIdr: 25000, allergens: [], classTag: "nt analogue", minMg: 300, maxMg: 300, maxDailyMg: 300 },
  { code: "3TC", innName: "Lamivudine 150mg", category: "antiviral", dose: "150 mg", route: "PO", supplyCode: "MED-3TC", costIdr: 20000, allergens: [], classTag: "nt analogue", minMg: 150, maxMg: 150, maxDailyMg: 300 },

  // ── Antifungals ────────────────────────────────────────────────
  { code: "FLC", innName: "Fluconazole 200mg", category: "antifungal", dose: "200 mg", route: "PO", supplyCode: "MED-FLC", costIdr: 8000, allergens: [], classTag: "azole", minMg: 100, maxMg: 200, maxDailyMg: 400 },

  // ── Anticoagulants ─────────────────────────────────────────────
  { code: "WAF", innName: "Warfarin 5mg", category: "anticoagulant", dose: "5 mg", route: "PO", supplyCode: "MED-WAF", costIdr: 1000, allergens: [], classTag: "vitamin_k_antagonist", minMg: 1, maxMg: 5, maxDailyMg: 10 },
  { code: "RIV", innName: "Rivaroxaban 20mg", category: "anticoagulant", dose: "20 mg", route: "PO", supplyCode: "MED-RIV", costIdr: 35000, allergens: [], classTag: "factor_xa_inhibitor", minMg: 10, maxMg: 20, maxDailyMg: 20 },

  // ── Antiplatelets ──────────────────────────────────────────────
  { code: "CLO", innName: "Clopidogrel 75mg", category: "antiplatelet", dose: "75 mg", route: "PO", supplyCode: "MED-CLO", costIdr: 8000, allergens: [], classTag: "p2y12_inhibitor", minMg: 75, maxMg: 75, maxDailyMg: 75 },

  // ── Statins ────────────────────────────────────────────────────
  { code: "SIM", innName: "Simvastatin 20mg", category: "statin", dose: "20 mg", route: "PO", supplyCode: "MED-SIM", costIdr: 800, allergens: ["statin"], classTag: "statin", minMg: 10, maxMg: 20, maxDailyMg: 40 },
  { code: "ROS", innName: "Rosuvastatin 10mg", category: "statin", dose: "10 mg", route: "PO", supplyCode: "MED-ROS", costIdr: 5000, allergens: ["statin"], classTag: "statin", minMg: 5, maxMg: 10, maxDailyMg: 20 },

  // ── Analgesics / NSAIDs ────────────────────────────────────────
  { code: "IBU", innName: "Ibuprofen 400mg", category: "nsaid", dose: "400 mg", route: "PO", supplyCode: "MED-IBU", costIdr: 400, allergens: ["NSAID", "propionic acid derivative"], classTag: "nsaid", minMg: 200, maxMg: 400, maxDailyMg: 1200 },
  { code: "NEC", innName: "Diclofenac 50mg", category: "nsaid", dose: "50 mg", route: "PO", supplyCode: "MED-NEC", costIdr: 500, allergens: ["NSAID", "fenamate"], classTag: "nsaid", minMg: 25, maxMg: 50, maxDailyMg: 150 },
  { code: "TRM", innName: "Tramadol 50mg", category: "opioid", dose: "50 mg", route: "PO", supplyCode: "MED-TRM", costIdr: 2000, allergens: [], classTag: "opioid", minMg: 25, maxMg: 50, maxDailyMg: 200 },

  // ── Anticonvulsants ────────────────────────────────────────────
  { code: "PHT", innName: "Phenytoin 100mg", category: "anticonvulsant", dose: "100 mg", route: "PO", supplyCode: "MED-PHT", costIdr: 3000, allergens: [], classTag: "hydantoin", minMg: 100, maxMg: 300, maxDailyMg: 400 },
  { code: "VAL", innName: "Valproate 200mg", category: "anticonvulsant", dose: "200 mg", route: "PO", supplyCode: "MED-VAL", costIdr: 2500, allergens: [], classTag: "valproate", minMg: 200, maxMg: 400, maxDailyMg: 1200 },
  { code: "LEV", innName: "Levetiracetam 500mg", category: "anticonvulsant", dose: "500 mg", route: "PO", supplyCode: "MED-LEV", costIdr: 12000, allergens: [], classTag: "anticonvulsant", minMg: 250, maxMg: 500, maxDailyMg: 1000 },

  // ── Antipsychotics ─────────────────────────────────────────────
  { code: "OLA", innName: "Olanzapine 5mg", category: "antipsychotic", dose: "5 mg", route: "PO", supplyCode: "MED-OLA", costIdr: 15000, allergens: [], classTag: "atypical_antipsychotic", minMg: 2.5, maxMg: 5, maxDailyMg: 20 },
  { code: "HAL", innName: "Haloperidol 5mg", category: "antipsychotic", dose: "5 mg", route: "IM", supplyCode: "MED-HAL", costIdr: 5000, allergens: [], classTag: "typical_antipsychotic", minMg: 0.5, maxMg: 5, maxDailyMg: 20 },

  // ── Antidepressants ────────────────────────────────────────────
  { code: "SER", innName: "Sertraline 50mg", category: "antidepressant", dose: "50 mg", route: "PO", supplyCode: "MED-SER", costIdr: 12000, allergens: [], classTag: "ssri", minMg: 25, maxMg: 50, maxDailyMg: 200 },
  { code: "ESC", innName: "Escitalopram 10mg", category: "antidepressant", dose: "10 mg", route: "PO", supplyCode: "MED-ESC", costIdr: 18000, allergens: [], classTag: "ssri", minMg: 5, maxMg: 10, maxDailyMg: 20 },

  // ── Corticosteroids ────────────────────────────────────────────
  { code: "PRED", innName: "Prednisone 5mg", category: "corticosteroid", dose: "5 mg", route: "PO", supplyCode: "MED-PRED", costIdr: 500, allergens: [], classTag: "corticosteroid", minMg: 1, maxMg: 5, maxDailyMg: 60 },
  { code: "DEX", innName: "Dexamethasone 4mg", category: "corticosteroid", dose: "4 mg", route: "IV", supplyCode: "MED-DEX", costIdr: 3000, allergens: [], classTag: "corticosteroid", minMg: 0.5, maxMg: 4, maxDailyMg: 24 },
  { code: "HYD", innName: "Hydrocortisone 100mg", category: "corticosteroid", dose: "100 mg", route: "IV", supplyCode: "MED-HYD", costIdr: 8000, allergens: [], classTag: "corticosteroid", minMg: 50, maxMg: 100, maxDailyMg: 400 },

  // ── Bronchodilators ────────────────────────────────────────────
  { code: "IPR", innName: "Ipratropium bromide 20mcg", category: "bronchodilator", dose: "20 mcg", route: "INH", supplyCode: "MED-IPR", costIdr: 15000, allergens: [], classTag: "ipi trope", minMg: 10, maxMg: 20, maxDailyMg: 80 },

  // ── PPIs / H2 Blockers ─────────────────────────────────────────
  { code: "PNT", innName: "Pantoprazole 40mg", category: "ppi", dose: "40 mg", route: "IV", supplyCode: "MED-PNT", costIdr: 5000, allergens: [], classTag: "ppi", minMg: 20, maxMg: 40, maxDailyMg: 80 },
  { code: "RAN", innName: "Ranitidine 100mg", category: "h2blocker", dose: "100 mg", route: "IV", supplyCode: "MED-RAN", costIdr: 1500, allergens: [], classTag: "h2_blocker", minMg: 50, maxMg: 100, maxDailyMg: 400 },

  // ── Antiemetics ────────────────────────────────────────────────
  { code: "MET2", innName: "Metoclopramide 10mg", category: "antiemetic", dose: "10 mg", route: "IV", supplyCode: "MED-MET2", costIdr: 2000, allergens: [], classTag: "d2_antagonist", minMg: 5, maxMg: 10, maxDailyMg: 30 },

  // ── Electrolytes / Fluids ──────────────────────────────────────
  { code: "CA", innName: "Calcium gluconate 1g", category: "electrolyte", dose: "1 g", route: "IV", supplyCode: "MED-CA", costIdr: 5000, allergens: [], classTag: "calcium", minMg: 500, maxMg: 1000, maxDailyMg: 2000 },
  { code: "NS", innName: "NaCl 0.9% 500ml", category: "fluid", dose: "500 mL", route: "IV", supplyCode: "MED-NS", costIdr: 8000, allergens: [], classTag: "crystalloid", minMg: 250, maxMg: 500, maxDailyMg: 4000 },

  // ── Antimalarials ──────────────────────────────────────────────
  { code: "ART", innName: "Artemether-lumefantrine 6-tab", category: "antimalarial", dose: "6 tablet", route: "PO", supplyCode: "MED-ART", costIdr: 25000, allergens: [], classTag: "artemisinin", minMg: 1, maxMg: 1, maxDailyMg: 1 },
  { code: "PRQ", innName: "Primaquine 15mg", category: "antimalarial", dose: "15 mg", route: "PO", supplyCode: "MED-PRQ", costIdr: 5000, allergens: [], classTag: "8-aminoquinoline", minMg: 7.5, maxMg: 15, maxDailyMg: 30 },

  // ── Antituberculous ────────────────────────────────────────────
  { code: "H", innName: "Isoniazid 100mg", category: "antituberculous", dose: "100 mg", route: "PO", supplyCode: "MED-H", costIdr: 1000, allergens: [], classTag: "antitb", minMg: 100, maxMg: 300, maxDailyMg: 500 },
  { code: "R", innName: "Rifampicin 150mg", category: "antituberculous", dose: "150 mg", route: "PO", supplyCode: "MED-R", costIdr: 2000, allergens: [], classTag: "antitb", minMg: 150, maxMg: 450, maxDailyMg: 600 },
  { code: "Z", innName: "Pyrazinamide 500mg", category: "antituberculous", dose: "500 mg", route: "PO", supplyCode: "MED-Z", costIdr: 1000, allergens: [], classTag: "antitb", minMg: 500, maxMg: 1500, maxDailyMg: 2000 },
  { code: "E", innName: "Ethambutol 400mg", category: "antituberculous", dose: "400 mg", route: "PO", supplyCode: "MED-E", costIdr: 1500, allergens: [], classTag: "antitb", minMg: 400, maxMg: 800, maxDailyMg: 1200 },
];

/** Lookup by 3-letter code — O(1) */
export const DRUG_BY_CODE: Map<string, DrugEntry> = new Map(DRUG_CATALOG.map(d => [d.code, d]));

/** All supply codes currently stocked */
export const ALL_SUPPLY_CODES = DRUG_CATALOG.map(d => d.supplyCode);

/** Total unique supply codes = 50 */
export function getDrug(code: string): DrugEntry | undefined {
  return DRUG_BY_CODE.get(code);
}
