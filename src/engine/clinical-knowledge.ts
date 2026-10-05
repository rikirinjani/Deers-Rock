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
  { code: "A01", name: "Typhoid fever", specialty: "internal_medicine",
    actions: [
      { type: "medication", label: "Ciprofloxacin 500mg", priority: 9, detail: "Antibiotic for typhoid" },
      { type: "lab", label: "Blood culture", priority: 9, detail: "blood_culture" },
      { type: "lab", label: "Complete Blood Count", priority: 8, detail: "CBC" },
      { type: "lab", label: "C-Reactive Protein", priority: 7, detail: "CRP" },
      { type: "diet", label: "Soft diet", priority: 5, detail: "soft" },
    ] },
  { code: "B50", name: "Malaria", specialty: "internal_medicine",
    actions: [
      { type: "lab", label: "Complete Blood Count", priority: 9, detail: "CBC" },
      { type: "lab", label: "Thick & Thin blood smear", priority: 10, detail: "malaria_smear" },
      { type: "medication", label: "Artemisinin-combination therapy", priority: 9, detail: "antimalarial" },
      { type: "medication", label: "Paracetamol 500mg", priority: 7, detail: "Antipyretic" },
    ] },
  { code: "T20", name: "Burns", specialty: "surgery",
    actions: [
      { type: "medication", label: "Paracetamol 500mg", priority: 9, detail: "Analgesic" },
      { type: "medication", label: "Morphine 5mg", priority: 8, detail: "Severe pain" },
      { type: "medication", label: "Ringer's Lactate IV", priority: 9, detail: "fluid_resuscitation" },
      { type: "lab", label: "Complete Blood Count", priority: 6, detail: "CBC" },
      { type: "consult", label: "Bedah Umum", priority: 8, detail: "surgery" },
    ] },
  { code: "A27", name: "Leptospirosis", specialty: "internal_medicine",
    actions: [
      { type: "medication", label: "Ciprofloxacin 500mg", priority: 8, detail: "Antibiotic" },
      { type: "lab", label: "Complete Blood Count", priority: 8, detail: "CBC" },
      { type: "lab", label: "C-Reactive Protein", priority: 7, detail: "CRP" },
      { type: "lab", label: "Basic Metabolic Panel", priority: 6, detail: "BMP" },
    ] },
  { code: "A82", name: "Rabies exposure", specialty: "neurology",
    actions: [
      { type: "medication", label: "Rabies immunoglobulin", priority: 10, detail: "rabies_ig" },
      { type: "medication", label: "Rabies vaccine", priority: 10, detail: "rabies_vaccine" },
      { type: "medication", label: "Paracetamol 500mg", priority: 7, detail: "Analgesic" },
      { type: "consult", label: "Saraf", priority: 9, detail: "rabies_prophylaxis" },
    ] },
  { code: "T63", name: "Snake bite envenomation", specialty: "emergency",
    actions: [
      { type: "medication", label: "Polyvalent antivenom", priority: 10, detail: "antivenom" },
      { type: "medication", label: "Ringer's Lactate IV", priority: 9, detail: "fluid_resuscitation" },
      { type: "lab", label: "Complete Blood Count", priority: 8, detail: "CBC" },
      { type: "lab", label: "Coagulation profile", priority: 7, detail: "PT_INR" },
      { type: "consult", label: "Penyakit Dalam", priority: 8, detail: "internal_medicine" },
    ] },
  { code: "E11", name: "Diabetic foot / gangrene", specialty: "surgery",
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
  // ── ADR-010: NEW protocols for expanded ICD-10 generator ────────
  // Infectious diseases
  { code: "U07", name: "COVID-19", specialty: "pulmonology",
    actions: [
      { type: "lab", label: "Complete Blood Count", priority: 9, detail: "CBC" },
      { type: "lab", label: "C-Reactive Protein", priority: 9, detail: "CRP" },
      { type: "imaging", label: "Chest X-ray PA & Lateral", priority: 9, detail: "X-ray" },
      { type: "respiratory", label: "Oxygen therapy", priority: 8, detail: "oxygen" },
      { type: "medication", label: "Dexamethasone 4mg", priority: 9, detail: "Steroid for severe" },
      { type: "consult", label: "Penyakit Dalam", priority: 8, detail: "internal_medicine" },
    ] },
  { code: "A95", name: "Chikungunya", specialty: "internal_medicine",
    actions: [
      { type: "lab", label: "Complete Blood Count", priority: 9, detail: "CBC" },
      { type: "lab", label: "Dengue NS1 / IgM", priority: 8, detail: "dengue_rapid" },
      { type: "medication", label: "Paracetamol 500mg", priority: 8, detail: "Antipyretic/analgesic" },
      { type: "diet", label: "Liquid diet", priority: 6, detail: "hydration" },
    ] },
  { code: "A37", name: "Pertussis", specialty: "pulmonology",
    actions: [
      { type: "medication", label: "Azithromycin 500mg", priority: 9, detail: "Macrolide antibiotic" },
      { type: "lab", label: "PCR nasofaring", priority: 8, detail: "pertussis_pcr" },
      { type: "lab", label: "Complete Blood Count", priority: 6, detail: "CBC" },
    ] },
  { code: "A30", name: "Leprosy", specialty: "internal_medicine",
    actions: [
      { type: "medication", label: "Rifampicin 150mg", priority: 9, detail: "MDT rifampicin" },
      { type: "medication", label: "Dapsone 100mg", priority: 9, detail: "MDT dapsone" },
      { type: "lab", label: "Liver function test", priority: 7, detail: "LFT" },
      { type: "consult", label: "Penyakit Dalam", priority: 7, detail: "internal_medicine" },
    ] },
  { code: "A39", name: "Meningococcal infection", specialty: "emergency",
    actions: [
      { type: "medication", label: "Ceftriaxone 1g", priority: 10, detail: "IV antibiotic emergency" },
      { type: "lab", label: "Complete Blood Count", priority: 9, detail: "CBC" },
      { type: "lab", label: "Lumbar puncture", priority: 9, detail: "CSF_analysis" },
      { type: "consult", label: "Penyakit Dalam", priority: 9, detail: "emergency" },
    ] },
  { code: "A40", name: "Streptococcal sepsis", specialty: "emergency",
    actions: [
      { type: "medication", label: "Penicillin G", priority: 10, detail: "IV penicillin" },
      { type: "medication", label: "Ceftriaxone 1g", priority: 9, detail: "Broad spectrum" },
      { type: "lab", label: "Blood culture", priority: 10, detail: "blood_culture" },
      { type: "lab", label: "Complete Blood Count", priority: 9, detail: "CBC" },
    ] },
  { code: "A49", name: "Bacterial sepsis unspecified", specialty: "emergency",
    actions: [
      { type: "medication", label: "Levofloxacin 500mg", priority: 9, detail: "Empiric antibiotic" },
      { type: "medication", label: "Ceftriaxone 1g", priority: 9, detail: "Broad spectrum" },
      { type: "lab", label: "Blood culture", priority: 10, detail: "blood_culture" },
      { type: "lab", label: "Lactate", priority: 9, detail: "lactate" },
      { type: "respiratory", label: "Oxygen therapy", priority: 8, detail: "oxygen" },
    ] },
  // Viral/parasitic
  { code: "B18", name: "Chronic hepatitis B", specialty: "internal_medicine",
    actions: [
      { type: "lab", label: "HBsAg, HBeAg", priority: 9, detail: "hepatitis_b_panel" },
      { type: "lab", label: "Liver function test", priority: 9, detail: "LFT" },
      { type: "medication", label: "Tenofovir 300mg", priority: 8, detail: "Antiviral" },
      { type: "imaging", label: "Abdominal ultrasound", priority: 7, detail: "liver_us" },
    ] },
  { code: "B19", name: "Unspecified viral hepatitis", specialty: "internal_medicine",
    actions: [
      { type: "lab", label: "Liver function test", priority: 9, detail: "LFT" },
      { type: "lab", label: "Hepatitis panel", priority: 9, detail: "hepatitis_serology" },
      { type: "diet", label: "Low-fat diet", priority: 6, detail: "hepatic_diet" },
    ] },
  // Neoplasms
  { code: "C34", name: "Malignant neoplasm of lung", specialty: "surgery",
    actions: [
      { type: "imaging", label: "CT Thorax with contrast", priority: 10, detail: "chest_ct" },
      { type: "lab", label: "Complete Blood Count", priority: 8, detail: "CBC" },
      { type: "lab", label: "Tumor marker (CEA, CYFRA)", priority: 7, detail: "tumor_marker" },
      { type: "consult", label: "Onkologi", priority: 10, detail: "surgery" },
      { type: "medication", label: "Paracetamol 500mg", priority: 6, detail: "Symptomatic" },
    ] },
  { code: "C16", name: "Malignant neoplasm of stomach", specialty: "surgery",
    actions: [
      { type: "imaging", label: "CT Abdomen with contrast", priority: 10, detail: "abdomen_ct" },
      { type: "lab", label: "Complete Blood Count", priority: 8, detail: "CBC" },
      { type: "lab", label: "Ferritin, Iron studies", priority: 7, detail: "iron_studies" },
      { type: "consult", label: "Bedah Umum", priority: 10, detail: "surgery" },
    ] },
  { code: "C22", name: "Malignant neoplasm of liver", specialty: "surgery",
    actions: [
      { type: "imaging", label: "CT/MRI Abdomen", priority: 10, detail: "liver_imaging" },
      { type: "lab", label: "Liver function test", priority: 9, detail: "LFT" },
      { type: "lab", label: "AFP", priority: 9, detail: "tumor_marker" },
      { type: "consult", label: "Onkologi", priority: 10, detail: "surgery" },
    ] },
  { code: "C18", name: "Malignant neoplasm of colon", specialty: "surgery",
    actions: [
      { type: "imaging", label: "CT Abdomen/Pelvis", priority: 10, detail: "abdomen_ct" },
      { type: "lab", label: "CEA", priority: 9, detail: "tumor_marker" },
      { type: "lab", label: "Complete Blood Count", priority: 7, detail: "CBC" },
      { type: "consult", label: "Bedah Umum", priority: 10, detail: "surgery" },
    ] },
  { code: "C53", name: "Malignant neoplasm of cervix", specialty: "obgyn",
    actions: [
      { type: "lab", label: "Pap smear / HPV test", priority: 10, detail: "cervical_screening" },
      { type: "imaging", label: "Pelvic MRI", priority: 9, detail: "pelvic_mri" },
      { type: "consult", label: "Obstetri Ginekologi", priority: 10, detail: "obgyn" },
    ] },
  { code: "C67", name: "Malignant neoplasm of bladder", specialty: "surgery",
    actions: [
      { type: "lab", label: "Urinalysis + cytology", priority: 9, detail: "UA_cytology" },
      { type: "imaging", label: "CT Urogram", priority: 9, detail: "ct_urogram" },
      { type: "consult", label: "Urologi", priority: 10, detail: "urology" },
    ] },
  { code: "C70", name: "Malignant neoplasm of thyroid", specialty: "surgery",
    actions: [
      { type: "imaging", label: "Thyroid ultrasound", priority: 10, detail: "thyroid_us" },
      { type: "lab", label: "TSH, Free T4", priority: 9, detail: "thyroid_function" },
      { type: "consult", label: "Bedah Umum", priority: 9, detail: "surgery" },
    ] },
  { code: "C85", name: "Non-Hodgkin lymphoma", specialty: "surgery",
    actions: [
      { type: "lab", label: "Complete Blood Count", priority: 9, detail: "CBC" },
      { type: "imaging", label: "CT Whole body", priority: 10, detail: "staging_ct" },
      { type: "consult", label: "Onkologi", priority: 10, detail: "surgery" },
    ] },
  { code: "C91", name: "Lymphoid leukemia", specialty: "surgery",
    actions: [
      { type: "lab", label: "Complete Blood Count + smear", priority: 10, detail: "CBC_smear" },
      { type: "lab", label: "Bone marrow biopsy", priority: 10, detail: "bone_marrow" },
      { type: "consult", label: "Onkologi", priority: 10, detail: "surgery" },
    ] },
  // Blood disorders
  { code: "D55", name: "Hemolytic anemia G6PD", specialty: "internal_medicine",
    actions: [
      { type: "lab", label: "G6PD enzyme assay", priority: 10, detail: "g6pd_test" },
      { type: "lab", label: "Complete Blood Count", priority: 9, detail: "CBC" },
      { type: "lab", label: "Haptoglobin, LDH", priority: 8, detail: "hemolysis_panel" },
      { type: "diet", label: "Avoid fava beans", priority: 7, detail: "trigger_avoidance" },
    ] },
  { code: "D57", name: "Sickle cell disease", specialty: "internal_medicine",
    actions: [
      { type: "lab", label: "Hemoglobin electrophoresis", priority: 10, detail: "Hb electrophoresis" },
      { type: "lab", label: "Complete Blood Count", priority: 9, detail: "CBC" },
      { type: "medication", label: "Folic acid 1mg", priority: 7, detail: "Supplementation" },
      { type: "medication", label: "Paracetamol 500mg", priority: 6, detail: "Pain management" },
    ] },
  { code: "D69", name: "Immune thrombocytopenic purpura", specialty: "internal_medicine",
    actions: [
      { type: "lab", label: "Complete Blood Count", priority: 10, detail: "CBC_with_platelets" },
      { type: "medication", label: "Prednisone 5mg", priority: 8, detail: "First-line steroid" },
      { type: "consult", label: "Penyakit Dalam", priority: 8, detail: "internal_medicine" },
    ] },
  // Endocrine
  { code: "E03", name: "Hypothyroidism", specialty: "internal_medicine",
    actions: [
      { type: "lab", label: "TSH, Free T4", priority: 10, detail: "thyroid_function" },
      { type: "medication", label: "Levothyroxine 100mcg", priority: 9, detail: "Thyroid replacement" },
      { type: "lab", label: "Lipid profile", priority: 6, detail: "lipid_panel" },
    ] },
  { code: "E04", name: "Toxic nodular goiter", specialty: "internal_medicine",
    actions: [
      { type: "lab", label: "TSH, Free T4, Free T3", priority: 9, detail: "thyroid_panel" },
      { type: "imaging", label: "Thyroid ultrasound", priority: 8, detail: "thyroid_us" },
      { type: "medication", label: "Propylthiouracil 100mg", priority: 8, detail: "Antithyroid" },
      { type: "consult", label: "Endokrinologi", priority: 9, detail: "endocrinology" },
    ] },
  { code: "E24", name: "Cushing's syndrome", specialty: "internal_medicine",
    actions: [
      { type: "lab", label: "Cortisol 24h, Dexamethasone suppression", priority: 10, detail: "cortisol_workup" },
      { type: "imaging", label: "CT Adrenal/Pituitary", priority: 9, detail: "adrenal_ct" },
      { type: "medication", label: "Ketoconazole 200mg", priority: 7, detail: "Steroid inhibitor" },
    ] },
  { code: "E27", name: "Adrenal insufficiency", specialty: "internal_medicine",
    actions: [
      { type: "lab", label: "Morning cortisol, ACTH", priority: 10, detail: "adrenal_function" },
      { type: "medication", label: "Hydrocortisone 100mg", priority: 10, detail: "Stress-dose steroid" },
      { type: "lab", label: "Electrolytes (Na, K)", priority: 9, detail: "BMP" },
    ] },
  { code: "E21", name: "Hyperparathyroidism", specialty: "internal_medicine",
    actions: [
      { type: "lab", label: "Calcium, Phosphate, PTH", priority: 10, detail: "calcium_workup" },
      { type: "imaging", label: "Neck ultrasound", priority: 8, detail: "parathyroid_us" },
      { type: "consult", label: "Bedah Umum", priority: 8, detail: "surgery" },
    ] },
  // Mental disorders
  { code: "F31", name: "Bipolar disorder", specialty: "psychiatry",
    actions: [
      { type: "medication", label: "Valproate 200mg", priority: 9, detail: "Mood stabilizer" },
      { type: "medication", label: "Olanzapine 5mg", priority: 7, detail: "Antipsychotic" },
      { type: "consult", label: "Jiwa", priority: 10, detail: "psychiatry" },
      { type: "lab", label: "Liver function test", priority: 6, detail: "LFT" },
    ] },
  { code: "F20", name: "Schizophrenia", specialty: "psychiatry",
    actions: [
      { type: "medication", label: "Olanzapine 5mg", priority: 9, detail: "Antipsychotic" },
      { type: "medication", label: "Haloperidol 5mg", priority: 7, detail: "Acute agitation" },
      { type: "consult", label: "Jiwa", priority: 10, detail: "psychiatry" },
    ] },
  { code: "F90", name: "ADHD", specialty: "pediatrics",
    actions: [
      { type: "medication", label: "Methylphenidate 10mg", priority: 9, detail: "Stimulant" },
      { type: "consult", label: "Anak", priority: 8, detail: "pediatrics" },
      { type: "consult", label: "Jiwa", priority: 7, detail: "child_psych" },
    ] },
  { code: "F43", name: "PTSD", specialty: "psychiatry",
    actions: [
      { type: "medication", label: "Sertraline 50mg", priority: 9, detail: "SSRI" },
      { type: "consult", label: "Jiwa", priority: 10, detail: "psychiatry" },
      { type: "medication", label: "Prazosin 1mg", priority: 6, detail: "Nightmares" },
    ] },
  { code: "F42", name: "OCD", specialty: "psychiatry",
    actions: [
      { type: "medication", label: "Sertraline 50mg", priority: 9, detail: "SSRI high-dose" },
      { type: "consult", label: "Jiwa", priority: 9, detail: "psychiatry" },
    ] },
  { code: "F00", name: "Alzheimer's disease", specialty: "neurology",
    actions: [
      { type: "imaging", label: "Brain MRI", priority: 9, detail: "brain_mri" },
      { type: "lab", label: "Cognitive assessment (MMSE)", priority: 9, detail: "cognitive" },
      { type: "medication", label: "Donepezil 10mg", priority: 8, detail: "Cholinesterase inhibitor" },
      { type: "consult", label: "Saraf", priority: 9, detail: "neurology" },
    ] },
  { code: "F06", name: "Delirium", specialty: "emergency",
    actions: [
      { type: "lab", label: "Complete Blood Count", priority: 9, detail: "CBC" },
      { type: "lab", label: "Basic Metabolic Panel", priority: 9, detail: "BMP" },
      { type: "medication", label: "Haloperidol 5mg", priority: 7, detail: "Agitation control" },
      { type: "consult", label: "Penyakit Dalam", priority: 9, detail: "internal_medicine" },
    ] },
  // Nervous system
  { code: "G43", name: "Migraine", specialty: "neurology",
    actions: [
      { type: "medication", label: "Paracetamol 500mg", priority: 8, detail: "First-line analgesic" },
      { type: "medication", label: "Sumatriptan 50mg", priority: 9, detail: "Triptan" },
      { type: "medication", label: "Metoclopramide 10mg", priority: 7, detail: "Anti-emetic" },
      { type: "consult", label: "Saraf", priority: 7, detail: "neurology" },
    ] },
  { code: "G61", name: "Bell's palsy", specialty: "neurology",
    actions: [
      { type: "medication", label: "Prednisone 5mg", priority: 10, detail: "Steroid early treatment" },
      { type: "medication", label: "Valacyclovir 1g", priority: 7, detail: "Antiviral" },
      { type: "consult", label: "Saraf", priority: 8, detail: "neurology" },
    ] },
  { code: "G58", name: "Mononeuritis multiplex", specialty: "neurology",
    actions: [
      { type: "lab", label: "EMG/NCS", priority: 9, detail: "nerve_conduction" },
      { type: "lab", label: "ANA, RF, ANCA", priority: 8, detail: "autoimmune_panel" },
      { type: "consult", label: "Saraf", priority: 9, detail: "neurology" },
    ] },
  // Eye/Ear
  { code: "H10", name: "Acute conjunctivitis", specialty: "ophthalmology",
    actions: [
      { type: "medication", label: "Tobramycin eye drops", priority: 9, detail: "Antibiotic drops" },
      { type: "medication", label: "Prednisolone eye drops", priority: 6, detail: "Anti-inflammatory" },
    ] },
  { code: "H25", name: "Age-related cataract", specialty: "ophthalmology",
    actions: [
      { type: "imaging", label: "Slit lamp exam", priority: 9, detail: "ophthalmology_exam" },
      { type: "consult", label: "Mata", priority: 10, detail: "ophthalmology" },
      { type: "surgery", label: "Phacoemulsification", priority: 9, detail: "cataract_surgery" },
    ] },
  { code: "H81", name: "Meniere's disease", specialty: "ent",
    actions: [
      { type: "medication", label: "Betahistine 16mg", priority: 9, detail: "Vestibular suppressant" },
      { type: "medication", label: "Furosemide 40mg", priority: 6, detail: "Diuretic" },
      { type: "diet", label: "Low-sodium diet", priority: 7, detail: "salt_restriction" },
      { type: "consult", label: "THT", priority: 8, detail: "ent" },
    ] },
  // Circulatory
  { code: "I09", name: "Rheumatic valvulitis", specialty: "cardiology",
    actions: [
      { type: "imaging", label: "Echocardiogram", priority: 10, detail: "echo" },
      { type: "medication", label: "Penicillin G", priority: 9, detail: "Secondary prophylaxis" },
      { type: "lab", label: "ASO titer", priority: 7, detail: "strep_titer" },
      { type: "consult", label: "Jantung", priority: 9, detail: "cardiology" },
    ] },
  { code: "I25", name: "Chronic ischemic heart disease", specialty: "cardiology",
    actions: [
      { type: "medication", label: "Aspirin 80mg", priority: 10, detail: "Antiplatelet" },
      { type: "medication", label: "Atorvastatin 20mg", priority: 10, detail: "Statin" },
      { type: "medication", label: "Metoprolol 50mg", priority: 9, detail: "Beta-blocker" },
      { type: "imaging", label: "Stress test / Coronary angiography", priority: 9, detail: "stress_test" },
      { type: "consult", label: "Jantung", priority: 9, detail: "cardiology" },
    ] },
  { code: "I60", name: "Subarachnoid hemorrhage", specialty: "neurology",
    actions: [
      { type: "imaging", label: "CT Head without contrast", priority: 10, detail: "CT_head" },
      { type: "lab", label: "Lumbar puncture", priority: 9, detail: "CSF_analysis" },
      { type: "medication", label: "Nimodipine 60mg", priority: 9, detail: "Vasospasm prophylaxis" },
      { type: "consult", label: "Bedah Saraf", priority: 10, detail: "neurosurgery" },
    ] },
  { code: "I70", name: "Atherosclerosis", specialty: "cardiology",
    actions: [
      { type: "lab", label: "Lipid profile", priority: 9, detail: "lipid_panel" },
      { type: "medication", label: "Atorvastatin 20mg", priority: 10, detail: "Statin" },
      { type: "medication", label: "Aspirin 80mg", priority: 9, detail: "Antiplatelet" },
      { type: "imaging", label: "Duplex ultrasound", priority: 7, detail: "vascular_us" },
    ] },
  // Respiratory
  { code: "J14", name: "Haemophilus influenzae pneumonia", specialty: "pulmonology",
    actions: [
      { type: "medication", label: "Ceftriaxone 1g", priority: 10, detail: "IV antibiotic" },
      { type: "medication", label: "Levofloxacin 500mg", priority: 8, detail: "Alternative" },
      { type: "lab", label: "Sputum culture", priority: 8, detail: "sputum_culture" },
      { type: "imaging", label: "Chest X-ray PA & Lateral", priority: 9, detail: "X-ray" },
    ] },
  { code: "J47", name: "Bronchiectasis", specialty: "pulmonology",
    actions: [
      { type: "imaging", label: "CT Thorax high-resolution", priority: 10, detail: "HRCT_chest" },
      { type: "lab", label: "Sputum culture", priority: 8, detail: "sputum_culture" },
      { type: "medication", label: "Levofloxacin 500mg", priority: 8, detail: "Exacerbation antibiotic" },
      { type: "respiratory", label: "Chest physiotherapy", priority: 7, detail: "airway_clearance" },
    ] },
  { code: "J90", name: "Pleural effusion", specialty: "pulmonology",
    actions: [
      { type: "imaging", label: "Chest X-ray + Ultrasound", priority: 10, detail: "chest imaging" },
      { type: "lab", label: "Thoracentesis", priority: 9, detail: "pleural_fluid" },
      { type: "medication", label: "Furosemide 40mg", priority: 6, detail: "Diuretic if cardiac" },
      { type: "consult", label: "Paru", priority: 8, detail: "pulmonology" },
    ] },
  { code: "R23", name: "Pulmonary nodule", specialty: "pulmonology",
    actions: [
      { type: "imaging", label: "CT Thorax without contrast", priority: 10, detail: "lung_nodule_ct" },
      { type: "lab", label: "Tumor markers", priority: 6, detail: "tumor_marker" },
      { type: "consult", label: "Paru", priority: 8, detail: "pulmonology" },
    ] },
  // Digestive
  { code: "K21", name: "GERD", specialty: "internal_medicine",
    actions: [
      { type: "medication", label: "Omeprazole 20mg", priority: 9, detail: "PPI" },
      { type: "medication", label: "Pantoprazole 40mg", priority: 8, detail: "Alternative PPI" },
      { type: "diet", label: "Low-acid diet", priority: 7, detail: "diet_modification" },
      { type: "consult", label: "Penyakit Dalam", priority: 6, detail: "internal_medicine" },
    ] },
  { code: "K64", name: "Hemorrhoids", specialty: "surgery",
    actions: [
      { type: "medication", label: "Suppository hemorrhoid", priority: 8, detail: "topical_treatment" },
      { type: "diet", label: "High-fiber diet", priority: 7, detail: "fiber_supplement" },
      { type: "consult", label: "Bedah Umum", priority: 7, detail: "surgery" },
    ] },
  { code: "K85", name: "Acute pancreatitis", specialty: "surgery",
    actions: [
      { type: "lab", label: "Amylase, Lipase", priority: 10, detail: "pancreatic_enzymes" },
      { type: "lab", label: "Basic Metabolic Panel", priority: 9, detail: "BMP" },
      { type: "imaging", label: "CT Abdomen with contrast", priority: 9, detail: "abdomen_ct" },
      { type: "diet", label: "NPO + IV fluids", priority: 10, detail: "bowel_rest" },
      { type: "consult", label: "Bedah Umum", priority: 9, detail: "surgery" },
    ] },
  { code: "K74", name: "Hepatic fibrosis / cirrhosis", specialty: "internal_medicine",
    actions: [
      { type: "lab", label: "Liver function test", priority: 10, detail: "LFT" },
      { type: "lab", label: "Coagulation profile (PT/INR)", priority: 9, detail: "coagulation" },
      { type: "imaging", label: "Abdominal ultrasound", priority: 8, detail: "liver_us" },
      { type: "diet", label: "Low-sodium diet", priority: 7, detail: "cirrhosis_diet" },
      { type: "consult", label: "Penyakit Dalam", priority: 9, detail: "hepatology" },
    ] },
  { code: "K26", name: "Duodenal ulcer", specialty: "internal_medicine",
    actions: [
      { type: "lab", label: "H. pylori test", priority: 9, detail: "hp_test" },
      { type: "medication", label: "Omeprazole 20mg", priority: 10, detail: "PPI" },
      { type: "medication", label: "Amoxicillin 500mg", priority: 8, detail: "H. pylori eradication" },
      { type: "consult", label: "Penyakit Dalam", priority: 7, detail: "internal_medicine" },
    ] },
  // Musculoskeletal
  { code: "M75", name: "Rotator cuff syndrome", specialty: "surgery",
    actions: [
      { type: "imaging", label: "Shoulder MRI", priority: 9, detail: "shoulder_mri" },
      { type: "medication", label: "Ibuprofen 400mg", priority: 8, detail: "NSAID" },
      { type: "consult", label: "Orthopedi", priority: 8, detail: "orthopedics" },
      { type: "diet", label: "Physical therapy referral", priority: 7, detail: "rehab" },
    ] },
  { code: "G56", name: "Carpal tunnel syndrome", specialty: "neurology",
    actions: [
      { type: "lab", label: "Nerve conduction study", priority: 9, detail: "NCS" },
      { type: "medication", label: "Prednisone 5mg", priority: 7, detail: "Steroid trial" },
      { type: "consult", label: "Saraf", priority: 8, detail: "neurology" },
    ] },
  // Genitourinary
  { code: "N10", name: "Acute pyelonephritis", specialty: "internal_medicine",
    actions: [
      { type: "lab", label: "Urinalysis + culture", priority: 10, detail: "UA_culture" },
      { type: "medication", label: "Ceftriaxone 1g", priority: 9, detail: "IV antibiotic" },
      { type: "medication", label: "Paracetamol 500mg", priority: 7, detail: "Antipyretic" },
      { type: "consult", label: "Penyakit Dalam", priority: 7, detail: "nephrology" },
    ] },
  { code: "N17", name: "Acute kidney failure", specialty: "internal_medicine",
    actions: [
      { type: "lab", label: "Creatinine, BUN, Electrolytes", priority: 10, detail: "renal_panel" },
      { type: "imaging", label: "Renal ultrasound", priority: 8, detail: "renal_us" },
      { type: "medication", label: "Furosemide 40mg", priority: 7, detail: "Diuretic trial" },
      { type: "consult", label: "Penyakit Dalam", priority: 10, detail: "nephrology" },
      { type: "respiratory", label: "Oxygen therapy", priority: 6, detail: "supportive" },
    ] },
  { code: "N41", name: "Prostatitis", specialty: "surgery",
    actions: [
      { type: "lab", label: "Urinalysis + culture", priority: 9, detail: "UA_culture" },
      { type: "medication", label: "Ciprofloxacin 500mg", priority: 9, detail: "Antibiotic" },
      { type: "medication", label: "Ibuprofen 400mg", priority: 7, detail: "Anti-inflammatory" },
      { type: "consult", label: "Urologi", priority: 8, detail: "urology" },
    ] },
  // Obstetric
  { code: "O14", name: "Pre-eclampsia", specialty: "obgyn",
    actions: [
      { type: "lab", label: "Urinalysis (protein)", priority: 10, detail: "proteinuria" },
      { type: "lab", label: "Complete Blood Count", priority: 9, detail: "CBC" },
      { type: "lab", label: "Liver function test", priority: 9, detail: "LFT" },
      { type: "medication", label: "Labetalol 100mg", priority: 10, detail: "Antihypertensive" },
      { type: "medication", label: "Magnesium sulfate", priority: 10, detail: "Seizure prophylaxis" },
      { type: "consult", label: "Obstetri Ginekologi", priority: 10, detail: "obgyn" },
    ] },
  { code: "O15", name: "Eclampsia", specialty: "obgyn",
    actions: [
      { type: "medication", label: "Magnesium sulfate", priority: 10, detail: "Seizure control" },
      { type: "medication", label: "Labetalol 100mg", priority: 10, detail: "BP control" },
      { type: "lab", label: "Complete Blood Count", priority: 9, detail: "CBC" },
      { type: "lab", label: "Liver function test", priority: 9, detail: "LFT" },
      { type: "consult", label: "Obstetri Ginekologi", priority: 10, detail: "emergency_obgyn" },
    ] },
  // Perinatal
  { code: "P10", name: "Intracranial birth injury", specialty: "pediatrics",
    actions: [
      { type: "imaging", label: "Cranial ultrasound / CT", priority: 10, detail: "brain_imaging" },
      { type: "lab", label: "Complete Blood Count", priority: 8, detail: "CBC" },
      { type: "consult", label: "Anak", priority: 10, detail: "neonatology" },
      { type: "respiratory", label: "Oxygen therapy", priority: 7, detail: "supportive" },
    ] },
  { code: "P58", name: "Neonatal jaundice severe", specialty: "pediatrics",
    actions: [
      { type: "lab", label: "Total/direct bilirubin", priority: 10, detail: "bilirubin_level" },
      { type: "imaging", label: "Cranial ultrasound", priority: 7, detail: "brain_screening" },
      { type: "medication", label: "Phototherapy", priority: 10, detail: "phototherapy" },
      { type: "consult", label: "Anak", priority: 10, detail: "neonatology" },
    ] },
  // Congenital
  { code: "Q36", name: "Cleft lip", specialty: "surgery",
    actions: [
      { type: "consult", label: "Bedah Plastik", priority: 10, detail: "plastic_surgery" },
      { type: "consult", label: "THT", priority: 7, detail: "ent" },
      { type: "diet", label: "Special feeding", priority: 6, detail: "feeding_support" },
    ] },
  { code: "Q37", name: "Cleft palate", specialty: "surgery",
    actions: [
      { type: "consult", label: "Bedah Plastik", priority: 10, detail: "plastic_surgery" },
      { type: "consult", label: "THT", priority: 8, detail: "ent" },
      { type: "diet", label: "Special feeding", priority: 7, detail: "feeding_support" },
    ] },
  // Injury
  { code: "S22", name: "Fracture of rib(s)", specialty: "surgery",
    actions: [
      { type: "imaging", label: "Chest X-ray PA & Lateral", priority: 9, detail: "chest_xray" },
      { type: "medication", label: "Paracetamol 500mg", priority: 8, detail: "Analgesic" },
      { type: "medication", label: "Ibuprofen 400mg", priority: 7, detail: "NSAID" },
      { type: "consult", label: "Bedah Umum", priority: 7, detail: "surgery" },
    ] },
  { code: "S62", name: "Fracture of wrist/hand", specialty: "surgery",
    actions: [
      { type: "imaging", label: "X-ray Wrist/Hand AP & Lateral", priority: 10, detail: "extremity_xray" },
      { type: "medication", label: "Paracetamol 500mg", priority: 8, detail: "Analgesic" },
      { type: "medication", label: "Morphine 10mg", priority: 7, detail: "Severe pain" },
      { type: "consult", label: "Orthopedi", priority: 9, detail: "orthopedics" },
    ] },
  { code: "S06", name: "Concussion", specialty: "neurology",
    actions: [
      { type: "imaging", label: "CT Head without contrast", priority: 9, detail: "CT_head" },
      { type: "lab", label: "Neurological assessment (GCS)", priority: 10, detail: "gcs_assessment" },
      { type: "medication", label: "Paracetamol 500mg", priority: 6, detail: "Headache" },
      { type: "consult", label: "Saraf", priority: 8, detail: "neurology" },
    ] },
  // External causes
  { code: "T39", name: "Poisoning by analgesic", specialty: "emergency",
    actions: [
      { type: "lab", label: "Acetaminophen level", priority: 10, detail: "drug_level" },
      { type: "lab", label: "Liver function test", priority: 9, detail: "LFT" },
      { type: "medication", label: "N-acetylcysteine 100mg/kg", priority: 10, detail: "Antidote" },
      { type: "consult", label: "Tomun", priority: 10, detail: "toxicology" },
    ] },
  { code: "T81", name: "Complication following procedure", specialty: "surgery",
    actions: [
      { type: "lab", label: "Complete Blood Count", priority: 9, detail: "CBC" },
      { type: "imaging", label: "Targeted imaging", priority: 8, detail: "complication Imaging" },
      { type: "consult", label: "Bedah Umum", priority: 9, detail: "surgery" },
    ] },
  // Symptoms
  { code: "R07", name: "Chest pain", specialty: "cardiology",
    actions: [
      { type: "lab", label: "Troponin I", priority: 10, detail: "TROP" },
      { type: "imaging", label: "ECG", priority: 10, detail: "ecg" },
      { type: "lab", label: "Complete Blood Count", priority: 7, detail: "CBC" },
      { type: "medication", label: "Aspirin 80mg", priority: 9, detail: "Antiplatelet" },
      { type: "consult", label: "Jantung", priority: 9, detail: "cardiology" },
    ] },
  { code: "R50", name: "Fever unspecified", specialty: "internal_medicine",
    actions: [
      { type: "lab", label: "Complete Blood Count", priority: 8, detail: "CBC" },
      { type: "lab", label: "Blood culture", priority: 7, detail: "blood_culture" },
      { type: "medication", label: "Paracetamol 500mg", priority: 8, detail: "Antipyretic" },
      { type: "consult", label: "Penyakit Dalam", priority: 6, detail: "internal_medicine" },
    ] },
  { code: "R51", name: "Headache", specialty: "neurology",
    actions: [
      { type: "medication", label: "Paracetamol 500mg", priority: 8, detail: "Analgesic" },
      { type: "imaging", label: "CT Head if red flags", priority: 6, detail: "CT_head" },
      { type: "consult", label: "Saraf", priority: 7, detail: "neurology" },
    ] },
  { code: "R55", name: "Syncope and collapse", specialty: "cardiology",
    actions: [
      { type: "imaging", label: "ECG", priority: 10, detail: "ecg" },
      { type: "lab", label: "Complete Blood Count", priority: 8, detail: "CBC" },
      { type: "lab", label: "Basic Metabolic Panel", priority: 8, detail: "BMP" },
      { type: "imaging", label: "Echocardiogram", priority: 7, detail: "echo" },
      { type: "consult", label: "Jantung", priority: 8, detail: "cardiology" },
    ] },
  { code: "R70", name: "Elevated ESR", specialty: "internal_medicine",
    actions: [
      { type: "lab", label: "ESR, CRP", priority: 9, detail: "inflammation_markers" },
      { type: "lab", label: "Complete Blood Count", priority: 7, detail: "CBC" },
      { type: "consult", label: "Penyakit Dalam", priority: 6, detail: "internal_medicine" },
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

const TERMINAL_EVENTS: Record<string, string[]> = {
  I10: ["Hypertensive crisis", "Intracerebral hemorrhage"],
  E11: ["Diabetic ketoacidosis", "Hyperosmolar hyperglycemic state"],
  J15: ["Respiratory failure due to pneumonia", "Sepsis due to pneumonia"],
  N39: ["Urosepsis", "Septic shock"],
  J45: ["Status asthmaticus", "Respiratory arrest"],
  K29: ["Upper GI hemorrhage", "Perforated ulcer"],
  A91: ["Dengue shock syndrome", "Severe dengue with hemorrhage"],
  I50: ["Cardiogenic shock", "Acute pulmonary edema"],
  A09: ["Hypovolemic shock due to dehydration", "Acute renal failure"],
  E78: ["Acute myocardial infarction", "Acute ischemic stroke"],
  N18: ["End-stage renal disease", "Hyperkalemic cardiac arrest"],
  J44: ["Acute respiratory failure", "Ventilator-associated pneumonia"],
  G40: ["Status epilepticus", "Sudden unexpected death in epilepsy"],
  M17: ["Pulmonary embolism due to immobility"],
  F32: ["Suicide", "Self-harm"],
  O80: ["Postpartum hemorrhage", "Amniotic fluid embolism"],
  O20: ["Hemorrhagic shock due to abortion", "Sepsis due to incomplete abortion"],
  N20: ["Obstructive uropathy with sepsis", "Acute renal failure"],
  I21: ["Cardiogenic shock", "Ventricular arrhythmia", "Cardiac arrest"],
  S72: ["Fat embolism syndrome", "Postoperative pulmonary embolism"],
  P07: ["Neonatal respiratory distress syndrome", "Intraventricular hemorrhage"],
  H66: ["Intracranial complication of otitis media", "Meningitis"],
  J20: ["Respiratory failure", "Bronchiolitis obliterans"],
  K35: ["Perforated appendicitis with peritonitis", "Septic shock"],
  N40: ["Acute urinary retention with urosepsis"],
  C50: ["Metastatic breast cancer", "Sepsis due to neutropenia"],
  C61: ["Metastatic prostate cancer"],
  D25: ["Hemorrhagic shock due to uterine fibroid"],
  K80: ["Acute cholangitis with sepsis", "Gallstone pancreatitis"],
  M81: ["Hip fracture due to fall", "Pulmonary embolism"],
  E05: ["Thyroid storm", "Cardiac arrhythmia"],
  I63: ["Cerebral edema", "Brainstem herniation"],
  A15: ["Respiratory failure due to TB", "Hemoptysis due to cavitary TB"],
  B20: ["AIDS-defining opportunistic infection", "Wasting syndrome"],
  L03: ["Necrotizing fasciitis", "Sepsis due to cellulitis"],
  S06: ["Cerebral edema", "Intracranial hypertension"],
  T14: ["Hemorrhagic shock", "Wound sepsis"],
  E86: ["Hypovolemic shock", "Acute renal failure"],
  D64: ["Heart failure due to severe anemia", "Acute coronary syndrome"],
  A01: ["Intestinal perforation due to typhoid", "GI hemorrhage"],
  B50: ["Cerebral malaria", "Severe malarial anemia"],
  T20: ["Burn shock", "Inhalation injury"],
  A27: ["Weil's disease with multi-organ failure", "Pulmonary hemorrhage"],
  A82: ["Paralytic rabies", "Respiratory failure due to rabies"],
  T63: ["Anaphylactic shock", "Neurotoxic paralysis"],
  P36: ["Neonatal septic shock", "Neonatal meningitis"],
  I05: ["Acute rheumatic fever with carditis", "Mitral valve regurgitation"],
  B86: ["Secondary bacterial infection with sepsis"],
  M54: ["Septic arthritis", "Spinal infection"],
};

export function mapIcdToTerminalEvent(code: string, rng?: () => number): string | null {
  const events = TERMINAL_EVENTS[code];
  if (!events || events.length === 0) return null;
  const rand = rng ?? Math.random;
  return events[Math.floor(rand() * events.length)] ?? null;
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
