import type { Patient, Gender, Vitals, Diagnosis } from "./schema.js";

const firstNames: Record<Gender, string[]> = {
  male: ["Agus", "Bambang", "Cahyono", "Dwi", "Eko", "Hendra", "Joko", "Ketut", "Made", "Nyoman", "Putu", "Slamet", "Sigit", "Tri", "Wahyu"],
  female: ["Ani", "Budi", "Citra", "Dewi", "Endang", "Fitri", "Indah", "Kartika", "Lestari", "Mega", "Nurul", "Putri", "Rina", "Sari", "Triana"],
};

const lastNames = ["Pratama", "Wijaya", "Kusuma", "Hidayat", "Nugraha", "Santoso", "Wibowo", "Gunawan", "Susanto", "Saputra", "Utami", "Handayani"];

const diagnoses: Diagnosis[] = [
  { code: "I10", name: "Essential hypertension", active: true },
  { code: "E11", name: "Type 2 diabetes mellitus", active: true },
  { code: "J15", name: "Bacterial pneumonia", active: true },
  { code: "N39", name: "Urinary tract infection", active: true },
  { code: "J45", name: "Asthma", active: true },
  { code: "K29", name: "Gastritis", active: true },
  { code: "M54", name: "Low back pain", active: true },
  { code: "I50", name: "Heart failure", active: true },
  { code: "A09", name: "Acute gastroenteritis", active: true },
  { code: "E78", name: "Hyperlipidemia", active: true },
  { code: "N18", name: "Chronic kidney disease", active: true },
  { code: "J44", name: "COPD", active: true },
  { code: "G40", name: "Epilepsy", active: true },
  { code: "M17", name: "Osteoarthritis of knee", active: true },
  { code: "F32", name: "Major depressive disorder", active: true },
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function generateVitals(age: number): Vitals {
  return {
    heartRate: 60 + Math.floor(Math.random() * 30),
    bloodPressureSystolic: 110 + Math.floor(Math.random() * 30),
    bloodPressureDiastolic: 70 + Math.floor(Math.random() * 15),
    temperature: +(36.5 + Math.random() * 0.8).toFixed(1),
    oxygenSaturation: 96 + Math.floor(Math.random() * 4),
    respiratoryRate: 14 + Math.floor(Math.random() * 8),
    painLevel: Math.floor(Math.random() * 5),
  };
}

let patientCounter = 0;

export function generatePatient(): Patient {
  patientCounter++;
  const gender: Gender = Math.random() > 0.5 ? "male" : "female";
  const age = 18 + Math.floor(Math.random() * 70);
  const numDiagnoses = 1 + Math.floor(Math.random() * 3);
  const patientDiagnoses = [diagnoses[patientCounter % diagnoses.length]!];
  for (let i = 0; i < numDiagnoses - 1; i++) {
    const d = pickRandom(diagnoses);
    if (!patientDiagnoses.find(pd => pd.code === d.code)) {
      patientDiagnoses.push(d);
    }
  }

  return {
    id: `PAT-${String(patientCounter).padStart(4, "0")}`,
    name: `${pickRandom(firstNames[gender])} ${pickRandom(lastNames)}`,
    age,
    gender,
    vitals: generateVitals(age),
    diagnoses: patientDiagnoses,
    medications: [],
  };
}

export function generatePatientPool(count: number): Patient[] {
  return Array.from({ length: count }, () => generatePatient());
}
