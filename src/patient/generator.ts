import type { Patient, Gender, Vitals, Diagnosis, BloodType, Rhesus } from "./schema.js";
import { generateIdentity } from "../identity/generator.js";

const firstNames: Record<Gender, string[]> = {
  male: ["Agus", "Bambang", "Cahyono", "Dwi", "Eko", "Hendra", "Joko", "Ketut", "Made", "Nyoman", "Putu", "Slamet", "Sigit", "Tri", "Wahyu", "Ahmad", "Burhan", "Daniel", "Edi", "Faisal", "Gatot", "Hasan", "Irwan", "Kusno", "Lukman", "Marwan", "Nurdin", "Pardi", "Rahmat", "Supardi", "Taufik", "Usman", "Wawan", "Yusuf", "Zainal"],
  female: ["Ani", "Budi", "Citra", "Dewi", "Endang", "Fitri", "Indah", "Kartika", "Lestari", "Mega", "Nurul", "Putri", "Rina", "Sari", "Triana", "Aisyah", "Bunga", "Damayanti", "Elok", "Fatmawati", "Gita", "Hesti", "Intan", "Kumala", "Laras", "Maya", "Nadia", "Oktaviani", "Puspita", "Ratna", "Sumiati", "Tuti", "Wulandari", "Yuni", "Zahara"],
};

const lastNames = ["Pratama", "Wijaya", "Kusuma", "Hidayat", "Nugraha", "Santoso", "Wibowo", "Gunawan", "Susanto", "Saputra", "Utami", "Handayani", "Hasibuan", "Simanjuntak", "Siregar", "Nasution", "Saragih", "Hutapea", "Sihotang", "Situmorang", "Lestari", "Pertiwi", "Wulandari", "Purnomo", "Suryadi", "Saputro", "Hartono", "Setiawan", "Syahputra", "Mandala"];

interface ICDMapping {
  code: string;
  name: string;
  minAge: number;
  maxAge: number;
  genders: Gender[];
  weight: number;
}

const ICD10_DIAGNOSES: ICDMapping[] = [
  // ── Existing 52 (preserved) ────────────────────────────────────
  { code: "I10", name: "Essential hypertension", minAge: 35, maxAge: 99, genders: ["male", "female"], weight: 15 },
  { code: "E11", name: "Type 2 diabetes mellitus", minAge: 30, maxAge: 99, genders: ["male", "female"], weight: 12 },
  { code: "J15", name: "Bacterial pneumonia", minAge: 0, maxAge: 99, genders: ["male", "female"], weight: 8 },
  { code: "N39", name: "Urinary tract infection", minAge: 1, maxAge: 99, genders: ["male", "female"], weight: 7 },
  { code: "J45", name: "Asthma", minAge: 2, maxAge: 60, genders: ["male", "female"], weight: 6 },
  { code: "K29", name: "Gastritis", minAge: 15, maxAge: 80, genders: ["male", "female"], weight: 6 },
  { code: "A91", name: "Dengue hemorrhagic fever", minAge: 1, maxAge: 70, genders: ["male", "female"], weight: 7 },
  { code: "I50", name: "Heart failure", minAge: 50, maxAge: 99, genders: ["male", "female"], weight: 5 },
  { code: "A09", name: "Acute gastroenteritis", minAge: 0, maxAge: 99, genders: ["male", "female"], weight: 6 },
  { code: "E78", name: "Hyperlipidemia", minAge: 30, maxAge: 80, genders: ["male", "female"], weight: 8 },
  { code: "N18", name: "Chronic kidney disease", minAge: 40, maxAge: 99, genders: ["male", "female"], weight: 4 },
  { code: "J44", name: "COPD", minAge: 45, maxAge: 99, genders: ["male", "female"], weight: 4 },
  { code: "G40", name: "Epilepsy", minAge: 1, maxAge: 70, genders: ["male", "female"], weight: 3 },
  { code: "M17", name: "Osteoarthritis of knee", minAge: 40, maxAge: 85, genders: ["male", "female"], weight: 5 },
  { code: "F32", name: "Major depressive disorder", minAge: 15, maxAge: 70, genders: ["male", "female"], weight: 3 },
  { code: "O80", name: "Single spontaneous delivery", minAge: 15, maxAge: 45, genders: ["female"], weight: 3 },
  { code: "O20", name: "Threatened abortion", minAge: 15, maxAge: 45, genders: ["female"], weight: 2 },
  { code: "N20", name: "Renal colic / kidney stone", minAge: 20, maxAge: 70, genders: ["male", "female"], weight: 3 },
  { code: "I21", name: "Acute myocardial infarction", minAge: 40, maxAge: 90, genders: ["male", "female"], weight: 2 },
  { code: "S72", name: "Fracture of femur", minAge: 5, maxAge: 99, genders: ["male", "female"], weight: 3 },
  { code: "P07", name: "Preterm newborn", minAge: 0, maxAge: 0, genders: ["male", "female"], weight: 1 },
  { code: "H66", name: "Suppurative otitis media", minAge: 0, maxAge: 12, genders: ["male", "female"], weight: 3 },
  { code: "J20", name: "Acute bronchitis", minAge: 0, maxAge: 15, genders: ["male", "female"], weight: 3 },
  { code: "K35", name: "Acute appendicitis", minAge: 10, maxAge: 50, genders: ["male", "female"], weight: 2 },
  { code: "N40", name: "Benign prostatic hyperplasia", minAge: 50, maxAge: 99, genders: ["male"], weight: 3 },
  { code: "C50", name: "Malignant neoplasm of breast", minAge: 25, maxAge: 80, genders: ["female"], weight: 2 },
  { code: "C61", name: "Malignant neoplasm of prostate", minAge: 50, maxAge: 99, genders: ["male"], weight: 1 },
  { code: "D25", name: "Leiomyoma of uterus", minAge: 25, maxAge: 55, genders: ["female"], weight: 2 },
  { code: "K80", name: "Cholelithiasis", minAge: 25, maxAge: 75, genders: ["female", "male"], weight: 3 },
  { code: "M81", name: "Osteoporosis without fracture", minAge: 55, maxAge: 99, genders: ["female", "male"], weight: 3 },
  { code: "E05", name: "Hyperthyroidism", minAge: 20, maxAge: 60, genders: ["female", "male"], weight: 2 },
  { code: "I63", name: "Cerebral infarction", minAge: 45, maxAge: 99, genders: ["male", "female"], weight: 2 },
  { code: "J18", name: "Pneumonia unspecified", minAge: 0, maxAge: 99, genders: ["male", "female"], weight: 5 },
  { code: "A15", name: "Respiratory tuberculosis", minAge: 15, maxAge: 70, genders: ["male", "female"], weight: 2 },
  { code: "B20", name: "HIV disease", minAge: 15, maxAge: 60, genders: ["male", "female"], weight: 1 },
  { code: "L03", name: "Cellulitis", minAge: 5, maxAge: 85, genders: ["male", "female"], weight: 3 },
  { code: "S06", name: "Intracranial injury", minAge: 1, maxAge: 85, genders: ["male", "female"], weight: 2 },
  { code: "T14", name: "Open wound of unspecified body region", minAge: 5, maxAge: 70, genders: ["male", "female"], weight: 2 },
  { code: "E86", name: "Volume depletion / dehydration", minAge: 0, maxAge: 99, genders: ["male", "female"], weight: 3 },
  { code: "D64", name: "Anemia unspecified", minAge: 5, maxAge: 85, genders: ["female", "male"], weight: 4 },
  { code: "A01", name: "Typhoid fever", minAge: 2, maxAge: 70, genders: ["male", "female"], weight: 6 },
  { code: "B50", name: "Malaria", minAge: 1, maxAge: 80, genders: ["male", "female"], weight: 5 },
  { code: "T20", name: "Burns", minAge: 0, maxAge: 85, genders: ["male", "female"], weight: 3 },
  { code: "A27", name: "Leptospirosis", minAge: 10, maxAge: 70, genders: ["male", "female"], weight: 3 },
  { code: "A82", name: "Rabies exposure", minAge: 1, maxAge: 80, genders: ["male", "female"], weight: 2 },
  { code: "T63", name: "Snake bite envenomation", minAge: 5, maxAge: 75, genders: ["male", "female"], weight: 2 },
  { code: "P36", name: "Neonatal sepsis", minAge: 0, maxAge: 0, genders: ["male", "female"], weight: 3 },
  { code: "I05", name: "Rheumatic heart disease", minAge: 15, maxAge: 60, genders: ["male", "female"], weight: 2 },
  { code: "B86", name: "Scabies", minAge: 1, maxAge: 80, genders: ["male", "female"], weight: 2 },

  // ── NEW: Infectious diseases (A-chapter) ───────────────────────
  { code: "U07", name: "COVID-19", minAge: 0, maxAge: 99, genders: ["male", "female"], weight: 4 },
  { code: "A95", name: "Chikungunya", minAge: 1, maxAge: 80, genders: ["male", "female"], weight: 2 },
  { code: "A37", name: "Pertussis", minAge: 0, maxAge: 18, genders: ["male", "female"], weight: 1 },
  { code: "A30", name: "Leprosy", minAge: 5, maxAge: 70, genders: ["male", "female"], weight: 1 },
  { code: "A40", name: "Streptococcal sepsis", minAge: 0, maxAge: 99, genders: ["male", "female"], weight: 2 },
  { code: "A49", name: "Bacterial sepsis unspecified", minAge: 0, maxAge: 99, genders: ["male", "female"], weight: 2 },
  { code: "A39", name: "Meningococcal infection", minAge: 1, maxAge: 30, genders: ["male", "female"], weight: 1 },

  // ── NEW: Viral/parasitic (B-chapter) ──────────────────────────
  { code: "B18", name: "Chronic hepatitis B", minAge: 15, maxAge: 80, genders: ["male", "female"], weight: 2 },
  { code: "B19", name: "Unspecified viral hepatitis", minAge: 0, maxAge: 99, genders: ["male", "female"], weight: 2 },

  // ── NEW: Neoplasms (C-chapter) ────────────────────────────────
  { code: "C34", name: "Malignant neoplasm of lung", minAge: 40, maxAge: 99, genders: ["male", "female"], weight: 3 },
  { code: "C16", name: "Malignant neoplasm of stomach", minAge: 45, maxAge: 99, genders: ["male", "female"], weight: 2 },
  { code: "C22", name: "Malignant neoplasm of liver", minAge: 40, maxAge: 99, genders: ["male", "female"], weight: 2 },
  { code: "C18", name: "Malignant neoplasm of colon", minAge: 45, maxAge: 99, genders: ["male", "female"], weight: 2 },
  { code: "C53", name: "Malignant neoplasm of cervix", minAge: 25, maxAge: 70, genders: ["female"], weight: 2 },
  { code: "C70", name: "Malignant neoplasm of thyroid", minAge: 20, maxAge: 80, genders: ["female", "male"], weight: 2 },
  { code: "C91", name: "Lymphoid leukemia", minAge: 1, maxAge: 99, genders: ["male", "female"], weight: 1 },
  { code: "C85", name: "Non-Hodgkin lymphoma", minAge: 20, maxAge: 80, genders: ["male", "female"], weight: 1 },
  { code: "C67", name: "Malignant neoplasm of bladder", minAge: 50, maxAge: 99, genders: ["male", "female"], weight: 1 },

  // ── NEW: Blood disorders (D-chapter) ──────────────────────────
  { code: "D55", name: "Hemolytic anemia due to G6PD deficiency", minAge: 1, maxAge: 99, genders: ["male", "female"], weight: 1 },
  { code: "D69", name: "Immune thrombocytopenic purpura", minAge: 10, maxAge: 80, genders: ["male", "female"], weight: 1 },
  { code: "D57", name: "Sickle cell disease", minAge: 1, maxAge: 60, genders: ["male", "female"], weight: 2 },

  // ── NEW: Endocrine (E-chapter) ────────────────────────────────
  { code: "E03", name: "Hypothyroidism", minAge: 18, maxAge: 99, genders: ["female", "male"], weight: 5 },
  { code: "E04", name: "Toxic nodular goiter", minAge: 30, maxAge: 80, genders: ["female", "male"], weight: 2 },
  { code: "E20", name: "Hypoparathyroidism", minAge: 10, maxAge: 80, genders: ["male", "female"], weight: 1 },
  { code: "E24", name: "Cushing's syndrome", minAge: 20, maxAge: 70, genders: ["female", "male"], weight: 1 },
  { code: "E27", name: "Adrenal insufficiency", minAge: 20, maxAge: 80, genders: ["male", "female"], weight: 1 },
  { code: "E21", name: "Hyperparathyroidism", minAge: 30, maxAge: 99, genders: ["male", "female"], weight: 1 },

  // ── NEW: Mental disorders (F-chapter) ─────────────────────────
  { code: "F31", name: "Bipolar disorder", minAge: 15, maxAge: 70, genders: ["male", "female"], weight: 2 },
  { code: "F20", name: "Schizophrenia", minAge: 15, maxAge: 60, genders: ["male", "female"], weight: 2 },
  { code: "F90", name: "Attention-deficit hyperactivity disorder", minAge: 3, maxAge: 18, genders: ["male", "female"], weight: 2 },
  { code: "F43", name: "Post-traumatic stress disorder", minAge: 10, maxAge: 80, genders: ["male", "female"], weight: 2 },
  { code: "F42", name: "Obsessive-compulsive disorder", minAge: 10, maxAge: 70, genders: ["male", "female"], weight: 1 },
  { code: "F00", name: "Alzheimer's disease", minAge: 55, maxAge: 99, genders: ["male", "female"], weight: 2 },
  { code: "F06", name: "Delirium", minAge: 40, maxAge: 99, genders: ["male", "female"], weight: 2 },

  // ── NEW: Nervous system (G-chapter) ───────────────────────────
  { code: "G43", name: "Migraine", minAge: 10, maxAge: 70, genders: ["female", "male"], weight: 4 },
  { code: "G58", name: "Mononeuritis multiplex", minAge: 20, maxAge: 99, genders: ["male", "female"], weight: 1 },
  { code: "G61", name: "Bell's palsy", minAge: 15, maxAge: 80, genders: ["male", "female"], weight: 2 },

  // ── NEW: Eye/ear (H-chapter) ──────────────────────────────────
  { code: "H25", name: "Age-related cataract", minAge: 50, maxAge: 99, genders: ["male", "female"], weight: 3 },
  { code: "H10", name: "Acute conjunctivitis", minAge: 0, maxAge: 99, genders: ["male", "female"], weight: 3 },
  { code: "H81", name: "Meniere's disease", minAge: 30, maxAge: 80, genders: ["male", "female"], weight: 1 },

  // ── NEW: Circulatory (I-chapter) ──────────────────────────────
  { code: "I60", name: "Subarachnoid hemorrhage", minAge: 30, maxAge: 99, genders: ["male", "female"], weight: 2 },
  { code: "I70", name: "Atherosclerosis", minAge: 40, maxAge: 99, genders: ["male", "female"], weight: 3 },
  { code: "I48", name: "Atrial fibrillation", minAge: 40, maxAge: 99, genders: ["male", "female"], weight: 3 },
  { code: "I09", name: "Rheumatic valvulitis", minAge: 15, maxAge: 60, genders: ["male", "female"], weight: 1 },
  { code: "I25", name: "Chronic ischemic heart disease", minAge: 40, maxAge: 99, genders: ["male", "female"], weight: 2 },

  // ── NEW: Respiratory (J-chapter) ──────────────────────────────
  { code: "J47", name: "Bronchiectasis", minAge: 10, maxAge: 99, genders: ["male", "female"], weight: 2 },
  { code: "J90", name: "Pleural effusion", minAge: 1, maxAge: 99, genders: ["male", "female"], weight: 2 },
  { code: "J14", name: "Haemophilus influenzae pneumonia", minAge: 0, maxAge: 99, genders: ["male", "female"], weight: 2 },
  { code: "R23", name: "Pulmonary nodule", minAge: 30, maxAge: 99, genders: ["male", "female"], weight: 1 },

  // ── NEW: Digestive (K-chapter) ────────────────────────────────
  { code: "K21", name: "Gastro-esophageal reflux disease", minAge: 20, maxAge: 99, genders: ["male", "female"], weight: 5 },
  { code: "K64", name: "Hemorrhoids", minAge: 20, maxAge: 99, genders: ["male", "female"], weight: 3 },
  { code: "K85", name: "Acute pancreatitis", minAge: 18, maxAge: 99, genders: ["male", "female"], weight: 3 },
  { code: "K74", name: "Hepatic fibrosis / cirrhosis", minAge: 30, maxAge: 99, genders: ["male", "female"], weight: 2 },
  { code: "K56", name: "Intestinal obstruction", minAge: 20, maxAge: 99, genders: ["male", "female"], weight: 2 },
  { code: "K26", name: "Duodenal ulcer", minAge: 20, maxAge: 80, genders: ["male", "female"], weight: 3 },

  // ── NEW: Musculoskeletal (M-chapter) ──────────────────────────
  { code: "M75", name: "Rotator cuff syndrome", minAge: 30, maxAge: 80, genders: ["male", "female"], weight: 3 },
  { code: "G56", name: "Carpal tunnel syndrome", minAge: 30, maxAge: 80, genders: ["female", "male"], weight: 2 },

  // ── NEW: Genitourinary (N-chapter) ────────────────────────────
  { code: "N17", name: "Acute kidney failure", minAge: 1, maxAge: 99, genders: ["male", "female"], weight: 3 },
  { code: "N41", name: "Prostatitis", minAge: 20, maxAge: 80, genders: ["male"], weight: 2 },
  { code: "N10", name: "Acute pyelonephritis", minAge: 1, maxAge: 99, genders: ["female", "male"], weight: 3 },

  // ── NEW: Obstetric (O-chapter) ────────────────────────────────
  { code: "O14", name: "Pre-eclampsia", minAge: 15, maxAge: 45, genders: ["female"], weight: 3 },
  { code: "O15", name: "Eclampsia", minAge: 15, maxAge: 45, genders: ["female"], weight: 2 },

  // ── NEW: Perinatal (P-chapter) ────────────────────────────────
  { code: "P10", name: "Intracranial birth injury", minAge: 0, maxAge: 0, genders: ["male", "female"], weight: 1 },
  { code: "P58", name: "Neonatal jaundice due to haemolysis", minAge: 0, maxAge: 0, genders: ["male", "female"], weight: 2 },

  // ── NEW: Congenital (Q-chapter) ───────────────────────────────
  { code: "Q36", name: "Cleft lip", minAge: 0, maxAge: 0, genders: ["male", "female"], weight: 1 },
  { code: "Q37", name: "Cleft palate", minAge: 0, maxAge: 0, genders: ["male", "female"], weight: 1 },

  // ── NEW: Injury (S-chapter) ───────────────────────────────────
  { code: "S22", name: "Fracture of rib(s)", minAge: 5, maxAge: 99, genders: ["male", "female"], weight: 2 },
  { code: "S62", name: "Fracture of wrist/hand", minAge: 5, maxAge: 99, genders: ["male", "female"], weight: 2 },
  { code: "R51", name: "Headache", minAge: 1, maxAge: 85, genders: ["male", "female"], weight: 2 },

  // ── NEW: External causes (V-Y) ────────────────────────────────
  { code: "T39", name: "Poisoning by analgesic", minAge: 1, maxAge: 99, genders: ["male", "female"], weight: 1 },
  { code: "T81", name: "Complication following procedure", minAge: 1, maxAge: 99, genders: ["male", "female"], weight: 1 },

  // ── NEW: Symptoms (R-chapter) ─────────────────────────────────
  { code: "R50", name: "Fever unspecified", minAge: 0, maxAge: 99, genders: ["male", "female"], weight: 4 },
  { code: "R07", name: "Chest pain", minAge: 10, maxAge: 99, genders: ["male", "female"], weight: 4 },
  { code: "R55", name: "Syncope and collapse", minAge: 5, maxAge: 99, genders: ["male", "female"], weight: 3 },
  { code: "R70", name: "Elevated erythrocyte sedimentation rate", minAge: 1, maxAge: 99, genders: ["male", "female"], weight: 2 },
  // ── ADR-013: Chapter IX — Circulatory ──────────────────────────
  { code: "I73", name: "Peripheral vascular disease", minAge: 40, maxAge: 99, genders: ["male", "female"], weight: 4 },
  { code: "I80", name: "Phlebitis and thrombophlebitis", minAge: 20, maxAge: 99, genders: ["male", "female"], weight: 3 },
  { code: "I82", name: "Other venous embolism and thrombosis", minAge: 30, maxAge: 99, genders: ["male", "female"], weight: 2 },
  { code: "I11", name: "Hypertensive heart disease", minAge: 40, maxAge: 99, genders: ["male", "female"], weight: 4 },
  { code: "I12", name: "Hypertensive renal disease", minAge: 40, maxAge: 99, genders: ["male", "female"], weight: 3 },
  { code: "I00", name: "Rheumatic fever without heart involvement", minAge: 5, maxAge: 40, genders: ["male", "female"], weight: 2 },
  { code: "I33", name: "Acute endocarditis", minAge: 1, maxAge: 99, genders: ["male", "female"], weight: 2 },
  { code: "I30", name: "Acute pericarditis", minAge: 10, maxAge: 99, genders: ["male", "female"], weight: 2 },
  { code: "I49", name: "Other cardiac arrhythmias", minAge: 20, maxAge: 99, genders: ["male", "female"], weight: 3 },
  { code: "I42", name: "Cardiomyopathy", minAge: 20, maxAge: 99, genders: ["male", "female"], weight: 3 },
  { code: "I26", name: "Pulmonary embolism", minAge: 30, maxAge: 99, genders: ["male", "female"], weight: 3 },
  { code: "I77", name: "Other disorders of arteries and arterioles", minAge: 20, maxAge: 99, genders: ["male", "female"], weight: 2 },
  // ── ADR-013: Chapter X — Respiratory ──────────────────────────
  { code: "J06", name: "Acute upper respiratory infection", minAge: 0, maxAge: 99, genders: ["male", "female"], weight: 8 },
  { code: "J10", name: "Influenza due to identified influenza virus", minAge: 0, maxAge: 99, genders: ["male", "female"], weight: 5 },
  { code: "J11", name: "Influenza unspecified", minAge: 0, maxAge: 99, genders: ["male", "female"], weight: 4 },
  { code: "J96", name: "Respiratory failure", minAge: 1, maxAge: 99, genders: ["male", "female"], weight: 4 },
  { code: "J91", name: "Pleural effusion in conditions classified elsewhere", minAge: 10, maxAge: 99, genders: ["male", "female"], weight: 2 },
  // ── ADR-013: Chapter R — Symptoms ─────────────────────────────
  { code: "R31", name: "Hematuria", minAge: 5, maxAge: 99, genders: ["male", "female"], weight: 3 },
  { code: "R10", name: "Abdominal and pelvic pain", minAge: 5, maxAge: 99, genders: ["male", "female"], weight: 6 },
  // ── ADR-013: Chapter N — GU ───────────────────────────────────
  { code: "N19", name: "Unspecified renal failure", minAge: 1, maxAge: 99, genders: ["male", "female"], weight: 3 },
  // ── ADR-013: Chapter E — Endocrine ────────────────────────────
  { code: "E20", name: "Hypoparathyroidism", minAge: 10, maxAge: 80, genders: ["male", "female"], weight: 1 },
];

function pickWeighted<T extends { weight: number }>(items: T[], rng?: () => number): T {
  const rand = rng ?? Math.random;
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rand() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1]!;
}

function pickRandom<T>(arr: T[], rng?: () => number): T {
  const rand = rng ?? Math.random;
  return arr[Math.floor(rand() * arr.length)];
}

function generateVitals(age: number, gender: Gender, rng?: () => number): Vitals {
  const rand = rng ?? Math.random;
  const baseHR = gender === "male" ? 65 : 70;
  const baseSBP = age < 18 ? 100 : age < 40 ? 115 : age < 60 ? 125 : 135;
  return {
    heartRate: baseHR + Math.floor(rand() * 20),
    bloodPressureSystolic: baseSBP + Math.floor(rand() * 20),
    bloodPressureDiastolic: Math.max(60, baseSBP - 40 + Math.floor(rand() * 15)),
    temperature: +(36.5 + rand() * 0.8).toFixed(1),
    oxygenSaturation: 96 + Math.floor(rand() * 4),
    respiratoryRate: 14 + Math.floor(rand() * 8),
    painLevel: Math.floor(rand() * 5),
  };
}

function generateDiagnoses(age: number, gender: Gender, rng?: () => number): Diagnosis[] {
  const rand = rng ?? Math.random;
  const eligible = ICD10_DIAGNOSES.filter(d => age >= d.minAge && age <= d.maxAge && d.genders.includes(gender));
  if (eligible.length === 0) return [{ code: "Z00", name: "Encounter for general examination", active: true }];

  const numDiagnoses = 1 + Math.floor(rand() * 3);
  const selected: Diagnosis[] = [];
  const pool = [...eligible];
  for (let i = 0; i < numDiagnoses && pool.length > 0; i++) {
    const dx = pickWeighted(pool, rng);
    if (!selected.find(s => s.code === dx.code)) {
      selected.push({ code: dx.code, name: dx.name, active: true });
    }
    pool.splice(pool.indexOf(dx), 1);
  }
  return selected.length > 0 ? selected : [{ code: "Z00", name: "Encounter for general examination", active: true }];
}

const BLOOD_TYPES: BloodType[] = ["A", "B", "AB", "O"];
const RHESUS: Rhesus[] = ["+", "-"];
const ALLERGIES_POOL = ["None", "None", "None", "Penicillin", "Sulfa", "NSAIDs", "Aspirin", "Codeine", "Iodine contrast", "Latex", "Seafood", "Dust", "None", "None"];

let patientCounter = 0;
export function resetPatientCounter(): void { patientCounter = 0; }

export function generatePatient(rng?: () => number): Patient {
  const rand = rng ?? Math.random;
  patientCounter++;
  const gender: Gender = rand() > 0.5 ? "male" : "female";
  const identity = generateIdentity(gender, rng);
  const age = new Date().getFullYear() - parseInt(identity.birthDate.split("-")[2] ?? "1990");

  const bloodType = pickRandom(BLOOD_TYPES, rng);
  const rhesus = pickRandom(RHESUS, rng);

  return {
    id: `PAT-${String(patientCounter).padStart(4, "0")}`,
    name: `${pickRandom(firstNames[gender], rng)} ${pickRandom(lastNames, rng)}`,
    age,
    gender,
    identity,
    phone: `08${String(Math.floor(rand() * 1000000000)).padStart(10, "0")}`,
    bloodType: bloodType as BloodType,
    rhesus: rhesus as Rhesus,
    allergies: [pickRandom(ALLERGIES_POOL, rng)].filter(a => a !== "None"),
    vitals: generateVitals(age, gender, rng),
    diagnoses: generateDiagnoses(age, gender, rng),
    medications: [],
    morgueId: null,
  };
}

export function generatePatientPool(count: number, rng?: () => number): Patient[] {
  const pool: Patient[] = [];
  for (let i = 0; i < count; i++) {
    pool.push(generatePatient(rng));
  }
  return pool;
}
