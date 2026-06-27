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
  { code: "I10", name: "Essential hypertension", minAge: 35, maxAge: 99, genders: ["male", "female"], weight: 15 },
  { code: "E11", name: "Type 2 diabetes mellitus", minAge: 30, maxAge: 99, genders: ["male", "female"], weight: 12 },
  { code: "J15", name: "Bacterial pneumonia", minAge: 0, maxAge: 99, genders: ["male", "female"], weight: 8 },
  { code: "N39", name: "Urinary tract infection", minAge: 1, maxAge: 99, genders: ["male", "female"], weight: 7 },
  { code: "J45", name: "Asthma", minAge: 2, maxAge: 60, genders: ["male", "female"], weight: 6 },
  { code: "K29", name: "Gastritis", minAge: 15, maxAge: 80, genders: ["male", "female"], weight: 6 },
  { code: "M54", name: "Low back pain", minAge: 20, maxAge: 80, genders: ["male", "female"], weight: 7 },
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
];

function pickWeighted<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1]!;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateVitals(age: number, gender: Gender): Vitals {
  const baseHR = gender === "male" ? 65 : 70;
  const baseSBP = age < 18 ? 100 : age < 40 ? 115 : age < 60 ? 125 : 135;
  return {
    heartRate: baseHR + Math.floor(Math.random() * 20),
    bloodPressureSystolic: baseSBP + Math.floor(Math.random() * 20),
    bloodPressureDiastolic: Math.max(60, baseSBP - 40 + Math.floor(Math.random() * 15)),
    temperature: +(36.5 + Math.random() * 0.8).toFixed(1),
    oxygenSaturation: 96 + Math.floor(Math.random() * 4),
    respiratoryRate: 14 + Math.floor(Math.random() * 8),
    painLevel: Math.floor(Math.random() * 5),
  };
}

function generateDiagnoses(age: number, gender: Gender): Diagnosis[] {
  const eligible = ICD10_DIAGNOSES.filter(d => age >= d.minAge && age <= d.maxAge && d.genders.includes(gender));
  if (eligible.length === 0) return [{ code: "Z00", name: "Encounter for general examination", active: true }];

  const numDiagnoses = 1 + Math.floor(Math.random() * 3);
  const selected: Diagnosis[] = [];
  const pool = [...eligible];
  for (let i = 0; i < numDiagnoses && pool.length > 0; i++) {
    const dx = pickWeighted(pool);
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

export function generatePatient(): Patient {
  patientCounter++;
  const gender: Gender = Math.random() > 0.5 ? "male" : "female";
  const identity = generateIdentity(gender);
  const age = new Date().getFullYear() - parseInt(identity.birthDate.split("-")[2] ?? "1990");

  const bloodType = pickRandom(BLOOD_TYPES);
  const rhesus = pickRandom(RHESUS);

  return {
    id: `PAT-${String(patientCounter).padStart(4, "0")}`,
    name: `${pickRandom(firstNames[gender])} ${pickRandom(lastNames)}`,
    age,
    gender,
    identity,
    phone: `08${String(Math.floor(Math.random() * 1000000000)).padStart(10, "0")}`,
    bloodType: bloodType as BloodType,
    allergies: [pickRandom(ALLERGIES_POOL)].filter(a => a !== "None"),
    vitals: generateVitals(age, gender),
    diagnoses: generateDiagnoses(age, gender),
    medications: [],
  };
}

export function generatePatientPool(count: number): Patient[] {
  const pool: Patient[] = [];
  for (let i = 0; i < count; i++) {
    pool.push(generatePatient());
  }
  return pool;
}
