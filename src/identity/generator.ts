import type { Identity, NIK, Address, Gender, Religion, MaritalStatus } from "./types.js";
import { PROVINCES, STREET_NAMES, getRandomPostalCode } from "./data.js";

let nikCounter = 0;

function pickRandom<T>(arr: T[], rng?: () => number): T {
  const rand = rng ?? Math.random;
  return arr[Math.floor(rand() * arr.length)];
}

function generateBirthDate(gender: Gender, rng?: () => number): { dateStr: string; day: number; month: number; year: number; age: number; birthPlace: string } {
  const rand = rng ?? Math.random;
  const birthPlace = pickRandom(PROVINCES, rng).ibukota;
  const age = rand() < 0.1
    ? Math.floor(rand() * 17) + 1
    : Math.floor(rand() * 70) + 18;
  const now = new Date();
  const year = now.getFullYear() - age;
  const month = 1 + Math.floor(rand() * 12);
  const maxDay = new Date(year, month, 0).getDate();
  const day = 1 + Math.floor(rand() * maxDay);
  const dateStr = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
  return { dateStr, day, month, year, age, birthPlace };
}

function generateNIK(gender: Gender, birthDay: number, birthMonth: number, birthYear: number, rng?: () => number): NIK {
  nikCounter++;
  const province = pickRandom(PROVINCES, rng);
  const regency = pickRandom(province.kabupatenKota, rng);
  const district = pickRandom(regency.districts, rng);

  const nikDay = gender === "female" ? birthDay + 40 : birthDay;
  const datePart = `${String(nikDay).padStart(2, "0")}${String(birthMonth).padStart(2, "0")}${String(birthYear).slice(-2)}`;
  const serial = String(nikCounter).padStart(4, "0").slice(-4);
  const value = `${province.code}${regency.code}${district.code}${datePart}${serial}`;

  return {
    value,
    provinceCode: province.code,
    regencyCode: regency.code,
    districtCode: district.code,
    birthDate: `${String(birthDay).padStart(2, "0")}-${String(birthMonth).padStart(2, "0")}-${birthYear}`,
    gender,
    serial,
  };
}

function generateAddress(provinceCode: string, regencyCode: string, districtCode: string, isDomisili: boolean, rng?: () => number): Address {
  const rand = rng ?? Math.random;
  const province = PROVINCES.find(p => p.code === provinceCode);
  if (!province) throw new Error(`Province not found: ${provinceCode}`);
  const regency = province.kabupatenKota.find(r => r.code === regencyCode);
  if (!regency) throw new Error(`Regency not found: ${regencyCode}`);
  const district = regency.districts.find(d => d.code === districtCode);
  const districtName = district?.name ?? regency.ibukota;
  const dc = district?.code ?? districtCode;

  return {
    street: `${pickRandom(STREET_NAMES, rng)} No. ${Math.floor(rand() * 200) + 1}`,
    rtRw: `${String(Math.floor(rand() * 15) + 1).padStart(3, "0")}/${String(Math.floor(rand() * 10) + 1).padStart(3, "0")}`,
    kelurahan: pickRandom(["Kelurahan", "Desa"], rng) + " " + districtName,
    kecamatan: districtName,
    kabupatenKota: regency.type + " " + regency.name,
    provinsi: province.name,
    provinceCode: province.code,
    regencyCode: regency.code,
    districtCode: dc,
    postalCode: getRandomPostalCode(province.code),
    isDomisili,
  };
}

const RELIGIONS: Religion[] = ["Islam", "Kristen Protestan", "Katolik", "Hindu", "Buddha", "Khonghucu"];
const MARITAL_STATUSES: MaritalStatus[] = ["Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"];
const OCCUPATIONS = ["Pegawai Negeri Sipil", "Karyawan Swasta", "Wiraswasta", "Petani", "Nelayan", "Guru", "Dokter", "Perawat", "Ibu Rumah Tangga", "Pelajar", "Mahasiswa", "Buruh", "Pedagang", "Supir", "Pensiunan", "Tidak Bekerja"];

export function generateIdentity(gender?: Gender, rng?: () => number): Identity {
  const rand = rng ?? Math.random;
  const resolvedGender = gender ?? (rand() > 0.5 ? "male" : "female");
  const { dateStr, day, month, year, age, birthPlace } = generateBirthDate(resolvedGender, rng);
  const nik = generateNIK(resolvedGender, day, month, year, rng);
  const addressKtp = generateAddress(nik.provinceCode, nik.regencyCode, nik.districtCode, false, rng);

  const changeAddress = rand() > 0.7;
  let addressDomisili: Address;
  if (changeAddress) {
    const newProv = pickRandom(PROVINCES, rng);
    const newReg = pickRandom(newProv.kabupatenKota, rng);
    addressDomisili = generateAddress(newProv.code, newReg.code, pickRandom(newReg.districts, rng).code, true, rng);
  } else {
    addressDomisili = { ...addressKtp, isDomisili: true };
  }

  const ageBasedMarital: MaritalStatus = age < 20 ? "Belum Kawin" : age < 60 ? (rand() > 0.3 ? "Kawin" : "Belum Kawin") : (rand() > 0.4 ? "Kawin" : "Cerai Mati");

  return {
    nik,
    birthPlace,
    birthDate: dateStr,
    gender: resolvedGender,
    religion: ageBasedMarital === "Kawin" ? (rand() > 0.2 ? "Islam" : pickRandom(RELIGIONS.slice(1), rng)) : pickRandom(RELIGIONS, rng),
    maritalStatus: ageBasedMarital,
    occupation: age < 17 ? "Pelajar" : age > 60 ? (rand() > 0.5 ? "Pensiunan" : pickRandom(OCCUPATIONS, rng)) : pickRandom(OCCUPATIONS, rng),
    nationality: "WNI",
    addressKtp,
    addressDomisili,
  };
}
