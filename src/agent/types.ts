import type { Identity, Gender } from "../identity/types.js";

export type DepartmentCode =
  | "IGD" | "LAB" | "RAD" | "FARMASI" | "BEDAH" | "KEPERAWATAN" | "DOKTER"
  | "RESPIRASI" | "GIZI" | "PEKERJA_SOSIAL" | "REKAM_MEDIS" | "KEUANGAN"
  | "ANESTESI" | "ORTODONTI" | "JANTUNG" | "SARAF" | "MATA" | "THT"
  | "KULIT_KELAMIN" | "JIWA" | "ANAK" | "OBGYN" | "PARU" | "REHAB_MEDIK"
  | "BEDAH_SARAF" | "PENYAKIT_DALAM" | "GIGI_MULUT" | "FORENSIK"
  | "GIZI_KLINIK" | "FARMASI_KLINIK" | "KESEHATAN_LINGKUNGAN";

export type AgentRole =
  | "dokter_spesialis" | "dokter_umum" | "dokter_gigi"
  | "perawat" | "perawat_anestesi" | "bidan"
  | "apoteker" | "asisten_apoteker"
  | "radiografer" | "analis_lab" | "nutrisionis"
  | "fisioterapis" | "okupasi_terapis" | "psikolog"
  | "pekerja_sosial" | "rekam_medis" | "koder"
  | "kasir" | "staf_keuangan" | "staf_inventaris"
  | "petugas_kebersihan" | "petugas_keamanan" | "admin"
  | "sopir_ambulans";

export type Spesialisasi =
  | "Penyakit Dalam" | "Bedah Umum" | "Bedah Saraf" | "Obstetri Ginekologi"
  | "Anak" | "Jantung" | "Saraf" | "Mata" | "THT" | "Kulit Kelamin"
  | "Jiwa" | "Paru" | "Rehabilitasi Medik" | "Anestesi"
  | "Radiologi" | "Patologi Klinik" | "Patologi Anatomi" | "Forensik"
  | "Gigi Mulut" | "Ortodonsia" | "Gizi Klinik";

export type Shift = "pagi" | "siang" | "malam" | "libur";

export type KeadaanKesehatan = "sehat" | "lelah" | "sakit_ringan" | "sakit_berat";

export interface AgentStatus {
  kelelahan: number;
  kesehatan: KeadaanKesehatan;
  shift: Shift;
  inShift: boolean;
  shiftStartTick: number;
  totalShiftTicks: number;
  consecutiveTicks: number;
  sakitTerhitung: number;
  isHaids: boolean;
  haidCycleDay: number;
  isHamil: boolean;
  hamilWeeks: number;
}

export interface HospitalAgent {
  id: string;
  nama: string;
  identity: Identity;
  role: AgentRole;
  spesialisasi: Spesialisasi | null;
  department: DepartmentCode;
  status: AgentStatus;
  lisensi: string;
  tahunPengalaman: number;
  jamKerjaPerMinggu: number;
}

export interface AgentPool {
  agents: Map<string, HospitalAgent>;
  assignments: Map<string, string>;
}
