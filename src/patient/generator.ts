import type { Patient, Gender, Vitals, Diagnosis, BloodType, Rhesus } from "./schema.js";
import { getIdentityLocale, getCaseMix } from "../locale/registry.js";
import { ICD10_DIAGNOSES } from "./icd-pool.js";
export { dengueAgeFactor } from "./icd-pool.js";

const firstNames: Record<Gender, string[]> = {
  male: ["Agus", "Bambang", "Cahyono", "Dwi", "Eko", "Hendra", "Joko", "Ketut", "Made", "Nyoman", "Putu", "Slamet", "Sigit", "Tri", "Wahyu", "Ahmad", "Burhan", "Daniel", "Edi", "Faisal", "Gatot", "Hasan", "Irwan", "Kusno", "Lukman", "Marwan", "Nurdin", "Pardi", "Rahmat", "Supardi", "Taufik", "Usman", "Wawan", "Yusuf", "Zainal", "Adi", "Bayan", "Cendekia", "Dhika", "Farhan", "Gilang", "Haryo", "Irfan", "Jayadi", "Kurniawan", "Luthfi", "Maulana", "Naufal", "Octavian", "Putra", "Rizky", "Sandi", "Temmy", "Umar", "Vino", "Widodo", "Xavier", "Yonathan", "Zulkarnain", "Arif", "Bayu", "Darmawan", "Ellis", "Frankie", "Guntur", "Hafiz", "Indra", "Jajang", "Kholid", "Laksmana", "Mulyadi", "Nanda", "Oman", "Prabowo", "Rian", "Surya", "Teguh", "Urip", "Vincent", "Wisnu", "Yoga", "Zain", "Aldi", "Bima", "Cahya", "Dimas", "Elang", "Ferry", "Galih", "Hadi", "Ilham", "Jaya", "Kevin", "Lucky", "Muhammad", "Nabil", "Oscar", "Primo", "Rendi", "Salman", "Tomi", "Virgil", "Wira", "Yanto", "Zidan", "Andi", "Baso", "Mappa", "Sangkala", "Upa", "Ambo", "Lolo", "Syamsul", "Arifuddin", "Muhlis", "Ridwan", "Fadli", "Akbar", "Syahrir", "Nasaruddin", "Jusman", "Hamzah", "Kaharuddin", "Amiruddin", "Yohanis", "Markus", "Petrus", "Lukas", "Stefanus", "Yakobus", "Paulus", "Frans", "Ruben", "Obed", "Asep", "Ujang", "Dadang", "Cecep", "Iwan", "Endang", "Rudi", "Sutrisno", "Gede", "Komang", "Wayan", "Kadek", "Bonar", "Togar", "Parlindungan", "Hotman", "Ronny", "Jefri", "Steven", "Rocky"],
  female: ["Ani", "Citra", "Dewi", "Endang", "Fitri", "Indah", "Kartika", "Lestari", "Mega", "Nurul", "Putri", "Rina", "Sari", "Triana", "Aisyah", "Bunga", "Damayanti", "Elok", "Fatmawati", "Gita", "Hesti", "Intan", "Kumala", "Laras", "Maya", "Nadia", "Oktaviani", "Puspita", "Ratna", "Sumiati", "Tuti", "Wulandari", "Yuni", "Zahara", "Alya", "Baiti", "Cantika", "Dian", "Eka", "Feni", "Gadis", "Hana", "Ika", "Jelita", "Kania", "Luna", "Mala", "Nisa", "Oriella", "Pertina", "Queen", "Rizka", "Sinta", "Tania", "Ulfa", "Viona", "Winda", "Xena", "Yolanda", "Zara", "Asha", "Bella", "Cahaya", "Dina", "Esti", "Firdaus", "Gemila", "Hidayah", "Jovita", "Kasih", "Layla", "Muna", "Nabila", "Orla", "Pitaloka", "Ressa", "Salsabila", "Tasya", "Una", "Valkyrie", "Wulan", "Xandria", "Yasmin", "Zaskia", "Andi Nurul", "Besse", "Indo", "Hasnah", "Hartati", "Nurhayati", "Rosmiati", "Sitti", "Nurmala", "Suriani", "Hasmawati", "Rahmawati", "Asmawati", "Nurjannah", "Megawati", "Syamsiah", "Sitti Aminah", "Kasmawati", "Maria", "Yohana", "Agustina", "Martha", "Elisabeth", "Margaretha", "Debora", "Ribka", "Novita", "Selvi", "Neneng", "Euis", "Imas", "Siti", "Sri", "Sumarni", "Suharti", "Ni Luh", "Ni Made", "Ni Komang", "Rosmawar", "Upik", "Rugun", "Lamtiar", "Meiske", "Grace", "Olvi", "Yuliana"],
};

const lastNames = ["Pratama", "Wijaya", "Kusuma", "Hidayat", "Nugraha", "Santoso", "Wibowo", "Gunawan", "Susanto", "Saputra", "Utami", "Handayani", "Hasibuan", "Simanjuntak", "Siregar", "Nasution", "Saragih", "Hutapea", "Sihotang", "Situmorang", "Lestari", "Pertiwi", "Wulandari", "Purnomo", "Suryadi", "Saputro", "Hartono", "Setiawan", "Syahputra", "Mandala", "Adjie", "Bakri", "Cahyadi", "Darmawan", "Effendi", "Firmansyah", "Gultom", "Haksara", "Iskandar", "Jambak", "Kalder", "Lubis", "Manurung", "Ndolo", "Panggabean", "Rontomé", "Sinaga", "Tanoto", "Umarji", "Venz", "Wonge", "Yamin", "Zakaria", "Abidin", "Bakry", "Candra", "Djojoadisuryo", "Elyas", "Gaffar", "Hasanah", "Ibrahim", "Jamil", "Kamil", "Latief", "Maksum", "Naim", "Osman", "Parman", "Qodri", "Rasyid", "Sholeh", "Takdir", "Usmani", "Vyssa", "Wahyudi", "Yakub", "Zainuddin", "Mappaseng", "Paturusi", "Pallawa", "Sompa", "Mattalitti", "Daeng Ngalle", "Rahman", "Mustafa", "Basri", "Halim", "Patta", "Sanusi", "Tahir", "Makkasau", "Massalinri", "Sampe", "Tandi", "Rante", "Pasang", "Lumbaa", "Palinggi", "Pakaya", "Lamato", "Mokoginta", "Lasut", "Wenas", "Kaunang", "Sumampouw", "Rumengan", "Pattinasarany", "Latuheru", "Tuasikal", "Wenda", "Kogoya", "Rumbewas", "Sitompul", "Pardede", "Simatupang", "Sembiring", "Ginting", "Tarigan", "Chaniago", "Tanjung", "Piliang", "Suryono", "Prasetyo", "Kurniadi", "Nugroho", "Setiabudi", "Supriyadi", "Sudrajat", "Permana", "Hermawan"];

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
  const mix = getCaseMix();
  const eligible = mix.diagnoses
    .filter(d => age >= d.minAge && age <= d.maxAge && d.genders.includes(gender))
    .map(d => ({ ...d, weight: d.weight * mix.ageWeight(d.code, age) }));
  if (eligible.length === 0) return [{ code: "Z00", name: "Encounter for general examination", active: true }];

  const numDiagnoses = 1 + Math.floor(rand() * 3);
  const selected: Diagnosis[] = [];
  const pool = [...eligible];
  for (let i = 0; i < numDiagnoses && pool.length > 0; i++) {
    const dx = pickWeighted(pool, rng);
    if (!selected.find(s => s.code === dx.code)) {
      selected.push({ code: dx.code, name: dx.name, active: true, priority: dx.priority ?? (100 - dx.weight) });
    }
    pool.splice(pool.indexOf(dx), 1);
  }
  return selected.length > 0 ? selected : [{ code: "Z00", name: "Encounter for general examination", active: true }];
}

const BLOOD_TYPES: BloodType[] = ["A", "B", "AB", "O"];
const RHESUS: Rhesus[] = ["+", "-"];
const ALLERGIES_POOL = ["None", "None", "None", "Penicillin", "Sulfa", "NSAIDs", "Aspirin", "Codeine", "Iodine contrast", "Latex", "Seafood", "Dust", "None", "None"];

/** Every ICD-10 category the generator can assign (illness-model coverage is tested against it). */
export const GENERATOR_ICD_CODES: string[] = Array.from(new Set(ICD10_DIAGNOSES.map(d => d.code)));

let patientCounter = 0;
export function resetPatientCounter(): void { patientCounter = 0; }

export function generatePatient(rng?: () => number): Patient {
  const rand = rng ?? Math.random;
  patientCounter++;
  const gender: Gender = rand() > 0.5 ? "male" : "female";
  const locale = getIdentityLocale();
  const identity = locale.identity(gender, rng);
  const age = locale.ageOf(identity);

  const bloodType = pickRandom(BLOOD_TYPES, rng);
  const rhesus = pickRandom(RHESUS, rng);

  const patient: Patient = {
    id: `PAT-${String(patientCounter).padStart(4, "0")}`,
    name: locale.patientName ? locale.patientName(gender, rng) : `${pickRandom(firstNames[gender], rng)} ${pickRandom(lastNames, rng)}`,
    age,
    gender,
    identity,
    phone: locale.phone ? locale.phone(rng) : `08${String(Math.floor(rand() * 1000000000)).padStart(10, "0")}`,
    bloodType: bloodType as BloodType,
    rhesus: rhesus as Rhesus,
    allergies: [pickRandom(ALLERGIES_POOL, rng)].filter(a => a !== "None"),
    vitals: generateVitals(age, gender, rng),
    diagnoses: generateDiagnoses(age, gender, rng),
    medications: [],
    morgueId: null,
  };
  // Healthy set point for vitals drift (vitals-model.ts); a copy, so no extra rng draw.
  patient.baselineVitals = { ...patient.vitals };
  return patient;
}

export function generatePatientPool(count: number, rng?: () => number): Patient[] {
  const pool: Patient[] = [];
  for (let i = 0; i < count; i++) {
    pool.push(generatePatient(rng));
  }
  return pool;
}
