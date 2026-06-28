import type { SpecialtyType } from "./specialty.js";
import type { Vitals } from "../patient/schema.js";

export interface ClinicalAction {
  type: "lab" | "imaging" | "medication" | "consult" | "respiratory" | "diet" | "surgery" | "discharge";
  label: string;
  priority: number;
  detail?: string;
}

export interface IcdProtocol {
  code: string;
  name: string;
  specialty: SpecialtyType;
  actions: ClinicalAction[];
}

export interface VitalsRule {
  param: keyof Vitals;
  condition: "gt" | "lt" | "gte" | "lte";
  threshold: number;
  actions: ClinicalAction[];
}

export type Gender = "male" | "female";

export const ICD_PROTOCOLS: IcdProtocol[] = [
  { code: "I10", name: "Essential hypertension", specialty: "cardiology",
    actions: [
      { type: "medication", label: "Enalapril 5mg", priority: 8, detail: "ACE inhibitor for BP control" },
      { type: "lab", label: "Basic Metabolic Panel", priority: 6, detail: "BMP" },
      { type: "lab", label: "Complete Blood Count", priority: 4, detail: "CBC" },
      { type: "diet", label: "Cardiac diet", priority: 5, detail: "cardiac" },
    ] },
  { code: "E11", name: "Type 2 diabetes mellitus", specialty: "cardiology",
    actions: [
      { type: "medication", label: "Metformin 500mg", priority: 9, detail: "First-line for T2DM" },
      { type: "lab", label: "Hemoglobin A1C", priority: 8, detail: "HBA1C" },
      { type: "lab", label: "Basic Metabolic Panel", priority: 7, detail: "BMP" },
      { type: "diet", label: "Diabetic diet", priority: 6, detail: "diabetic" },
    ] },
  { code: "J15", name: "Bacterial pneumonia", specialty: "pulmonology",
    actions: [
      { type: "medication", label: "Ceftriaxone 1g", priority: 9, detail: "Antibiotic for pneumonia" },
      { type: "medication", label: "Levofloxacin 500mg", priority: 8, detail: "Alternative antibiotic" },
      { type: "lab", label: "Complete Blood Count", priority: 8, detail: "CBC" },
      { type: "lab", label: "C-Reactive Protein", priority: 7, detail: "CRP" },
      { type: "imaging", label: "Chest X-ray PA & Lateral", priority: 9, detail: "X-ray" },
      { type: "respiratory", label: "Oxygen therapy", priority: 6, detail: "oxygen" },
    ] },
  { code: "J18", name: "Pneumonia unspecified", specialty: "pulmonology",
    actions: [
      { type: "medication", label: "Levofloxacin 500mg", priority: 9, detail: "Empiric antibiotic" },
      { type: "lab", label: "Complete Blood Count", priority: 8, detail: "CBC" },
      { type: "lab", label: "C-Reactive Protein", priority: 7, detail: "CRP" },
      { type: "imaging", label: "Chest X-ray PA & Lateral", priority: 9, detail: "X-ray" },
      { type: "respiratory", label: "Oxygen therapy", priority: 6, detail: "oxygen" },
    ] },
  { code: "N39", name: "Urinary tract infection", specialty: "cardiology",
    actions: [
      { type: "medication", label: "Levofloxacin 500mg", priority: 8, detail: "Antibiotic for UTI" },
      { type: "medication", label: "Ciprofloxacin 500mg", priority: 7, detail: "Alternative antibiotic" },
      { type: "lab", label: "Urinalysis", priority: 9, detail: "UA" },
      { type: "lab", label: "Complete Blood Count", priority: 6, detail: "CBC" },
    ] },
  { code: "J45", name: "Asthma", specialty: "pulmonology",
    actions: [
      { type: "medication", label: "Salbutamol Inhaler", priority: 9, detail: "Bronchodilator" },
      { type: "respiratory", label: "Nebulizer therapy", priority: 8, detail: "nebulizer" },
      { type: "lab", label: "Complete Blood Count", priority: 4, detail: "CBC" },
      { type: "imaging", label: "Chest X-ray PA & Lateral", priority: 5, detail: "X-ray" },
    ] },
  { code: "K29", name: "Gastritis", specialty: "cardiology",
    actions: [
      { type: "medication", label: "Omeprazole 20mg", priority: 9, detail: "PPI for gastritis" },
      { type: "diet", label: "Soft diet", priority: 6, detail: "soft" },
    ] },
  { code: "M54", name: "Low back pain", specialty: "neurology",
    actions: [
      { type: "medication", label: "Paracetamol 500mg", priority: 7, detail: "Analgesic" },
      { type: "imaging", label: "MRI Lumbar Spine without contrast", priority: 6, detail: "MRI" },
      { type: "consult", label: "Rehabilitasi Medik", priority: 5, detail: "rehab_medik" },
    ] },
  { code: "I50", name: "Heart failure", specialty: "cardiology",
    actions: [
      { type: "medication", label: "Furosemide 40mg", priority: 9, detail: "Diuretic for HF" },
      { type: "medication", label: "Enalapril 5mg", priority: 8, detail: "ACE inhibitor" },
      { type: "lab", label: "Basic Metabolic Panel", priority: 7, detail: "BMP" },
      { type: "imaging", label: "Chest X-ray PA & Lateral", priority: 8, detail: "X-ray" },
      { type: "diet", label: "Cardiac diet", priority: 6, detail: "cardiac" },
      { type: "consult", label: "Jantung", priority: 5, detail: "cardiology" },
    ] },
  { code: "A09", name: "Acute gastroenteritis", specialty: "cardiology",
    actions: [
      { type: "lab", label: "Basic Metabolic Panel", priority: 8, detail: "BMP" },
      { type: "medication", label: "Omeprazole 20mg", priority: 5, detail: "PPI" },
      { type: "medication", label: "Ondansetron 4mg", priority: 6, detail: "Antiemetic" },
      { type: "diet", label: "Liquid diet", priority: 7, detail: "liquid" },
    ] },
  { code: "E78", name: "Hyperlipidemia", specialty: "cardiology",
    actions: [
      { type: "medication", label: "Atorvastatin 20mg", priority: 8, detail: "Statin" },
      { type: "diet", label: "Cardiac diet", priority: 5, detail: "cardiac" },
    ] },
  { code: "N18", name: "Chronic kidney disease", specialty: "cardiology",
    actions: [
      { type: "lab", label: "Basic Metabolic Panel", priority: 9, detail: "BMP" },
      { type: "diet", label: "Renal diet", priority: 7, detail: "renal" },
      { type: "medication", label: "Enalapril 5mg", priority: 6, detail: "ACE inhibitor renal protection" },
    ] },
  { code: "J44", name: "COPD", specialty: "pulmonology",
    actions: [
      { type: "respiratory", label: "Oxygen therapy", priority: 9, detail: "oxygen" },
      { type: "respiratory", label: "Nebulizer therapy", priority: 8, detail: "nebulizer" },
      { type: "medication", label: "Salbutamol Inhaler", priority: 8, detail: "Bronchodilator" },
      { type: "imaging", label: "Chest X-ray PA & Lateral", priority: 6, detail: "X-ray" },
      { type: "lab", label: "Complete Blood Count", priority: 5, detail: "CBC" },
    ] },
  { code: "G40", name: "Epilepsy", specialty: "neurology",
    actions: [
      { type: "medication", label: "Diazepam 5mg", priority: 9, detail: "Anticonvulsant" },
      { type: "consult", label: "Saraf", priority: 7, detail: "neurology" },
    ] },
  { code: "M17", name: "Osteoarthritis of knee", specialty: "neurology",
    actions: [
      { type: "medication", label: "Paracetamol 500mg", priority: 7, detail: "Analgesic" },
      { type: "imaging", label: "Extremity X-ray Left Ankle", priority: 6, detail: "X-ray" },
      { type: "consult", label: "Rehabilitasi Medik", priority: 6, detail: "rehab_medik" },
    ] },
  { code: "F32", name: "Major depressive disorder", specialty: "psychiatry",
    actions: [
      { type: "consult", label: "Jiwa", priority: 9, detail: "psychiatry" },
      { type: "medication", label: "Diazepam 5mg", priority: 5, detail: "Anxiolytic" },
    ] },
  { code: "O80", name: "Single spontaneous delivery", specialty: "obgyn",
    actions: [
      { type: "consult", label: "Obstetri Ginekologi", priority: 9, detail: "obgyn" },
      { type: "lab", label: "Complete Blood Count", priority: 7, detail: "CBC" },
    ] },
  { code: "O20", name: "Threatened abortion", specialty: "obgyn",
    actions: [
      { type: "consult", label: "Obstetri Ginekologi", priority: 9, detail: "obgyn" },
      { type: "lab", label: "Complete Blood Count", priority: 7, detail: "CBC" },
    ] },
  { code: "N20", name: "Renal colic / kidney stone", specialty: "cardiology",
    actions: [
      { type: "medication", label: "Paracetamol 500mg", priority: 8, detail: "Analgesic" },
      { type: "lab", label: "Urinalysis", priority: 8, detail: "UA" },
      { type: "imaging", label: "CT Abdomen with contrast", priority: 7, detail: "CT" },
    ] },
  { code: "I21", name: "Acute myocardial infarction", specialty: "cardiology",
    actions: [
      { type: "lab", label: "Troponin I", priority: 10, detail: "TROP" },
      { type: "lab", label: "Complete Blood Count", priority: 8, detail: "CBC" },
      { type: "medication", label: "Aspirin 80mg", priority: 10, detail: "Antiplatelet" },
      { type: "medication", label: "Enoxaparin 40mg", priority: 9, detail: "Anticoagulant" },
      { type: "medication", label: "Atorvastatin 20mg", priority: 8, detail: "Statin" },
      { type: "imaging", label: "Chest X-ray PA & Lateral", priority: 7, detail: "X-ray" },
      { type: "consult", label: "Jantung", priority: 9, detail: "cardiology" },
    ] },
  { code: "S72", name: "Fracture of femur", specialty: "neurology",
    actions: [
      { type: "imaging", label: "Extremity X-ray Left Ankle", priority: 9, detail: "X-ray" },
      { type: "medication", label: "Morphine 10mg", priority: 9, detail: "Severe pain" },
      { type: "medication", label: "Paracetamol 500mg", priority: 8, detail: "Analgesic" },
      { type: "surgery", label: "Total Hip Arthroplasty", priority: 7, detail: "47562" },
      { type: "consult", label: "Bedah Umum", priority: 7, detail: "surgery" },
    ] },
  { code: "P07", name: "Preterm newborn", specialty: "pediatrics",
    actions: [
      { type: "consult", label: "Anak", priority: 9, detail: "pediatrics" },
      { type: "respiratory", label: "Oxygen therapy", priority: 8, detail: "oxygen" },
      { type: "lab", label: "Complete Blood Count", priority: 7, detail: "CBC" },
    ] },
  { code: "H66", name: "Suppurative otitis media", specialty: "ent",
    actions: [
      { type: "medication", label: "Levofloxacin 500mg", priority: 8, detail: "Antibiotic" },
      { type: "medication", label: "Paracetamol 500mg", priority: 7, detail: "Analgesic" },
      { type: "consult", label: "THT", priority: 6, detail: "ent" },
    ] },
  { code: "J20", name: "Acute bronchitis", specialty: "pulmonology",
    actions: [
      { type: "medication", label: "Salbutamol Inhaler", priority: 7, detail: "Bronchodilator" },
      { type: "medication", label: "Paracetamol 500mg", priority: 5, detail: "Antipyretic" },
      { type: "imaging", label: "Chest X-ray PA & Lateral", priority: 6, detail: "X-ray" },
    ] },
  { code: "K35", name: "Acute appendicitis", specialty: "neurology",
    actions: [
      { type: "lab", label: "Complete Blood Count", priority: 9, detail: "CBC" },
      { type: "lab", label: "C-Reactive Protein", priority: 8, detail: "CRP" },
      { type: "imaging", label: "CT Abdomen with contrast", priority: 9, detail: "CT" },
      { type: "surgery", label: "Laparoscopic Appendectomy", priority: 9, detail: "44970" },
      { type: "consult", label: "Bedah Umum", priority: 8, detail: "surgery" },
    ] },
  { code: "N40", name: "Benign prostatic hyperplasia", specialty: "neurology",
    actions: [
      { type: "consult", label: "Bedah Umum", priority: 7, detail: "surgery" },
      { type: "lab", label: "Basic Metabolic Panel", priority: 5, detail: "BMP" },
    ] },
  { code: "C50", name: "Malignant neoplasm of breast", specialty: "neurology",
    actions: [
      { type: "surgery", label: "Breast Mass Excision", priority: 8, detail: "19120" },
      { type: "consult", label: "Bedah Umum", priority: 8, detail: "surgery" },
      { type: "imaging", label: "Chest X-ray PA & Lateral", priority: 5, detail: "X-ray" },
    ] },
  { code: "C61", name: "Malignant neoplasm of prostate", specialty: "neurology",
    actions: [
      { type: "consult", label: "Bedah Umum", priority: 8, detail: "surgery" },
      { type: "lab", label: "Basic Metabolic Panel", priority: 6, detail: "BMP" },
    ] },
  { code: "D25", name: "Leiomyoma of uterus", specialty: "obgyn",
    actions: [
      { type: "consult", label: "Obstetri Ginekologi", priority: 8, detail: "obgyn" },
      { type: "lab", label: "Complete Blood Count", priority: 6, detail: "CBC" },
    ] },
  { code: "K80", name: "Cholelithiasis", specialty: "neurology",
    actions: [
      { type: "surgery", label: "Laparoscopic Cholecystectomy", priority: 8, detail: "47562" },
      { type: "imaging", label: "Abdominal Ultrasound", priority: 8, detail: "Ultrasound" },
      { type: "lab", label: "Complete Blood Count", priority: 6, detail: "CBC" },
      { type: "consult", label: "Bedah Umum", priority: 7, detail: "surgery" },
    ] },
  { code: "M81", name: "Osteoporosis without fracture", specialty: "cardiology",
    actions: [
      { type: "medication", label: "Paracetamol 500mg", priority: 4, detail: "Analgesic PRN" },
      { type: "diet", label: "High protein diet", priority: 6, detail: "high-protein" },
    ] },
  { code: "E05", name: "Hyperthyroidism", specialty: "cardiology",
    actions: [
      { type: "lab", label: "Basic Metabolic Panel", priority: 7, detail: "BMP" },
      { type: "medication", label: "Enalapril 5mg", priority: 5, detail: "BP control" },
    ] },
  { code: "I63", name: "Cerebral infarction", specialty: "neurology",
    actions: [
      { type: "imaging", label: "CT Head without contrast", priority: 9, detail: "CT" },
      { type: "medication", label: "Enoxaparin 40mg", priority: 8, detail: "Anticoagulant" },
      { type: "medication", label: "Atorvastatin 20mg", priority: 7, detail: "Statin" },
      { type: "consult", label: "Saraf", priority: 9, detail: "neurology" },
      { type: "consult", label: "Rehabilitasi Medik", priority: 6, detail: "rehab_medik" },
    ] },
  { code: "A15", name: "Respiratory tuberculosis", specialty: "pulmonology",
    actions: [
      { type: "imaging", label: "Chest X-ray PA & Lateral", priority: 9, detail: "X-ray" },
      { type: "lab", label: "Complete Blood Count", priority: 7, detail: "CBC" },
      { type: "lab", label: "C-Reactive Protein", priority: 7, detail: "CRP" },
      { type: "consult", label: "Paru", priority: 8, detail: "pulmonology" },
    ] },
  { code: "B20", name: "HIV disease", specialty: "cardiology",
    actions: [
      { type: "lab", label: "Complete Blood Count", priority: 8, detail: "CBC" },
      { type: "lab", label: "Basic Metabolic Panel", priority: 7, detail: "BMP" },
      { type: "consult", label: "Penyakit Dalam", priority: 8, detail: "cardiology" },
    ] },
  { code: "L03", name: "Cellulitis", specialty: "cardiology",
    actions: [
      { type: "medication", label: "Levofloxacin 500mg", priority: 8, detail: "Antibiotic" },
      { type: "lab", label: "Complete Blood Count", priority: 6, detail: "CBC" },
      { type: "lab", label: "C-Reactive Protein", priority: 6, detail: "CRP" },
    ] },
  { code: "S06", name: "Intracranial injury", specialty: "neurology",
    actions: [
      { type: "imaging", label: "CT Head without contrast", priority: 9, detail: "CT" },
      { type: "consult", label: "Bedah Saraf", priority: 9, detail: "surgery_neuro" },
      { type: "medication", label: "Paracetamol 500mg", priority: 7, detail: "Analgesic" },
    ] },
  { code: "T14", name: "Open wound", specialty: "neurology",
    actions: [
      { type: "medication", label: "Levofloxacin 500mg", priority: 7, detail: "Antibiotic prophylaxis" },
      { type: "medication", label: "Paracetamol 500mg", priority: 7, detail: "Analgesic" },
      { type: "consult", label: "Bedah Umum", priority: 6, detail: "surgery" },
    ] },
  { code: "E86", name: "Volume depletion / dehydration", specialty: "cardiology",
    actions: [
      { type: "lab", label: "Basic Metabolic Panel", priority: 8, detail: "BMP" },
      { type: "lab", label: "Complete Blood Count", priority: 6, detail: "CBC" },
      { type: "diet", label: "Liquid diet", priority: 7, detail: "liquid" },
    ] },
  { code: "D64", name: "Anemia unspecified", specialty: "cardiology",
    actions: [
      { type: "lab", label: "Complete Blood Count", priority: 8, detail: "CBC" },
      { type: "lab", label: "Basic Metabolic Panel", priority: 5, detail: "BMP" },
      { type: "medication", label: "Enalapril 5mg", priority: 3, detail: "If hypertensive" },
    ] },
  { code: "I48", name: "Atrial fibrillation", specialty: "cardiology",
    actions: [
      { type: "lab", label: "Basic Metabolic Panel", priority: 7, detail: "BMP" },
      { type: "medication", label: "Enoxaparin 40mg", priority: 9, detail: "Anticoagulation" },
      { type: "consult", label: "Jantung", priority: 8, detail: "cardiology" },
    ] },
  { code: "J12", name: "Viral pneumonia", specialty: "pulmonology",
    actions: [
      { type: "lab", label: "Complete Blood Count", priority: 8, detail: "CBC" },
      { type: "lab", label: "C-Reactive Protein", priority: 7, detail: "CRP" },
      { type: "imaging", label: "Chest X-ray PA & Lateral", priority: 9, detail: "X-ray" },
      { type: "respiratory", label: "Oxygen therapy", priority: 7, detail: "oxygen" },
      { type: "medication", label: "Paracetamol 500mg", priority: 6, detail: "Antipyretic" },
    ] },
  { code: "E10", name: "Type 1 diabetes mellitus", specialty: "cardiology",
    actions: [
      { type: "lab", label: "Basic Metabolic Panel", priority: 9, detail: "BMP" },
      { type: "lab", label: "Hemoglobin A1C", priority: 8, detail: "HBA1C" },
      { type: "diet", label: "Diabetic diet", priority: 7, detail: "diabetic" },
    ] },
  { code: "K25", name: "Gastric ulcer", specialty: "cardiology",
    actions: [
      { type: "medication", label: "Omeprazole 20mg", priority: 9, detail: "PPI" },
      { type: "lab", label: "Complete Blood Count", priority: 6, detail: "CBC" },
      { type: "diet", label: "Soft diet", priority: 7, detail: "soft" },
    ] },
  { code: "J32", name: "Chronic sinusitis", specialty: "ent",
    actions: [
      { type: "medication", label: "Levofloxacin 500mg", priority: 8, detail: "Antibiotic" },
      { type: "medication", label: "Paracetamol 500mg", priority: 6, detail: "Analgesic" },
      { type: "consult", label: "THT", priority: 7, detail: "ent" },
    ] },
  { code: "L40", name: "Psoriasis", specialty: "dermatology",
    actions: [
      { type: "consult", label: "Kulit Kelamin", priority: 8, detail: "dermatology" },
      { type: "medication", label: "Paracetamol 500mg", priority: 4, detail: "Symptomatic" },
    ] },
  { code: "M06", name: "Rheumatoid arthritis", specialty: "neurology",
    actions: [
      { type: "medication", label: "Paracetamol 500mg", priority: 8, detail: "Analgesic" },
      { type: "lab", label: "Complete Blood Count", priority: 7, detail: "CBC" },
      { type: "lab", label: "C-Reactive Protein", priority: 8, detail: "CRP" },
      { type: "consult", label: "Penyakit Dalam", priority: 7, detail: "internal_medicine" },
    ] },
  { code: "G20", name: "Parkinson disease", specialty: "neurology",
    actions: [
      { type: "consult", label: "Saraf", priority: 9, detail: "neurology" },
      { type: "medication", label: "Diazepam 5mg", priority: 5, detail: "Muscle relaxant" },
    ] },
  { code: "F41", name: "Anxiety disorder", specialty: "psychiatry",
    actions: [
      { type: "consult", label: "Jiwa", priority: 9, detail: "psychiatry" },
      { type: "medication", label: "Diazepam 5mg", priority: 6, detail: "Anxiolytic" },
    ] },
  { code: "N76", name: "Vulvovaginitis", specialty: "obgyn",
    actions: [
      { type: "consult", label: "Obstetri Ginekologi", priority: 8, detail: "obgyn" },
      { type: "lab", label: "Complete Blood Count", priority: 5, detail: "CBC" },
    ] },
  { code: "P59", name: "Neonatal jaundice", specialty: "pediatrics",
    actions: [
      { type: "lab", label: "Basic Metabolic Panel", priority: 8, detail: "BMP" },
      { type: "consult", label: "Anak", priority: 9, detail: "pediatrics" },
    ] },
  { code: "Q21", name: "Congenital heart disease", specialty: "pediatrics",
    actions: [
      { type: "consult", label: "Anak", priority: 9, detail: "pediatrics" },
      { type: "consult", label: "Jantung", priority: 8, detail: "cardiology" },
    ] },
  { code: "D50", name: "Iron deficiency anemia", specialty: "cardiology",
    actions: [
      { type: "lab", label: "Complete Blood Count", priority: 9, detail: "CBC" },
      { type: "diet", label: "High protein diet", priority: 6, detail: "high-protein" },
    ] },
  { code: "K56", name: "Paralytic ileus", specialty: "neurology",
    actions: [
      { type: "imaging", label: "Abdominal X-ray", priority: 8, detail: "X-ray" },
      { type: "lab", label: "Basic Metabolic Panel", priority: 8, detail: "BMP" },
      { type: "consult", label: "Bedah Umum", priority: 8, detail: "surgery" },
      { type: "diet", label: "NPO", priority: 9, detail: "NPO" },
    ] },
  { code: "E66", name: "Obesity", specialty: "cardiology",
    actions: [
      { type: "diet", label: "Diabetic diet", priority: 6, detail: "diabetic" },
      { type: "lab", label: "Basic Metabolic Panel", priority: 5, detail: "BMP" },
    ] },
  { code: "I83", name: "Varicose veins", specialty: "neurology",
    actions: [
      { type: "consult", label: "Bedah Umum", priority: 7, detail: "surgery" },
      { type: "medication", label: "Enoxaparin 40mg", priority: 5, detail: "If thrombotic" },
    ] },
  { code: "N13", name: "Obstructive uropathy", specialty: "cardiology",
    actions: [
      { type: "imaging", label: "Abdominal Ultrasound", priority: 8, detail: "Ultrasound" },
      { type: "lab", label: "Basic Metabolic Panel", priority: 8, detail: "BMP" },
      { type: "consult", label: "Bedah Umum", priority: 7, detail: "surgery" },
    ] },
  { code: "J84", name: "Interstitial lung disease", specialty: "pulmonology",
    actions: [
      { type: "imaging", label: "Chest X-ray PA & Lateral", priority: 9, detail: "X-ray" },
      { type: "respiratory", label: "Oxygen therapy", priority: 8, detail: "oxygen" },
      { type: "consult", label: "Paru", priority: 9, detail: "pulmonology" },
    ] },
  { code: "A41", name: "Sepsis unspecified", specialty: "cardiology",
    actions: [
      { type: "lab", label: "Complete Blood Count", priority: 10, detail: "CBC" },
      { type: "lab", label: "C-Reactive Protein", priority: 10, detail: "CRP" },
      { type: "lab", label: "Basic Metabolic Panel", priority: 9, detail: "BMP" },
      { type: "medication", label: "Levofloxacin 500mg", priority: 10, detail: "Empiric antibiotic" },
      { type: "medication", label: "Paracetamol 500mg", priority: 7, detail: "Antipyretic" },
      { type: "imaging", label: "Chest X-ray PA & Lateral", priority: 8, detail: "X-ray" },
      { type: "consult", label: "Penyakit Dalam", priority: 9, detail: "internal_medicine" },
    ] },
  { code: "R57", name: "Septic shock", specialty: "cardiology",
    actions: [
      { type: "lab", label: "Complete Blood Count", priority: 10, detail: "CBC" },
      { type: "lab", label: "C-Reactive Protein", priority: 10, detail: "CRP" },
      { type: "lab", label: "Basic Metabolic Panel", priority: 10, detail: "BMP" },
      { type: "medication", label: "Levofloxacin 500mg", priority: 10, detail: "Broad spectrum" },
      { type: "respiratory", label: "Oxygen therapy", priority: 10, detail: "oxygen" },
      { type: "consult", label: "Penyakit Dalam", priority: 10, detail: "internal_medicine" },
    ] },
  { code: "A91", name: "Dengue hemorrhagic fever", specialty: "cardiology",
    actions: [
      { type: "lab", label: "Complete Blood Count", priority: 10, detail: "CBC" },
      { type: "lab", label: "Platelet Count", priority: 10, detail: "PLT" },
      { type: "lab", label: "Hematocrit", priority: 9, detail: "HCT" },
      { type: "lab", label: "C-Reactive Protein", priority: 7, detail: "CRP" },
      { type: "medication", label: "Paracetamol 500mg", priority: 8, detail: "Antipyretic" },
      { type: "medication", label: "Ringer's Lactate IV", priority: 8, detail: "fluid_resuscitation" },
      { type: "consult", label: "Penyakit Dalam", priority: 9, detail: "internal_medicine" },
    ] },
  { code: "A01", name: "Typhoid fever", specialty: "cardiology",
    actions: [
      { type: "medication", label: "Ciprofloxacin 500mg", priority: 9, detail: "Antibiotic for typhoid" },
      { type: "lab", label: "Complete Blood Count", priority: 8, detail: "CBC" },
      { type: "lab", label: "C-Reactive Protein", priority: 7, detail: "CRP" },
      { type: "diet", label: "Soft diet", priority: 5, detail: "soft" },
    ] },
  { code: "B50", name: "Malaria", specialty: "cardiology",
    actions: [
      { type: "lab", label: "Complete Blood Count", priority: 9, detail: "CBC" },
      { type: "lab", label: "Thick & Thin blood smear", priority: 10, detail: "malaria_smear" },
      { type: "medication", label: "Paracetamol 500mg", priority: 7, detail: "Antipyretic" },
    ] },
  { code: "T20", name: "Burns", specialty: "cardiology",
    actions: [
      { type: "medication", label: "Paracetamol 500mg", priority: 9, detail: "Analgesic" },
      { type: "medication", label: "Morphine 5mg", priority: 8, detail: "Severe pain" },
      { type: "medication", label: "Ringer's Lactate IV", priority: 9, detail: "fluid_resuscitation" },
      { type: "lab", label: "Complete Blood Count", priority: 6, detail: "CBC" },
      { type: "consult", label: "Bedah Umum", priority: 8, detail: "surgery" },
    ] },
  { code: "A27", name: "Leptospirosis", specialty: "cardiology",
    actions: [
      { type: "medication", label: "Ciprofloxacin 500mg", priority: 8, detail: "Antibiotic" },
      { type: "lab", label: "Complete Blood Count", priority: 8, detail: "CBC" },
      { type: "lab", label: "C-Reactive Protein", priority: 7, detail: "CRP" },
      { type: "lab", label: "Basic Metabolic Panel", priority: 6, detail: "BMP" },
    ] },
  { code: "A82", name: "Rabies exposure", specialty: "cardiology",
    actions: [
      { type: "medication", label: "Paracetamol 500mg", priority: 7, detail: "Analgesic" },
      { type: "consult", label: "Penyakit Dalam", priority: 9, detail: "rabies_prophylaxis" },
    ] },
  { code: "T63", name: "Snake bite envenomation", specialty: "cardiology",
    actions: [
      { type: "medication", label: "Ringer's Lactate IV", priority: 9, detail: "fluid_resuscitation" },
      { type: "lab", label: "Complete Blood Count", priority: 8, detail: "CBC" },
      { type: "lab", label: "Coagulation profile", priority: 7, detail: "PT_INR" },
      { type: "consult", label: "Penyakit Dalam", priority: 8, detail: "antivenom" },
    ] },
  { code: "E11", name: "Diabetic foot / gangrene", specialty: "cardiology",
    actions: [
      { type: "medication", label: "Metformin 500mg", priority: 8, detail: "Diabetes control" },
      { type: "medication", label: "Enoxaparin 40mg", priority: 7, detail: "DVT prophylaxis" },
      { type: "lab", label: "Hemoglobin A1C", priority: 9, detail: "HBA1C" },
      { type: "lab", label: "Complete Blood Count", priority: 8, detail: "CBC" },
      { type: "imaging", label: "Extremity X-ray Left Ankle", priority: 7, detail: "X-ray" },
      { type: "consult", label: "Bedah Umum", priority: 9, detail: "debridement" },
    ] },
  { code: "P36", name: "Neonatal sepsis", specialty: "pediatrics",
    actions: [
      { type: "medication", label: "Ceftriaxone 1g", priority: 9, detail: "Antibiotic" },
      { type: "lab", label: "Complete Blood Count", priority: 9, detail: "CBC" },
      { type: "lab", label: "C-Reactive Protein", priority: 8, detail: "CRP" },
      { type: "consult", label: "Anak", priority: 10, detail: "pediatrics" },
    ] },
  { code: "I05", name: "Rheumatic heart disease", specialty: "cardiology",
    actions: [
      { type: "medication", label: "Furosemide 40mg", priority: 8, detail: "Diuretic" },
      { type: "lab", label: "C-Reactive Protein", priority: 7, detail: "CRP" },
      { type: "imaging", label: "Echocardiogram", priority: 9, detail: "echo" },
      { type: "consult", label: "Jantung", priority: 9, detail: "cardiology" },
    ] },
  { code: "B86", name: "Scabies", specialty: "cardiology",
    actions: [
      { type: "medication", label: "Permethrin 5% cream", priority: 9, detail: "Scabicide" },
      { type: "consult", label: "Kulit Kelamin", priority: 7, detail: "dermatology" },
    ] },
];

export const VITALS_RULES: VitalsRule[] = [
  { param: "heartRate", condition: "gt", threshold: 100, actions: [
    { type: "lab", label: "Troponin I", priority: 7, detail: "TROP" },
    { type: "lab", label: "Complete Blood Count", priority: 5, detail: "CBC" },
    { type: "consult", label: "Jantung", priority: 6, detail: "cardiology" },
  ] },
  { param: "oxygenSaturation", condition: "lt", threshold: 92, actions: [
    { type: "respiratory", label: "Oxygen therapy", priority: 9, detail: "oxygen" },
    { type: "imaging", label: "Chest X-ray PA & Lateral", priority: 8, detail: "X-ray" },
    { type: "lab", label: "Complete Blood Count", priority: 5, detail: "CBC" },
    { type: "consult", label: "Paru", priority: 6, detail: "pulmonology" },
  ] },
  { param: "bloodPressureSystolic", condition: "gt", threshold: 160, actions: [
    { type: "medication", label: "Enalapril 5mg", priority: 8, detail: "Antihypertensive" },
    { type: "lab", label: "Basic Metabolic Panel", priority: 5, detail: "BMP" },
  ] },
  { param: "bloodPressureSystolic", condition: "lt", threshold: 90, actions: [
    { type: "lab", label: "Basic Metabolic Panel", priority: 7, detail: "BMP" },
    { type: "lab", label: "Complete Blood Count", priority: 7, detail: "CBC" },
  ] },
  { param: "temperature", condition: "gt", threshold: 38, actions: [
    { type: "medication", label: "Paracetamol 500mg", priority: 8, detail: "Antipyretic" },
    { type: "lab", label: "Complete Blood Count", priority: 7, detail: "CBC" },
    { type: "lab", label: "C-Reactive Protein", priority: 7, detail: "CRP" },
  ] },
  { param: "respiratoryRate", condition: "gt", threshold: 24, actions: [
    { type: "imaging", label: "Chest X-ray PA & Lateral", priority: 7, detail: "X-ray" },
    { type: "respiratory", label: "Oxygen therapy", priority: 7, detail: "oxygen" },
    { type: "lab", label: "Complete Blood Count", priority: 5, detail: "CBC" },
  ] },
  { param: "painLevel", condition: "gte", threshold: 6, actions: [
    { type: "medication", label: "Paracetamol 500mg", priority: 7, detail: "Analgesic" },
  ] },
];

export function mapIcdToSpecialty(code: string): SpecialtyType {
  const p = ICD_PROTOCOLS.find(p => p.code === code);
  return p?.specialty ?? "cardiology";
}

export function mapIcdToActions(code: string): ClinicalAction[] {
  const p = ICD_PROTOCOLS.find(p => p.code === code);
  return p?.actions ?? [];
}

export function getVitalsTriggers(vitals: Vitals): ClinicalAction[] {
  const actions: ClinicalAction[] = [];
  for (const rule of VITALS_RULES) {
    const val = vitals[rule.param] as number;
    let triggered = false;
    if (rule.condition === "gt" && val > rule.threshold) triggered = true;
    else if (rule.condition === "lt" && val < rule.threshold) triggered = true;
    else if (rule.condition === "gte" && val >= rule.threshold) triggered = true;
    else if (rule.condition === "lte" && val <= rule.threshold) triggered = true;
    if (triggered) actions.push(...rule.actions);
  }
  return actions;
}

export function assessQsofa(vitals: Vitals, age: number, diagnoses: { code: string }[]): { score: number; likelySepsis: boolean; details: string[] } {
  let score = 0;
  const details: string[] = [];
  if (vitals.respiratoryRate >= 22) { score++; details.push(`RR ${vitals.respiratoryRate} ≥ 22 (+1)`); }
  if (vitals.bloodPressureSystolic <= 100) { score++; details.push(`SBP ${vitals.bloodPressureSystolic} ≤ 100 (+1)`); }
  const neuroDiag = diagnoses.some(d => ["G40", "I63", "S06", "G20", "F32", "F41"].includes(d.code));
  if (age > 65 || neuroDiag) { score++; details.push(`Altered mentation risk: age > 65 or neuro diagnosis (+1)`); }
  return { score, likelySepsis: score >= 2, details };
}

export interface EscalationTrigger {
  condition: string;
  reason: string;
  escalationAction: ClinicalAction;
}

export const ESCALATION_TRIGGERS: EscalationTrigger[] = [
  { condition: "qSOFA ≥ 2 + fever", reason: "Suspected sepsis — escalate to senior physician", escalationAction: { type: "consult", label: "Penyakit Dalam", priority: 10, detail: "sepsis_alert" } },
  { condition: "HR > 120 + SBP < 90", reason: "Hemodynamic instability — ICU review needed", escalationAction: { type: "consult", label: "Jantung", priority: 10, detail: "icu_alert" } },
  { condition: "SpO2 < 88 on oxygen", reason: "Hypoxic respiratory failure — consider ventilator", escalationAction: { type: "respiratory", label: "Ventilator support", priority: 10, detail: "ventilator" } },
  { condition: "Temp > 39.5", reason: "Severe hyperpyrexia — aggressive cooling needed", escalationAction: { type: "medication", label: "Paracetamol 500mg", priority: 9, detail: "Antipyretic" } },
  { condition: "Pain > 8", reason: "Severe uncontrolled pain — opioid protocol", escalationAction: { type: "medication", label: "Diazepam 5mg", priority: 9, detail: "severe_pain" } },
  { condition: "GCS decline + neuro diagnosis", reason: "Neurological deterioration — urgent imaging", escalationAction: { type: "imaging", label: "CT Head without contrast", priority: 10, detail: "CT" } },
];

export function assessMortalityRisk(age: number, vitals: Vitals, diagnoses: { code: string }[]): { score: number; risk: "low" | "moderate" | "high"; factors: string[] } {
  let score = 0;
  const factors: string[] = [];
  if (age > 75) { score += 2; factors.push("Age > 75"); }
  else if (age > 60) { score += 1; factors.push("Age > 60"); }
  if (vitals.oxygenSaturation < 90) { score += 2; factors.push("SpO2 < 90%"); }
  if (vitals.bloodPressureSystolic < 90) { score += 2; factors.push("SBP < 90 mmHg"); }
  if (vitals.heartRate > 120 || vitals.heartRate < 50) { score += 1; factors.push("HR abnormal"); }
  if (vitals.temperature > 39) { score += 1; factors.push("Fever > 39°C"); }
  if (vitals.respiratoryRate > 24) { score += 1; factors.push("RR > 24"); }
  const criticalDx = ["I21", "I50", "R57", "A41", "I63", "J84", "A91"].some(c => diagnoses.some(d => d.code === c));
  if (criticalDx) { score += 2; factors.push("Critical diagnosis"); }
  const multiMorbidity = diagnoses.length >= 3;
  if (multiMorbidity) { score += 1; factors.push("≥ 3 comorbidities"); }
  const risk = score >= 5 ? "high" : score >= 3 ? "moderate" : "low";
  return { score, risk, factors };
}
