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
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function generateVitals(age: number): Vitals {
  const baseHR = 70 + Math.floor(Math.random() * 20);
  const baseSYS = 110 + Math.floor(Math.random() * 30);
  return {
    heartRate: age > 60 ? baseHR + 5 : baseHR,
    bloodPressureSystolic: age > 50 ? baseSYS + 10 : baseSYS,
    bloodPressureDiastolic: Math.floor((baseSYS + (age > 50 ? 10 : 0)) * 0.65),
    temperature: 36.5 + Math.random() * 0.5,
    oxygenSaturation: 96 + Math.floor(Math.random() * 4),
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
