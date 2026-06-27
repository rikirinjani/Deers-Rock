export type Gender = "male" | "female";

export interface NIK {
  value: string;
  provinceCode: string;
  regencyCode: string;
  districtCode: string;
  birthDate: string;
  gender: Gender;
  serial: string;
}

export interface Address {
  street: string;
  rtRw: string;
  kelurahan: string;
  kecamatan: string;
  kabupatenKota: string;
  provinsi: string;
  provinceCode: string;
  regencyCode: string;
  districtCode: string;
  postalCode: string;
  isDomisili: boolean;
}

export interface Identity {
  nik: NIK;
  birthPlace: string;
  birthDate: string;
  gender: Gender;
  religion: Religion;
  maritalStatus: MaritalStatus;
  occupation: string;
  nationality: string;
  addressKtp: Address;
  addressDomisili: Address;
}

export type Religion = "Islam" | "Kristen Protestan" | "Katolik" | "Hindu" | "Buddha" | "Khonghucu";

export type MaritalStatus = "Belum Kawin" | "Kawin" | "Cerai Hidup" | "Cerai Mati";

export interface ProvinceData {
  code: string;
  name: string;
  ibukota: string;
  kabupatenKota: RegencyData[];
}

export interface RegencyData {
  code: string;
  name: string;
  type: "Kabupaten" | "Kota";
  ibukota: string;
  districts: DistrictData[];
}

export interface DistrictData {
  code: string;
  name: string;
}

export interface ReferralFacility {
  id: string;
  name: string;
  type: "Puskesmas" | "Klinik" | "RS Tipe D" | "RS Tipe C";
  provinceCode: string;
  regencyCode: string;
  capacity: number;
  doctors: number;
  nurses: number;
  beds: number;
}

export interface ReferralLetter {
  id: string;
  patientId: string;
  fromFacility: string;
  fromType: ReferralFacility["type"];
  toFacility: string;
  reason: string;
  diagnosis: string;
  referralDate: number;
  status: "active" | "received" | "completed" | "returned";
  notes: string;
}
