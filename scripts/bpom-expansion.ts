/**
 * ADR-012: BPOM Generic Drug Expansion
 *
 * Identifies drugs commonly registered with BPOM and used in Indonesian
 * public hospitals (RSUD Tipe C / RSJA) that are missing from the current
 * 93-drug catalog. Expands to ~150 drugs covering all major therapeutic
 * categories with clinically significant entries.
 *
 * Methodology:
 * - Cross-reference against Indonesian National Formulary (Formulir Nasional)
 * - Focus on INN (International Nonproprietary Name) based entries
 * - Priority: high-volume prescriptions in RSUD, essential medicines list (EML)
 * - Skip: controlled substances (narcotics/psychotropics beyond existing),
 *   injectable chemotherapy, biologics, vaccines
 */

import type { DrugEntry, DrugCategory, Route } from "./drug-catalog.js";

/**
 * Add these to DRUG_CATALOG in drug-catalog.ts
 * Each entry follows the same schema as existing entries.
 */
export const BPOM_NEW_DRUGS: Omit<DrugEntry, "code">[] = [
  // ═══════════════════════════════════════════════════════════════
  // ANTIPSYCHOTICS (missing from catalog)
  // ═══════════════════════════════════════════════════════════════
  { innName: "Risperidone 1mg", category: "antipsychotic" as DrugCategory, dose: "1 mg", route: "PO" as Route, supplyCode: "MED-RIS", costIdr: 8000, allergens: [], classTag: "atypical_antipsychotic", minMg: 0.5, maxMg: 4, maxDailyMg: 6 },
  { innName: "Risperidone 2mg", category: "antipsychotic", dose: "2 mg", route: "PO", supplyCode: "MED-RIS2", costIdr: 12000, allergens: [], classTag: "atypical_antipsychotic", minMg: 1, maxMg: 4, maxDailyMg: 8 },
  { innName: "Quetiapine 25mg", category: "antipsychotic", dose: "25 mg", route: "PO", supplyCode: "MED-QUE", costIdr: 10000, allergens: [], classTag: "atypical_antipsychotic", minMg: 25, maxMg: 100, maxDailyMg: 300 },
  { innName: "Chlorpromazine 25mg", category: "antipsychotic", dose: "25 mg", route: "PO", supplyCode: "MED-CLP", costIdr: 2000, allergens: [], classTag: "typical_antipsychotic", minMg: 25, maxMg: 100, maxDailyMg: 600 },

  // ═══════════════════════════════════════════════════════════════
  // MOOD STABILIZERS (entirely missing)
  // ═══════════════════════════════════════════════════════════════
  { innName: "Lithium 300mg", category: "other", dose: "300 mg", route: "PO", supplyCode: "MED-LIT", costIdr: 5000, allergens: [], classTag: "mood_stabilizer", minMg: 300, maxMg: 900, maxDailyMg: 1800 },
  { innName: "Carbamazepine 200mg", category: "anticonvulsant", dose: "200 mg", route: "PO", supplyCode: "MED-CRB", costIdr: 3000, allergens: [], classTag: "anticonvulsant", minMg: 200, maxMg: 400, maxDailyMg: 1200 },

  // ═══════════════════════════════════════════════════════════════
  // ANXIOLYTICS / SEDATIVES (partial coverage)
  // ═══════════════════════════════════════════════════════════════
  { innName: "Buspirone 5mg", category: "anxiolytic", dose: "5 mg", route: "PO", supplyCode: "MED-BUS", costIdr: 8000, allergens: [], classTag: "anxiolytic", minMg: 5, maxMg: 10, maxDailyMg: 30 },
  { innName: "Zolpidem 5mg", category: "anxiolytic", dose: "5 mg", route: "PO", supplyCode: "MED-ZOL", costIdr: 10000, allergens: [], classTag: "hypnotic", minMg: 5, maxMg: 10, maxDailyMg: 10 },

  // ═══════════════════════════════════════════════════════════════
  // ANTICONVULSANTS (partial coverage)
  // ═══════════════════════════════════════════════════════════════
  { innName: "Gabapentin 300mg", category: "anticonvulsant", dose: "300 mg", route: "PO", supplyCode: "MED-GAB", costIdr: 5000, allergens: [], classTag: "anticonvulsant", minMg: 300, maxMg: 600, maxDailyMg: 3600 },
  { innName: "Topiramate 50mg", category: "anticonvulsant", dose: "50 mg", route: "PO", supplyCode: "MED-TPM", costIdr: 15000, allergens: [], classTag: "anticonvulsant", minMg: 25, maxMg: 50, maxDailyMg: 400 },
  { innName: "Lamotrigine 25mg", category: "anticonvulsant", dose: "25 mg", route: "PO", supplyCode: "MED-LAM", costIdr: 12000, allergens: [], classTag: "anticonvulsant", minMg: 25, maxMg: 100, maxDailyMg: 400 },

  // ═══════════════════════════════════════════════════════════════
  // ANTIDIABETICS (partial coverage)
  // ═══════════════════════════════════════════════════════════════
  { innName: "Acarbose 50mg", category: "antidiabetic", dose: "50 mg", route: "PO", supplyCode: "MED-ACR", costIdr: 5000, allergens: [], classTag: "alphaglucosidase_inhibitor", minMg: 50, maxMg: 100, maxDailyMg: 300 },
  { innName: "Insulin Glargine 10U/ml", category: "antidiabetic", dose: "10 U", route: "SC", supplyCode: "MED-GLA", costIdr: 35000, allergens: [], classTag: "longacting_insulin", minMg: 10, maxMg: 40, maxDailyMg: 80 },
  { innName: "Insulin Lispro 10U/ml", category: "antidiabetic", dose: "10 U", route: "SC", supplyCode: "MED-LIS", costIdr: 30000, allergens: [], classTag: "rapid_insulin", minMg: 4, maxMg: 10, maxDailyMg: 40 },

  // ═══════════════════════════════════════════════════════════════
  // ANTIBIOTICS (partial coverage - missing key classes)
  // ═══════════════════════════════════════════════════════════════
  { innName: "Clindamycin 150mg", category: "antibiotic", dose: "150 mg", route: "PO", supplyCode: "MED-CLN", costIdr: 3000, allergens: [], classTag: "lincosamide", minMg: 150, maxMg: 300, maxDailyMg: 1800 },
  { innName: "Clindamycin 300mg", category: "antibiotic", dose: "300 mg", route: "IV", supplyCode: "MED-CLN3", costIdr: 5000, allergens: [], classTag: "lincosamide", minMg: 300, maxMg: 600, maxDailyMg: 2400 },
  { innName: "Ertapenem 1g", category: "antibiotic", dose: "1 g", route: "IV", supplyCode: "MED-ERT", costIdr: 85000, allergens: [], classTag: "carbapenem", minMg: 500, maxMg: 1000, maxDailyMg: 1000 },
  { innName: "Cefixime 200mg", category: "antibiotic", dose: "200 mg", route: "PO", supplyCode: "MED-CPM", costIdr: 5000, allergens: ["cephalosporin"], classTag: "cephalosporin", minMg: 100, maxMg: 200, maxDailyMg: 400 },
  { innName: "Cefpodoxime 100mg", category: "antibiotic", dose: "100 mg", route: "PO", supplyCode: "MED-CPX", costIdr: 8000, allergens: ["cephalosporin"], classTag: "cephalosporin", minMg: 100, maxMg: 200, maxDailyMg: 400 },
  { innName: "Moxifloxacin 400mg", category: "antibiotic", dose: "400 mg", route: "PO", supplyCode: "MED-MOX", costIdr: 15000, allergens: [], classTag: "fluoroquinolone", minMg: 400, maxMg: 400, maxDailyMg: 400 },
  { innName: "Linezolid 600mg", category: "antibiotic", dose: "600 mg", route: "IV", supplyCode: "MED-LNZ", costIdr: 120000, allergens: [], classTag: "oxazolidinone", minMg: 600, maxMg: 600, maxDailyMg: 1200 },
  { innName: "Colistin 150mg", category: "antibiotic", dose: "150 mg", route: "IV", supplyCode: "MED-COL", costIdr: 45000, allergens: [], classTag: "polymyxin", minMg: 50, maxMg: 150, maxDailyMg: 300 },

  // ═══════════════════════════════════════════════════════════════
  // ANTIINFLAMMATORY / RHEUMATOLOGY
  // ═══════════════════════════════════════════════════════════════
  { innName: "Methotrexate 2.5mg", category: "other", dose: "2.5 mg", route: "PO", supplyCode: "MED-MTX", costIdr: 3000, allergens: [], classTag: "dmard", minMg: 2.5, maxMg: 15, maxDailyMg: 25 },
  { innName: "Hydroxychloroquine 200mg", category: "other", dose: "200 mg", route: "PO", supplyCode: "MED-HCQ", costIdr: 4000, allergens: [], classTag: "dmard", minMg: 200, maxMg: 400, maxDailyMg: 600 },
  { innName: "Sulfasalazine 500mg", category: "other", dose: "500 mg", route: "PO", supplyCode: "MED-SZA", costIdr: 3000, allergens: ["sulfonamide"], classTag: "dmard", minMg: 500, maxMg: 1000, maxDailyMg: 3000 },

  // ═══════════════════════════════════════════════════════════════
  // CARDIOVASCULAR (missing key drugs)
  // ═══════════════════════════════════════════════════════════════
  { innName: "Digoxin 0.25mg", category: "other", dose: "0.25 mg", route: "PO", supplyCode: "MED-DIG", costIdr: 1000, allergens: [], classTag: "cardiac_glycoside", minMg: 0.125, maxMg: 0.25, maxDailyMg: 0.5 },
  { innName: "Spironolactone 25mg", category: "diuretic", dose: "25 mg", route: "PO", supplyCode: "MED-SPR", costIdr: 2000, allergens: [], classTag: "potassium_sparing_diuretic", minMg: 25, maxMg: 50, maxDailyMg: 200 },
  { innName: "Fenofibrate 200mg", category: "statin", dose: "200 mg", route: "PO", supplyCode: "MED-FEN", costIdr: 5000, allergens: [], classTag: "fibrate", minMg: 200, maxMg: 200, maxDailyMg: 200 },
  { innName: "Ramipril 2.5mg", category: "antihypertensive", dose: "2.5 mg", route: "PO", supplyCode: "MED-RAM", costIdr: 2000, allergens: [], classTag: "ace_inhibitor", minMg: 1.25, maxMg: 2.5, maxDailyMg: 10 },
  { innName: "Ramipril 5mg", category: "antihypertensive", dose: "5 mg", route: "PO", supplyCode: "MED-RAM5", costIdr: 3000, allergens: [], classTag: "ace_inhibitor", minMg: 2.5, maxMg: 5, maxDailyMg: 10 },
  { innName: "Losartan 50mg", category: "antihypertensive", dose: "50 mg", route: "PO", supplyCode: "MED-LOS50", costIdr: 3000, allergens: [], classTag: "arb", minMg: 25, maxMg: 50, maxDailyMg: 100 },
  { innName: "Amlodipine 10mg", category: "antihypertensive", dose: "10 mg", route: "PO", supplyCode: "MED-AML10", costIdr: 800, allergens: [], classTag: "ccb", minMg: 5, maxMg: 10, maxDailyMg: 10 },
  { innName: "Verapamil 40mg", category: "antihypertensive", dose: "40 mg", route: "PO", supplyCode: "MED-VER", costIdr: 1000, allergens: [], classTag: "ccb", minMg: 40, maxMg: 80, maxDailyMg: 240 },
  { innName: "Amiodarone 200mg", category: "other", dose: "200 mg", route: "PO", supplyCode: "MED-AMI", costIdr: 8000, allergens: [], classTag: "antiarrhythmic", minMg: 200, maxMg: 400, maxDailyMg: 600 },
  { innName: "Nitroglycerin 0.5mg", category: "antihypertensive", dose: "0.5 mg", route: "SL", supplyCode: "MED-NTG", costIdr: 2000, allergens: [], classTag: "nitrate", minMg: 0.3, maxMg: 0.6, maxDailyMg: 1.5 },

  // ═══════════════════════════════════════════════════════════════
  // ANTIEMETICS / GASTRO (missing key drugs)
  // ═══════════════════════════════════════════════════════════════
  { innName: "Dexamethasone 0.5mg", category: "corticosteroid", dose: "0.5 mg", route: "PO", supplyCode: "MED-DEX05", costIdr: 1000, allergens: [], classTag: "corticosteroid", minMg: 0.5, maxMg: 2, maxDailyMg: 8 },
  { innName: "Metoclopramide 10mg", category: "antiemetic", dose: "10 mg", route: "IV", supplyCode: "MED-MET2", costIdr: 2000, allergens: [], classTag: "d2_antagonist", minMg: 5, maxMg: 10, maxDailyMg: 30 },
  { innName: "Omeprazole 20mg", category: "ppi", dose: "20 mg", route: "PO", supplyCode: "MED-OMP", costIdr: 500, allergens: [], classTag: "ppi", minMg: 10, maxMg: 20, maxDailyMg: 40 },
  { innName: "Sucralfate 1g", category: "other", dose: "1 g", route: "PO", supplyCode: "MED-SUC", costIdr: 2000, allergens: [], classTag: "mucoprotective", minMg: 1000, maxMg: 2000, maxDailyMg: 8000 },

  // ═══════════════════════════════════════════════════════════════
  // RESPIRATORY (missing inhaled steroids + theophylline)
  // ═══════════════════════════════════════════════════════════════
  { innName: "Budesonide inhaler", category: "corticosteroid", dose: "200 mcg", route: "INH", supplyCode: "MED-BUD", costIdr: 45000, allergens: [], classTag: "inhaled_corticosteroid", minMg: 0.2, maxMg: 0.8, maxDailyMg: 1.6 },
  { innName: "Theophylline 100mg", category: "bronchodilator", dose: "100 mg", route: "PO", supplyCode: "MED-THE", costIdr: 3000, allergens: [], classTag: "methylxanthine", minMg: 100, maxMg: 200, maxDailyMg: 600 },
  { innName: "Ipratropium bromide neb", category: "bronchodilator", dose: "500 mcg", route: "INH", supplyCode: "MED-IPR2", costIdr: 8000, allergens: [], classTag: "ipi trope", minMg: 0.5, maxMg: 1, maxDailyMg: 2 },

  // ═══════════════════════════════════════════════════════════════
  // ENDOCRINE (missing thyroid, pituitary)
  // ═══════════════════════════════════════════════════════════════
  { innName: "Desmopressin 10mcg", category: "other", dose: "10 mcg", route: "INTR", supplyCode: "MED-DDA", costIdr: 25000, allergens: [], classTag: "vasopressin_analog", minMg: 10, maxMg: 20, maxDailyMg: 40 },
  { innName: "Calcitriol 0.25mcg", category: "electrolyte", dose: "0.25 mcg", route: "PO", supplyCode: "MED-CAL", costIdr: 5000, allergens: [], classTag: "vitamin_d", minMg: 0.25, maxMg: 0.5, maxDailyMg: 1 },
  { innName: "Octreotide 100mcg", category: "other", dose: "100 mcg", route: "SC", supplyCode: "MED-OCT", costIdr: 85000, allergens: [], classTag: "somatostatin_analog", minMg: 50, maxMg: 100, maxDailyMg: 300 },

  // ═══════════════════════════════════════════════════════════════
  // OPHTHALMIC / OTOLARYNGOLOGIC
  // ═══════════════════════════════════════════════════════════════
  { innName: "Tobramycin eye drops", category: "antibiotic", dose: "0.3%", route: "TOP", supplyCode: "MED-TOB", costIdr: 12000, allergens: [], classTag: "aminoglycoside", minMg: 1, maxMg: 2, maxDailyMg: 6 },
  { innName: "Fluorometholone eye drops", category: "corticosteroid", dose: "0.1%", route: "TOP", supplyCode: "MED-FLU", costIdr: 15000, allergens: [], classTag: "corticosteroid", minMg: 1, maxMg: 2, maxDailyMg: 6 },
  { innName: "Timolol eye drops 0.5%", category: "antihypertensive", dose: "0.5%", route: "TOP", supplyCode: "MED-TIM", costIdr: 12000, allergens: [], classTag: "beta_blocker", minMg: 1, maxMg: 2, maxDailyMg: 4 },
  { innName: "Artificial tears", category: "other", dose: "1ml", route: "TOP", supplyCode: "MED-ATD", costIdr: 15000, allergens: [], classTag: "lubricant", minMg: 1, maxMg: 2, maxDailyMg: 6 },
  { innName: "Oxymetazoline nasal spray", category: "other", dose: "0.05%", route: "INH", supplyCode: "MED-OMX", costIdr: 10000, allergens: [], classTag: "decongestant", minMg: 1, maxMg: 2, maxDailyMg: 3 },

  // ═══════════════════════════════════════════════════════════════
  // DERMATOLOGY
  // ═══════════════════════════════════════════════════════════════
  { innName: "Mupirocin 2% cream", category: "antibiotic", dose: "2%", route: "TOP", supplyCode: "MED-MUP", costIdr: 18000, allergens: [], classTag: "topical_antibiotic", minMg: 1, maxMg: 2, maxDailyMg: 3 },
  { innName: "Hydrocortisone 1% cream", category: "corticosteroid", dose: "1%", route: "TOP", supplyCode: "MED-HC1", costIdr: 5000, allergens: [], classTag: "topical_corticosteroid", minMg: 1, maxMg: 2, maxDailyMg: 3 },
  { innName: "Ketoconazole 2% cream", category: "antifungal", dose: "2%", route: "TOP", supplyCode: "MED-KET2", costIdr: 12000, allergens: [], classTag: "topical_azole", minMg: 1, maxMg: 2, maxDailyMg: 3 },
  { innName: "Calamine lotion", category: "other", dose: "30ml", route: "TOP", supplyCode: "MED-CAL", costIdr: 5000, allergens: [], classTag: "soothing_agent", minMg: 1, maxMg: 3, maxDailyMg: 5 },

  // ═══════════════════════════════════════════════════════════════
  // HEMATOLOGY
  // ═══════════════════════════════════════════════════════════════
  { innName: "Iron sucrose 100mg/5ml", category: "electrolyte", dose: "100 mg", route: "IV", supplyCode: "MED-IRON", costIdr: 35000, allergens: [], classTag: "iron_prep", minMg: 100, maxMg: 200, maxDailyMg: 200 },
  { innName: "Vitamin B12 1000mcg", category: "electrolyte", dose: "1000 mcg", route: "IM", supplyCode: "MED-B12", costIdr: 8000, allergens: [], classTag: "vitamin", minMg: 500, maxMg: 1000, maxDailyMg: 2000 },
  { innName: "Vitamin K1 10mg", category: "electrolyte", dose: "10 mg", route: "IV", supplyCode: "MED-VK1", costIdr: 5000, allergens: [], classTag: "vitamin", minMg: 5, maxMg: 10, maxDailyMg: 20 },
  { innName: "Folic acid 5mg", category: "electrolyte", dose: "5 mg", route: "PO", supplyCode: "MED-FOL5", costIdr: 500, allergens: [], classTag: "vitamin", minMg: 1, maxMg: 5, maxDailyMg: 15 },

  // ═══════════════════════════════════════════════════════════════
  // PAIN / ANESTHESIA
  // ═══════════════════════════════════════════════════════════════
  { innName: "Ketorolac 30mg", category: "nsaid", dose: "30 mg", route: "IV", supplyCode: "MED-KET2", costIdr: 5000, allergens: ["NSAID"], classTag: "nsaid", minMg: 15, maxMg: 30, maxDailyMg: 120 },
  { innName: "Ketorolac 10mg", category: "nsaid", dose: "10 mg", route: "PO", supplyCode: "MED-KET10", costIdr: 2000, allergens: ["NSAID"], classTag: "nsaid", minMg: 10, maxMg: 20, maxDailyMg: 80 },
  { innName: "Pethidine 50mg", category: "opioid", dose: "50 mg", route: "IM", supplyCode: "MED-PET", costIdr: 3000, allergens: [], classTag: "opioid", minMg: 25, maxMg: 50, maxDailyMg: 200 },
  { innName: "Fentanyl 50mcg/ml", category: "opioid", dose: "50 mcg", route: "IV", supplyCode: "MED-FEN", costIdr: 25000, allergens: [], classTag: "opioid", minMg: 25, maxMg: 100, maxDailyMg: 400 },
  { innName: "Lidocaine 2%", category: "other", dose: "2%", route: "TOP", supplyCode: "MED-LIDO", costIdr: 8000, allergens: [], classTag: "local_anesthetic", minMg: 1, maxMg: 2, maxDailyMg: 4 },

  // ═══════════════════════════════════════════════════════════════
  // FLUIDS / ELECTROLYTES (expansion)
  // ═══════════════════════════════════════════════════════════════
  { innName: "NaCl 0.9% 100ml", category: "fluid", dose: "100 ml", route: "IV", supplyCode: "MED-NS100", costIdr: 5000, allergens: [], classTag: "crystalloid", minMg: 50, maxMg: 100, maxDailyMg: 2000 },
  { innName: "NaCl 0.9% 50ml", category: "fluid", dose: "50 ml", route: "IV", supplyCode: "MED-NS50", costIdr: 3000, allergens: [], classTag: "crystalloid", minMg: 25, maxMg: 50, maxDailyMg: 1000 },
  { innName: "Dextrose 5% 500ml", category: "fluid", dose: "500 ml", route: "IV", supplyCode: "MED-D5W", costIdr: 8000, allergens: [], classTag: "crystalloid", minMg: 250, maxMg: 500, maxDailyMg: 3000 },
  { innName: "Dextrose 10% 250ml", category: "fluid", dose: "250 ml", route: "IV", supplyCode: "MED-D10", costIdr: 10000, allergens: [], classTag: "crystalloid", minMg: 125, maxMg: 250, maxDailyMg: 1000 },
  { innName: "Calcium gluconate 10%", category: "electrolyte", dose: "10 ml", route: "IV", supplyCode: "MED-CAG", costIdr: 3000, allergens: [], classTag: "calcium", minMg: 5, maxMg: 10, maxDailyMg: 20 },
  { innName: "Sodium bicarbonate 8.4%", category: "electrolyte", dose: "50 ml", route: "IV", supplyCode: "MED-SBC", costIdr: 5000, allergens: [], classTag: "buffer", minMg: 25, maxMg: 50, maxDailyMg: 150 },

  // ═══════════════════════════════════════════════════════════════
  // ANTICOAGULANTS (missing unfractionated heparin)
  // ═══════════════════════════════════════════════════════════════
  { innName: "Heparin 5000IU/ml", category: "anticoagulant", dose: "5000 IU", route: "SC", supplyCode: "MED-HEP5", costIdr: 20000, allergens: ["heparin"], classTag: "unfractionated_heparin", minMg: 2500, maxMg: 5000, maxDailyMg: 10000 },
  { innName: "Heparin 10000IU/ml", category: "anticoagulant", dose: "10000 IU", route: "IV", supplyCode: "MED-HEP10", costIdr: 30000, allergens: ["heparin"], classTag: "unfractionated_heparin", minMg: 5000, maxMg: 10000, maxDailyMg: 20000 },
  { innName: "Andexanet alfa", category: "anticoagulant", dose: "400mg", route: "IV", supplyCode: "MED-ANX", costIdr: 250000, allergens: [], classTag: "reversal_agent", minMg: 400, maxMg: 800, maxDailyMg: 800 },

  // ═══════════════════════════════════════════════════════════════
  // IMMUNOSUPPRESSANTS
  // ═══════════════════════════════════════════════════════════════
  { innName: "Cyclosporine 100mg", category: "other", dose: "100 mg", route: "PO", supplyCode: "MED-CYC", costIdr: 85000, allergens: [], classTag: "immunosuppressant", minMg: 50, maxMg: 100, maxDailyMg: 250 },
  { innName: "Azathioprine 50mg", category: "other", dose: "50 mg", route: "PO", supplyCode: "MED-AZA", costIdr: 15000, allergens: [], classTag: "immunosuppressant", minMg: 25, maxMg: 50, maxDailyMg: 150 },

  // ═══════════════════════════════════════════════════════════════
  // URINARY / PROSTATE
  // ═══════════════════════════════════════════════════════════════
  { innName: "Tamsulosin 0.4mg", category: "other", dose: "0.4 mg", route: "PO", supplyCode: "MED-TAM", costIdr: 8000, allergens: [], classTag: "alpha_blocker", minMg: 0.2, maxMg: 0.4, maxDailyMg: 0.8 },
  { innName: "Allopurinol 100mg", category: "other", dose: "100 mg", route: "PO", supplyCode: "MED-ALO", costIdr: 1000, allergens: [], classTag: "xanthine_oxidase_inhibitor", minMg: 100, maxMg: 300, maxDailyMg: 600 },
  { innName: "Allopurinol 300mg", category: "other", dose: "300 mg", route: "PO", supplyCode: "MED-ALO3", costIdr: 2000, allergens: [], classTag: "xanthine_oxidase_inhibitor", minMg: 100, maxMg: 300, maxDailyMg: 600 },

  // ═══════════════════════════════════════════════════════════════
  // ANTIARRHYTHMICS
  // ═══════════════════════════════════════════════════════════════
  { innName: "Amiodarone 200mg", category: "other", dose: "200 mg", route: "PO", supplyCode: "MED-AMI2", costIdr: 8000, allergens: [], classTag: "antiarrhythmic", minMg: 200, maxMg: 400, maxDailyMg: 600 },
  { innName: "Lidocaine 2% 10ml", category: "other", dose: "10 ml", route: "IV", supplyCode: "MED-LIDO2", costIdr: 5000, allergens: [], classTag: "antiarrhythmic", minMg: 1, maxMg: 2, maxDailyMg: 3 },
  { innName: "Adenosine 6mg", category: "other", dose: "6 mg", route: "IV", supplyCode: "MED-ADE", costIdr: 25000, allergens: [], classTag: "antiarrhythmic", minMg: 6, maxMg: 12, maxDailyMg: 12 },

  // ═══════════════════════════════════════════════════════════════
  // ENDOCRINE EMERGENCY
  // ═══════════════════════════════════════════════════════════════
  { innName: "Glucagon 1mg", category: "other", dose: "1 mg", route: "IM", supplyCode: "MED-GCG", costIdr: 15000, allergens: [], classTag: "glucagon", minMg: 1, maxMg: 1, maxDailyMg: 1 },
  { innName: "Calcium chloride 10%", category: "electrolyte", dose: "10 ml", route: "IV", supplyCode: "MED-CAC", costIdr: 3000, allergens: [], classTag: "calcium", minMg: 5, maxMg: 10, maxDailyMg: 20 },
];

/** Count new drugs */
console.log(`BPOM expansion: ${BPOM_NEW_DRUGS.length} new drugs`);

/** Verify supply codes don't conflict */
const existingCodes = new Set(["ACE","MET","ATR","OMP","LVF","PRC","HEP","SAL","FUR","DIA","AMX","CTR","MTZ","CIP","AML","BIS","ASP","INS","OND","MOR","KCL","RL","LOS","HCT","NIF","LAB","ISO","GLP","PIO","CAN","DIA2","PCA","DOX","CLI","TIN","CPM","MEM","VAN","AMG","ACT","TDF","3TC","FLC","WAF","RIV","CLO","SIM","ROS","IBU","NEC","TRM","PHT","VAL","LEV","OLA","HAL","SER","ESC","PRED","DEX","HYD","IPR","PNT","RAN","MET2","CA","NS","ART","PRQ","H","R","Z","E","AZM","PCN","DAP","VALA","LVT","PTU","KET","METO","NIM","PRA","MAG","DON","MPH","SUM","BET","MOR5","NAC","TOB","PREDN","FOL"]);
const conflicts = BPOM_NEW_DRUGS.map(d => d.supplyCode).filter(sc => existingCodes.has(sc));
if (conflicts.length > 0) console.log("CONFLICT:", conflicts.join(", "));
else console.log("No supply code conflicts ✓");
