import type { Identity, NIK, Address, Gender, Religion, MaritalStatus } from "./types.js";
import { PROVINCES, STREET_NAMES, getRandomPostalCode } from "./data.js";

let nikCounter = 0;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateBirthDate(gender: Gender): { dateStr: string; day: number; month: number; year: number; age: number; birthPlace: string } {
  const birthPlace = pickRandom(PROVINCES).ibukota;
  const age = Math.random() < 0.1
    ? Math.floor(Math.random() * 17) + 1
    : Math.floor(Math.random() * 70) + 18;
  const now = new Date();
  const year = now.getFullYear() - age;
  const month = 1 + Math.floor(Math.random() * 12);
  const maxDay = new Date(year, month, 0).getDate();
  const day = 1 + Math.floor(Math.random() * maxDay);
  const dateStr = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
  return { dateStr, day, month, year, age, birthPlace };
}

function generateNIK(gender: Gender, birthDay: number, birthMonth: number, birthYear: number): NIK {
  nikCounter++;
  const province = pickRandom(PROVINCES);
  const regency = pickRandom(province.kabupatenKota);
  const district = pickRandom(regency.districts);

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

function generateAddress(provinceCode: string, regencyCode: string, districtCode: string, isDomisili: boolean): Address {
  const province = PROVINCES.find(p => p.code === provinceCode);
  if (!province) throw new Error(`Province not found: ${provinceCode}`);
  const regency = province.kabupatenKota.find(r => r.code === regencyCode);
  if (!regency) throw new Error(`Regency not found: ${regencyCode}`);
  const district = regency.districts.find(d => d.code === districtCode);
  const districtName = district?.name ?? regency.ibukota;
  const dc = district?.code ?? districtCode;

  return {
    street: `${pickRandom(STREET_NAMES)} No. ${Math.floor(Math.random() * 200) + 1}`,
    rtRw: `${String(Math.floor(Math.random() * 15) + 1).padStart(3, "0")}/${String(Math.floor(Math.random() * 10) + 1).padStart(3, "0")}`,
    kelurahan: pickRandom(["Kelurahan", "Desa"]) + " " + districtName,
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

export function generateIdentity(gender: Gender = Math.random() > 0.5 ? "male" : "female"): Identity {
  const { dateStr, day, month, year, age, birthPlace } = generateBirthDate(gender);
  const nik = generateNIK(gender, day, month, year);
  const addressKtp = generateAddress(nik.provinceCode, nik.regencyCode, nik.districtCode, false);

  const changeAddress = Math.random() > 0.7;
  let addressDomisili: Address;
  if (changeAddress) {
    const newProv = pickRandom(PROVINCES);
    const newReg = pickRandom(newProv.kabupatenKota);
    addressDomisili = generateAddress(newProv.code, newReg.code, pickRandom(newReg.districts).code, true);
  } else {
    addressDomisili = { ...addressKtp, isDomisili: true };
  }

  const ageBasedMarital: MaritalStatus = age < 20 ? "Belum Kawin" : age < 60 ? (Math.random() > 0.3 ? "Kawin" : "Belum Kawin") : (Math.random() > 0.4 ? "Kawin" : "Cerai Mati");

  return {
    nik,
    birthPlace,
    birthDate: dateStr,
    gender,
    religion: ageBasedMarital === "Kawin" ? (Math.random() > 0.2 ? "Islam" : pickRandom(RELIGIONS.slice(1))) : pickRandom(RELIGIONS),
    maritalStatus: ageBasedMarital,
    occupation: age < 17 ? "Pelajar" : age > 60 ? (Math.random() > 0.5 ? "Pensiunan" : pickRandom(OCCUPATIONS)) : pickRandom(OCCUPATIONS),
    nationality: "WNI",
    addressKtp,
    addressDomisili,
  };
}
