/**
 * Drug catalog — Indonesian INN-based generic drug database.
 *
 * Every entry is a stable, deterministic constant. No RNG, no clock dependency.
 * Codes are 3-letter uppercase abbreviations (e.g. "LOS" = Losartan).
 * Supply codes follow the existing "MED-XXX" convention in central-supply.ts.
 *
 * Covers 175 drugs across 26 categories.
 * Existing 22 codes preserved for backward-compatibility with all downstream tables.
 * ADR-011 additions: 19 new drugs for protocol coverage.
 * ADR-012 additions: 82 BPOM-registered generic drugs for RSUD coverage.
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

  // ── ADR-011: Missing drugs for protocol coverage ───────────────
  // Antibiotics
  { code: "AZM", innName: "Azithromycin 250mg", category: "antibiotic", dose: "250 mg", route: "PO", supplyCode: "MED-AZM", costIdr: 3000, allergens: [], classTag: "macrolide", minMg: 250, maxMg: 500, maxDailyMg: 500 },
  { code: "PCN", innName: "Penicillin G 1MU", category: "antibiotic", dose: "1 MU", route: "IV", supplyCode: "MED-PCN", costIdr: 2000, allergens: ["penicillin"], classTag: "penicillin", minMg: 1, maxMg: 4, maxDailyMg: 24 },
  { code: "DAP", innName: "Dapsone 100mg", category: "antibiotic", dose: "100 mg", route: "PO", supplyCode: "MED-DAP", costIdr: 1000, allergens: ["sulfone"], classTag: "sulfone", minMg: 50, maxMg: 100, maxDailyMg: 200 },
  // Antivirals
  { code: "VALA", innName: "Valacyclovir 500mg", category: "antiviral", dose: "500 mg", route: "PO", supplyCode: "MED-VALA", costIdr: 15000, allergens: [], classTag: "antiviral", minMg: 500, maxMg: 1000, maxDailyMg: 3000 },
  // Endocrine
  { code: "LVT", innName: "Levothyroxine 100mcg", category: "other", dose: "100 mcg", route: "PO", supplyCode: "MED-LVT", costIdr: 1500, allergens: [], classTag: "thyroid_hormone", minMg: 25, maxMg: 100, maxDailyMg: 300 },
  { code: "PTU", innName: "Propylthiouracil 100mg", category: "other", dose: "100 mg", route: "PO", supplyCode: "MED-PTU", costIdr: 3000, allergens: [], classTag: "antithyroid", minMg: 50, maxMg: 100, maxDailyMg: 300 },
  { code: "KET", innName: "Ketoconazole 200mg", category: "antifungal", dose: "200 mg", route: "PO", supplyCode: "MED-KET", costIdr: 4000, allergens: [], classTag: "azole", minMg: 200, maxMg: 400, maxDailyMg: 800 },
  // Cardiovascular
  { code: "METO", innName: "Metoprolol 50mg", category: "antihypertensive", dose: "50 mg", route: "PO", supplyCode: "MED-METO", costIdr: 500, allergens: [], classTag: "beta_blocker", minMg: 25, maxMg: 50, maxDailyMg: 200 },
  { code: "NIM", innName: "Nimodipine 60mg", category: "antihypertensive", dose: "60 mg", route: "PO", supplyCode: "MED-NIM", costIdr: 12000, allergens: [], classTag: "ccb", minMg: 30, maxMg: 60, maxDailyMg: 180 },
  { code: "PRA", innName: "Prazosin 1mg", category: "antihypertensive", dose: "1 mg", route: "PO", supplyCode: "MED-PRA", costIdr: 1000, allergens: [], classTag: "alpha_blocker", minMg: 0.5, maxMg: 1, maxDailyMg: 20 },
  { code: "MAG", innName: "Magnesium sulfate 1g", category: "electrolyte", dose: "1 g", route: "IV", supplyCode: "MED-MAG", costIdr: 5000, allergens: [], classTag: "electrolyte", minMg: 1, maxMg: 4, maxDailyMg: 8 },
  // CNS / Psych
  { code: "DON", innName: "Donepezil 10mg", category: "other", dose: "10 mg", route: "PO", supplyCode: "MED-DON", costIdr: 25000, allergens: [], classTag: "cholinesterase_inhibitor", minMg: 5, maxMg: 10, maxDailyMg: 23 },
  { code: "MPH", innName: "Methylphenidate 10mg", category: "other", dose: "10 mg", route: "PO", supplyCode: "MED-MPH", costIdr: 15000, allergens: [], classTag: "stimulant", minMg: 5, maxMg: 10, maxDailyMg: 60 },
  { code: "SUM", innName: "Sumatriptan 50mg", category: "other", dose: "50 mg", route: "PO", supplyCode: "MED-SUM", costIdr: 20000, allergens: [], classTag: "triptyan", minMg: 25, maxMg: 50, maxDailyMg: 200 },
  { code: "BET", innName: "Betahistine 16mg", category: "other", dose: "16 mg", route: "PO", supplyCode: "MED-BET", costIdr: 8000, allergens: [], classTag: "histamine_analog", minMg: 8, maxMg: 16, maxDailyMg: 48 },
  // Analgesic variant
  { code: "MOR5", innName: "Morphine 5mg", category: "opioid", dose: "5 mg", route: "SC", supplyCode: "MED-MOR5", costIdr: 3000, allergens: ["morphine", "opioid"], classTag: "opioid", minMg: 2.5, maxMg: 5, maxDailyMg: 15 },
  // Antidote
  { code: "NAC", innName: "N-acetylcysteine 600mg", category: "other", dose: "600 mg", route: "PO", supplyCode: "MED-NAC", costIdr: 8000, allergens: [], classTag: "antidote", minMg: 600, maxMg: 1400, maxDailyMg: 3000 },
  // Ophthalmic
  { code: "TOB", innName: "Tobramycin eye drops", category: "antibiotic", dose: "0.3%", route: "TOP", supplyCode: "MED-TOB", costIdr: 12000, allergens: [], classTag: "aminoglycoside", minMg: 1, maxMg: 2, maxDailyMg: 6 },
  { code: "PREDN", innName: "Prednisolone eye drops", category: "corticosteroid", dose: "1%", route: "TOP", supplyCode: "MED-PREDN", costIdr: 10000, allergens: [], classTag: "corticosteroid", minMg: 1, maxMg: 2, maxDailyMg: 8 },
  // Supplement
  { code: "FOL", innName: "Folic acid 1mg", category: "electrolyte", dose: "1 mg", route: "PO", supplyCode: "MED-FOL", costIdr: 200, allergens: [], classTag: "vitamin", minMg: 1, maxMg: 5, maxDailyMg: 10 },

  // ═══════════════════════════════════════════════════════════════
  // ADR-012: BPOM Generic Drug Expansion — 82 additional drugs
  // ═══════════════════════════════════════════════════════════════
  // Antipsychotics
  { code: "RIS", innName: "Risperidone 1mg", category: "antipsychotic", dose: "1 mg", route: "PO", supplyCode: "MED-RIS", costIdr: 8000, allergens: [], classTag: "atypical_antipsychotic", minMg: 0.5, maxMg: 4, maxDailyMg: 6 },
  { code: "QUE", innName: "Quetiapine 25mg", category: "antipsychotic", dose: "25 mg", route: "PO", supplyCode: "MED-QUE", costIdr: 10000, allergens: [], classTag: "atypical_antipsychotic", minMg: 25, maxMg: 100, maxDailyMg: 300 },
  { code: "CLP", innName: "Chlorpromazine 25mg", category: "antipsychotic", dose: "25 mg", route: "PO", supplyCode: "MED-CLP", costIdr: 2000, allergens: [], classTag: "typical_antipsychotic", minMg: 25, maxMg: 100, maxDailyMg: 600 },
  // Mood stabilizers
  { code: "LIT", innName: "Lithium 300mg", category: "other", dose: "300 mg", route: "PO", supplyCode: "MED-LIT", costIdr: 5000, allergens: [], classTag: "mood_stabilizer", minMg: 300, maxMg: 900, maxDailyMg: 1800 },
  { code: "CRB", innName: "Carbamazepine 200mg", category: "anticonvulsant", dose: "200 mg", route: "PO", supplyCode: "MED-CRB", costIdr: 3000, allergens: [], classTag: "anticonvulsant", minMg: 200, maxMg: 400, maxDailyMg: 1200 },
  // Anxiolytics
  { code: "BUS", innName: "Buspirone 5mg", category: "anxiolytic", dose: "5 mg", route: "PO", supplyCode: "MED-BUS", costIdr: 8000, allergens: [], classTag: "anxiolytic", minMg: 5, maxMg: 10, maxDailyMg: 30 },
  { code: "ZOL", innName: "Zolpidem 5mg", category: "anxiolytic", dose: "5 mg", route: "PO", supplyCode: "MED-ZOL", costIdr: 10000, allergens: [], classTag: "hypnotic", minMg: 5, maxMg: 10, maxDailyMg: 10 },
  // Anticonvulsants
  { code: "GAB", innName: "Gabapentin 300mg", category: "anticonvulsant", dose: "300 mg", route: "PO", supplyCode: "MED-GAB", costIdr: 5000, allergens: [], classTag: "anticonvulsant", minMg: 300, maxMg: 600, maxDailyMg: 3600 },
  { code: "TPM", innName: "Topiramate 50mg", category: "anticonvulsant", dose: "50 mg", route: "PO", supplyCode: "MED-TPM", costIdr: 15000, allergens: [], classTag: "anticonvulsant", minMg: 25, maxMg: 50, maxDailyMg: 400 },
  { code: "LAM", innName: "Lamotrigine 25mg", category: "anticonvulsant", dose: "25 mg", route: "PO", supplyCode: "MED-LAM", costIdr: 12000, allergens: [], classTag: "anticonvulsant", minMg: 25, maxMg: 100, maxDailyMg: 400 },
  // Antidiabetics
  { code: "ACR", innName: "Acarbose 50mg", category: "antidiabetic", dose: "50 mg", route: "PO", supplyCode: "MED-ACR", costIdr: 5000, allergens: [], classTag: "alphaglucosidase_inhibitor", minMg: 50, maxMg: 100, maxDailyMg: 300 },
  { code: "GLA", innName: "Insulin Glargine 10U/ml", category: "antidiabetic", dose: "10 U", route: "SC", supplyCode: "MED-GLA", costIdr: 35000, allergens: [], classTag: "longacting_insulin", minMg: 10, maxMg: 40, maxDailyMg: 80 },
  { code: "LIS", innName: "Insulin Lispro 10U/ml", category: "antidiabetic", dose: "10 U", route: "SC", supplyCode: "MED-LIS", costIdr: 30000, allergens: [], classTag: "rapid_insulin", minMg: 4, maxMg: 10, maxDailyMg: 40 },
  // Antibiotics
  { code: "CLN", innName: "Clindamycin 150mg", category: "antibiotic", dose: "150 mg", route: "PO", supplyCode: "MED-CLN", costIdr: 3000, allergens: [], classTag: "lincosamide", minMg: 150, maxMg: 300, maxDailyMg: 1800 },
  { code: "CLN3", innName: "Clindamycin 300mg", category: "antibiotic", dose: "300 mg", route: "IV", supplyCode: "MED-CLN3", costIdr: 5000, allergens: [], classTag: "lincosamide", minMg: 300, maxMg: 600, maxDailyMg: 2400 },
  { code: "ERT", innName: "Ertapenem 1g", category: "antibiotic", dose: "1 g", route: "IV", supplyCode: "MED-ERT", costIdr: 85000, allergens: [], classTag: "carbapenem", minMg: 500, maxMg: 1000, maxDailyMg: 1000 },
  { code: "CPX", innName: "Cefpodoxime 100mg", category: "antibiotic", dose: "100 mg", route: "PO", supplyCode: "MED-CPX", costIdr: 8000, allergens: ["cephalosporin"], classTag: "cephalosporin", minMg: 100, maxMg: 200, maxDailyMg: 400 },
  { code: "MOX", innName: "Moxifloxacin 400mg", category: "antibiotic", dose: "400 mg", route: "PO", supplyCode: "MED-MOX", costIdr: 15000, allergens: [], classTag: "fluoroquinolone", minMg: 400, maxMg: 400, maxDailyMg: 400 },
  { code: "LNZ", innName: "Linezolid 600mg", category: "antibiotic", dose: "600 mg", route: "IV", supplyCode: "MED-LNZ", costIdr: 120000, allergens: [], classTag: "oxazolidinone", minMg: 600, maxMg: 600, maxDailyMg: 1200 },
  { code: "COL", innName: "Colistin 150mg", category: "antibiotic", dose: "150 mg", route: "IV", supplyCode: "MED-COL", costIdr: 45000, allergens: [], classTag: "polymyxin", minMg: 50, maxMg: 150, maxDailyMg: 300 },
  // Rheumatology
  { code: "MTX", innName: "Methotrexate 2.5mg", category: "other", dose: "2.5 mg", route: "PO", supplyCode: "MED-MTX", costIdr: 3000, allergens: [], classTag: "dmard", minMg: 2.5, maxMg: 15, maxDailyMg: 25 },
  { code: "HCQ", innName: "Hydroxychloroquine 200mg", category: "other", dose: "200 mg", route: "PO", supplyCode: "MED-HCQ", costIdr: 4000, allergens: [], classTag: "dmard", minMg: 200, maxMg: 400, maxDailyMg: 600 },
  { code: "SZA", innName: "Sulfasalazine 500mg", category: "other", dose: "500 mg", route: "PO", supplyCode: "MED-SZA", costIdr: 3000, allergens: ["sulfonamide"], classTag: "dmard", minMg: 500, maxMg: 1000, maxDailyMg: 3000 },
  // Cardiovascular
  { code: "DIG", innName: "Digoxin 0.25mg", category: "other", dose: "0.25 mg", route: "PO", supplyCode: "MED-DIG", costIdr: 1000, allergens: [], classTag: "cardiac_glycoside", minMg: 0.125, maxMg: 0.25, maxDailyMg: 0.5 },
  { code: "SPR", innName: "Spironolactone 25mg", category: "diuretic", dose: "25 mg", route: "PO", supplyCode: "MED-SPR", costIdr: 2000, allergens: [], classTag: "potassium_sparing_diuretic", minMg: 25, maxMg: 50, maxDailyMg: 200 },
  { code: "FEN", innName: "Fenofibrate 200mg", category: "statin", dose: "200 mg", route: "PO", supplyCode: "MED-FEN", costIdr: 5000, allergens: [], classTag: "fibrate", minMg: 200, maxMg: 200, maxDailyMg: 200 },
  { code: "RAM", innName: "Ramipril 2.5mg", category: "antihypertensive", dose: "2.5 mg", route: "PO", supplyCode: "MED-RAM", costIdr: 2000, allergens: [], classTag: "ace_inhibitor", minMg: 1.25, maxMg: 2.5, maxDailyMg: 10 },
  { code: "RAM5", innName: "Ramipril 5mg", category: "antihypertensive", dose: "5 mg", route: "PO", supplyCode: "MED-RAM5", costIdr: 3000, allergens: [], classTag: "ace_inhibitor", minMg: 2.5, maxMg: 5, maxDailyMg: 10 },
  { code: "LOS50", innName: "Losartan 50mg", category: "antihypertensive", dose: "50 mg", route: "PO", supplyCode: "MED-LOS50", costIdr: 3000, allergens: [], classTag: "arb", minMg: 25, maxMg: 50, maxDailyMg: 100 },
  { code: "AML10", innName: "Amlodipine 10mg", category: "antihypertensive", dose: "10 mg", route: "PO", supplyCode: "MED-AML10", costIdr: 800, allergens: [], classTag: "ccb", minMg: 5, maxMg: 10, maxDailyMg: 10 },
  { code: "VER", innName: "Verapamil 40mg", category: "antihypertensive", dose: "40 mg", route: "PO", supplyCode: "MED-VER", costIdr: 1000, allergens: [], classTag: "ccb", minMg: 40, maxMg: 80, maxDailyMg: 240 },
  { code: "AMI", innName: "Amiodarone 200mg", category: "other", dose: "200 mg", route: "PO", supplyCode: "MED-AMI", costIdr: 8000, allergens: [], classTag: "antiarrhythmic", minMg: 200, maxMg: 400, maxDailyMg: 600 },
  { code: "NTG", innName: "Nitroglycerin 0.5mg", category: "antihypertensive", dose: "0.5 mg", route: "SL", supplyCode: "MED-NTG", costIdr: 2000, allergens: [], classTag: "nitrate", minMg: 0.3, maxMg: 0.6, maxDailyMg: 1.5 },
  // GI
  { code: "DEX05", innName: "Dexamethasone 0.5mg", category: "corticosteroid", dose: "0.5 mg", route: "PO", supplyCode: "MED-DEX05", costIdr: 1000, allergens: [], classTag: "corticosteroid", minMg: 0.5, maxMg: 2, maxDailyMg: 8 },
  { code: "SUC", innName: "Sucralfate 1g", category: "other", dose: "1 g", route: "PO", supplyCode: "MED-SUC", costIdr: 2000, allergens: [], classTag: "mucoprotective", minMg: 1000, maxMg: 2000, maxDailyMg: 8000 },
  // Respiratory
  { code: "BUD", innName: "Budesonide inhaler", category: "corticosteroid", dose: "200 mcg", route: "INH", supplyCode: "MED-BUD", costIdr: 45000, allergens: [], classTag: "inhaled_corticosteroid", minMg: 0.2, maxMg: 0.8, maxDailyMg: 1.6 },
  { code: "THE", innName: "Theophylline 100mg", category: "bronchodilator", dose: "100 mg", route: "PO", supplyCode: "MED-THE", costIdr: 3000, allergens: [], classTag: "methylxanthine", minMg: 100, maxMg: 200, maxDailyMg: 600 },
  { code: "IPR2", innName: "Ipratropium bromide neb", category: "bronchodilator", dose: "500 mcg", route: "INH", supplyCode: "MED-IPR2", costIdr: 8000, allergens: [], classTag: "ipi trope", minMg: 0.5, maxMg: 1, maxDailyMg: 2 },
  // Endocrine
  { code: "DDA", innName: "Desmopressin 10mcg", category: "other", dose: "10 mcg", route: "INH", supplyCode: "MED-DDA", costIdr: 25000, allergens: [], classTag: "vasopressin_analog", minMg: 10, maxMg: 20, maxDailyMg: 40 },
  { code: "CAL2", innName: "Calcitriol 0.25mcg", category: "electrolyte", dose: "0.25 mcg", route: "PO", supplyCode: "MED-CAL2", costIdr: 5000, allergens: [], classTag: "vitamin_d", minMg: 0.25, maxMg: 0.5, maxDailyMg: 1 },
  { code: "OCT", innName: "Octreotide 100mcg", category: "other", dose: "100 mcg", route: "SC", supplyCode: "MED-OCT", costIdr: 85000, allergens: [], classTag: "somatostatin_analog", minMg: 50, maxMg: 100, maxDailyMg: 300 },
  // Ophthalmic
  { code: "FLU", innName: "Fluorometholone eye drops", category: "corticosteroid", dose: "0.1%", route: "TOP", supplyCode: "MED-FLU", costIdr: 15000, allergens: [], classTag: "corticosteroid", minMg: 1, maxMg: 2, maxDailyMg: 6 },
  { code: "TIM", innName: "Timolol eye drops 0.5%", category: "antihypertensive", dose: "0.5%", route: "TOP", supplyCode: "MED-TIM", costIdr: 12000, allergens: [], classTag: "beta_blocker", minMg: 1, maxMg: 2, maxDailyMg: 4 },
  { code: "ATD", innName: "Artificial tears", category: "other", dose: "1ml", route: "TOP", supplyCode: "MED-ATD", costIdr: 15000, allergens: [], classTag: "lubricant", minMg: 1, maxMg: 2, maxDailyMg: 6 },
  { code: "OMX", innName: "Oxymetazoline nasal spray", category: "other", dose: "0.05%", route: "INH", supplyCode: "MED-OMX", costIdr: 10000, allergens: [], classTag: "decongestant", minMg: 1, maxMg: 2, maxDailyMg: 3 },
  // Dermatology
  { code: "MUP", innName: "Mupirocin 2% cream", category: "antibiotic", dose: "2%", route: "TOP", supplyCode: "MED-MUP", costIdr: 18000, allergens: [], classTag: "topical_antibiotic", minMg: 1, maxMg: 2, maxDailyMg: 3 },
  { code: "HC1", innName: "Hydrocortisone 1% cream", category: "corticosteroid", dose: "1%", route: "TOP", supplyCode: "MED-HC1", costIdr: 5000, allergens: [], classTag: "topical_corticosteroid", minMg: 1, maxMg: 2, maxDailyMg: 3 },
  { code: "KET2", innName: "Ketoconazole 2% cream", category: "antifungal", dose: "2%", route: "TOP", supplyCode: "MED-KET2", costIdr: 12000, allergens: [], classTag: "topical_azole", minMg: 1, maxMg: 2, maxDailyMg: 3 },
  { code: "CAL3", innName: "Calamine lotion", category: "other", dose: "30ml", route: "TOP", supplyCode: "MED-CAL3", costIdr: 5000, allergens: [], classTag: "soothing_agent", minMg: 1, maxMg: 3, maxDailyMg: 5 },
  // Hematology
  { code: "IRON", innName: "Iron sucrose 100mg/5ml", category: "electrolyte", dose: "100 mg", route: "IV", supplyCode: "MED-IRON", costIdr: 35000, allergens: [], classTag: "iron_prep", minMg: 100, maxMg: 200, maxDailyMg: 200 },
  { code: "B12", innName: "Vitamin B12 1000mcg", category: "electrolyte", dose: "1000 mcg", route: "IM", supplyCode: "MED-B12", costIdr: 8000, allergens: [], classTag: "vitamin", minMg: 500, maxMg: 1000, maxDailyMg: 2000 },
  { code: "VK1", innName: "Vitamin K1 10mg", category: "electrolyte", dose: "10 mg", route: "IV", supplyCode: "MED-VK1", costIdr: 5000, allergens: [], classTag: "vitamin", minMg: 5, maxMg: 10, maxDailyMg: 20 },
  { code: "FOL5", innName: "Folic acid 5mg", category: "electrolyte", dose: "5 mg", route: "PO", supplyCode: "MED-FOL5", costIdr: 500, allergens: [], classTag: "vitamin", minMg: 1, maxMg: 5, maxDailyMg: 15 },
  // Pain / Anesthesia
  { code: "KTR", innName: "Ketorolac 30mg", category: "nsaid", dose: "30 mg", route: "IV", supplyCode: "MED-KET2", costIdr: 5000, allergens: ["NSAID"], classTag: "nsaid", minMg: 15, maxMg: 30, maxDailyMg: 120 },
  { code: "KET10", innName: "Ketorolac 10mg", category: "nsaid", dose: "10 mg", route: "PO", supplyCode: "MED-KET10", costIdr: 2000, allergens: ["NSAID"], classTag: "nsaid", minMg: 10, maxMg: 20, maxDailyMg: 80 },
  { code: "PET", innName: "Pethidine 50mg", category: "opioid", dose: "50 mg", route: "IM", supplyCode: "MED-PET", costIdr: 3000, allergens: [], classTag: "opioid", minMg: 25, maxMg: 50, maxDailyMg: 200 },
  { code: "FNT", innName: "Fentanyl 50mcg/ml", category: "opioid", dose: "50 mcg", route: "IV", supplyCode: "MED-FNT", costIdr: 25000, allergens: [], classTag: "opioid", minMg: 25, maxMg: 100, maxDailyMg: 400 },
  { code: "LIDO", innName: "Lidocaine 2%", category: "other", dose: "2%", route: "TOP", supplyCode: "MED-LIDO", costIdr: 8000, allergens: [], classTag: "local_anesthetic", minMg: 1, maxMg: 2, maxDailyMg: 4 },
  // Fluids
  { code: "NS100", innName: "NaCl 0.9% 100ml", category: "fluid", dose: "100 ml", route: "IV", supplyCode: "MED-NS100", costIdr: 5000, allergens: [], classTag: "crystalloid", minMg: 50, maxMg: 100, maxDailyMg: 2000 },
  { code: "NS50", innName: "NaCl 0.9% 50ml", category: "fluid", dose: "50 ml", route: "IV", supplyCode: "MED-NS50", costIdr: 3000, allergens: [], classTag: "crystalloid", minMg: 25, maxMg: 50, maxDailyMg: 1000 },
  { code: "D5W", innName: "Dextrose 5% 500ml", category: "fluid", dose: "500 ml", route: "IV", supplyCode: "MED-D5W", costIdr: 8000, allergens: [], classTag: "crystalloid", minMg: 250, maxMg: 500, maxDailyMg: 3000 },
  { code: "D10", innName: "Dextrose 10% 250ml", category: "fluid", dose: "250 ml", route: "IV", supplyCode: "MED-D10", costIdr: 10000, allergens: [], classTag: "crystalloid", minMg: 125, maxMg: 250, maxDailyMg: 1000 },
  { code: "CAG", innName: "Calcium gluconate 10%", category: "electrolyte", dose: "10 ml", route: "IV", supplyCode: "MED-CAG", costIdr: 3000, allergens: [], classTag: "calcium", minMg: 5, maxMg: 10, maxDailyMg: 20 },
  { code: "SBC", innName: "Sodium bicarbonate 8.4%", category: "electrolyte", dose: "50 ml", route: "IV", supplyCode: "MED-SBC", costIdr: 5000, allergens: [], classTag: "buffer", minMg: 25, maxMg: 50, maxDailyMg: 150 },
  // Anticoagulants
  { code: "HEP5", innName: "Heparin 5000IU/ml", category: "anticoagulant", dose: "5000 IU", route: "SC", supplyCode: "MED-HEP5", costIdr: 20000, allergens: ["heparin"], classTag: "unfractionated_heparin", minMg: 2500, maxMg: 5000, maxDailyMg: 10000 },
  { code: "HEP10", innName: "Heparin 10000IU/ml", category: "anticoagulant", dose: "10000 IU", route: "IV", supplyCode: "MED-HEP10", costIdr: 30000, allergens: ["heparin"], classTag: "unfractionated_heparin", minMg: 5000, maxMg: 10000, maxDailyMg: 20000 },
  // Immunosuppressants
  { code: "CYC", innName: "Cyclosporine 100mg", category: "other", dose: "100 mg", route: "PO", supplyCode: "MED-CYC", costIdr: 85000, allergens: [], classTag: "immunosuppressant", minMg: 50, maxMg: 100, maxDailyMg: 250 },
  { code: "AZA", innName: "Azathioprine 50mg", category: "other", dose: "50 mg", route: "PO", supplyCode: "MED-AZA", costIdr: 15000, allergens: [], classTag: "immunosuppressant", minMg: 25, maxMg: 50, maxDailyMg: 150 },
  // Urinary
  { code: "TAM", innName: "Tamsulosin 0.4mg", category: "other", dose: "0.4 mg", route: "PO", supplyCode: "MED-TAM", costIdr: 8000, allergens: [], classTag: "alpha_blocker", minMg: 0.2, maxMg: 0.4, maxDailyMg: 0.8 },
  { code: "ALO", innName: "Allopurinol 100mg", category: "other", dose: "100 mg", route: "PO", supplyCode: "MED-ALO", costIdr: 1000, allergens: [], classTag: "xanthine_oxidase_inhibitor", minMg: 100, maxMg: 300, maxDailyMg: 600 },
  { code: "ALO3", innName: "Allopurinol 300mg", category: "other", dose: "300 mg", route: "PO", supplyCode: "MED-ALO3", costIdr: 2000, allergens: [], classTag: "xanthine_oxidase_inhibitor", minMg: 100, maxMg: 300, maxDailyMg: 600 },
  // Antiarrhythmics
  { code: "LIDO2", innName: "Lidocaine 2% 10ml", category: "other", dose: "10 ml", route: "IV", supplyCode: "MED-LIDO2", costIdr: 5000, allergens: [], classTag: "antiarrhythmic", minMg: 1, maxMg: 2, maxDailyMg: 3 },
  { code: "ADE", innName: "Adenosine 6mg", category: "other", dose: "6 mg", route: "IV", supplyCode: "MED-ADE", costIdr: 25000, allergens: [], classTag: "antiarrhythmic", minMg: 6, maxMg: 12, maxDailyMg: 12 },
  // Endocrine emergency
  { code: "GCG", innName: "Glucagon 1mg", category: "other", dose: "1 mg", route: "IM", supplyCode: "MED-GCG", costIdr: 15000, allergens: [], classTag: "glucagon", minMg: 1, maxMg: 1, maxDailyMg: 1 },
  { code: "CAC", innName: "Calcium chloride 10%", category: "electrolyte", dose: "10 ml", route: "IV", supplyCode: "MED-CAC", costIdr: 3000, allergens: [], classTag: "calcium", minMg: 5, maxMg: 10, maxDailyMg: 20 },

  // ── ADR-013: Chapter IX/X expansion drugs ──────────────────────
  { code: "CSZ", innName: "Cilostazol 100mg", category: "other", dose: "100 mg", route: "PO", supplyCode: "MED-CSZ", costIdr: 8000, allergens: [], classTag: "phosphodiesterase_inhibitor", minMg: 100, maxMg: 200, maxDailyMg: 200 },
  { code: "NBL", innName: "Nebivolol 5mg", category: "antihypertensive", dose: "5 mg", route: "PO", supplyCode: "MED-NBL", costIdr: 12000, allergens: [], classTag: "beta_blocker", minMg: 2.5, maxMg: 5, maxDailyMg: 10 },
  { code: "OSL", innName: "Oseltamivir 75mg", category: "antiviral", dose: "75 mg", route: "PO", supplyCode: "MED-OSL", costIdr: 25000, allergens: [], classTag: "neuraminidase_inhibitor", minMg: 75, maxMg: 75, maxDailyMg: 150 },
  { code: "TNK", innName: "Tenecteplase 30mg", category: "other", dose: "30 mg", route: "IV", supplyCode: "MED-TNK", costIdr: 350000, allergens: [], classTag: "thrombolytic", minMg: 30, maxMg: 30, maxDailyMg: 30 },
  { code: "HYS", innName: "Hyoscine 20mg", category: "other", dose: "20 mg", route: "PO", supplyCode: "MED-HYS", costIdr: 3000, allergens: [], classTag: "antispasmodic", minMg: 10, maxMg: 20, maxDailyMg: 60 },
  { code: "CLC", innName: "Colchicine 0.5mg", category: "other", dose: "0.5 mg", route: "PO", supplyCode: "MED-CLC", costIdr: 5000, allergens: [], classTag: "anti-inflammatory", minMg: 0.5, maxMg: 1, maxDailyMg: 3 },
];

/** Lookup by 3-letter code — O(1) */
export const DRUG_BY_CODE: Map<string, DrugEntry> = new Map(DRUG_CATALOG.map(d => [d.code, d]));

/** All supply codes currently stocked */
export const ALL_SUPPLY_CODES = DRUG_CATALOG.map(d => d.supplyCode);

/** Total unique supply codes = 50 */
export function getDrug(code: string): DrugEntry | undefined {
  return DRUG_BY_CODE.get(code);
}
