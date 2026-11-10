import type { HospitalAgent, AgentRole, DepartmentCode, Spesialisasi, AgentPool } from "./types.js";
import { getIdentityLocale, getStaffing } from "../locale/registry.js";
import { PROVINCES, STREET_NAMES, getRandomPostalCode } from "../identity/data.js";
import { assignRoster } from "./roster.js";

const DOKTER_NAMES_M = ["dr. Agus", "dr. Bambang", "dr. Cahyono", "dr. Dwi", "dr. Eko", "dr. Faisal", "dr. Gatot", "dr. Hasan", "dr. Irwan", "dr. Joko", "dr. Kusno", "dr. Lukman", "dr. Marwan", "dr. Nurdin", "dr. Rahmat", "dr. Supardi", "dr. Taufik", "dr. Usman", "dr. Wawan", "dr. Yusuf"];
const DOKTER_NAMES_F = ["dr. Ani", "dr. Dewi", "dr. Endang", "dr. Fitri", "dr. Gita", "dr. Hesti", "dr. Intan", "dr. Kartika", "dr. Lestari", "dr. Maya", "dr. Nurul", "dr. Putri", "dr. Ratna", "dr. Sari", "dr. Triana", "dr. Aisyah", "dr. Bunga", "dr. Citra", "dr. Fatmawati", "dr. Wulandari"];
const PERAWAT_NAMES = ["Ns. Ahmad", "Ns. Budi", "Ns. Citra", "Ns. Dewi", "Ns. Eko", "Ns. Fitri", "Ns. Gita", "Ns. Hasan", "Ns. Indah", "Ns. Joko", "Ns. Kartika", "Ns. Lestari", "Ns. Mega", "Ns. Nurul", "Ns. Putri", "Ns. Rahmat", "Ns. Sari", "Ns. Tri", "Ns. Wulan", "Ns. Yuni"];
const APOTEKER_NAMES = ["apt. Ahmad", "apt. Budi", "apt. Citra", "apt. Dewi", "apt. Eko", "apt. Fitri", "apt. Gita", "apt. Hasan", "apt. Indah", "apt. Joko"];
const MIKROBIOLOG_NAMES = ["dr. Mikrobiologi Andi", "dr. Mikrobiologi Sari", "dr. Mikrobiologi Budi", "dr. Mikrobiologi Dewi"];
const PATOLOG_NAMES = ["dr. Patologi Rina", "dr. Patologi Fajar", "dr. Patologi Maya", "dr. Patologi Adi"];
const CSSD_NAMES = ["Teknisi CSSD Arif", "Teknisi CSSD Dewi", "Teknisi CSSD Rudi", "Teknisi CSSD Sari"];
const BIOMED_NAMES = ["Teknisi Biomedik Aldi", "Teknisi Biomedik Rani", "Teknisi Biomedik Yoga", "Teknisi Biomedik Fitri"];
const PPI_NAMES = ["Ns. PPI Wulan", "Ns. PPI Irfan", "Ns. PPI Rina", "Ns. PPI Dani"];

const LAST_NAMES = ["Pratama", "Wijaya", "Kusuma", "Hidayat", "Nugraha", "Santoso", "Wibowo", "Gunawan", "Susanto", "Saputra", "Utami", "Handayani", "Nasution", "Siregar"];

const ROLE_DEPARTMENT: Record<AgentRole, { dept: DepartmentCode; spesialisasi: Spesialisasi | null }> = {
  dokter_spesialis: { dept: "PENYAKIT_DALAM", spesialisasi: "Penyakit Dalam" },
  dokter_umum: { dept: "DOKTER", spesialisasi: null },
  dokter_gigi: { dept: "GIGI_MULUT", spesialisasi: "Gigi Mulut" },
  perawat: { dept: "KEPERAWATAN", spesialisasi: null },
  perawat_anestesi: { dept: "ANESTESI", spesialisasi: "Anestesi" },
  bidan: { dept: "OBGYN", spesialisasi: "Obstetri Ginekologi" },
  apoteker: { dept: "FARMASI", spesialisasi: null },
  asisten_apoteker: { dept: "FARMASI", spesialisasi: null },
  radiografer: { dept: "RAD", spesialisasi: "Radiologi" },
  analis_lab: { dept: "LAB", spesialisasi: "Patologi Klinik" },
  nutrisionis: { dept: "GIZI", spesialisasi: "Gizi Klinik" },
  fisioterapis: { dept: "REHAB_MEDIK", spesialisasi: "Rehabilitasi Medik" },
  okupasi_terapis: { dept: "REHAB_MEDIK", spesialisasi: "Rehabilitasi Medik" },
  psikolog: { dept: "JIWA", spesialisasi: "Jiwa" },
  pekerja_sosial: { dept: "PEKERJA_SOSIAL", spesialisasi: null },
  rekam_medis: { dept: "REKAM_MEDIS", spesialisasi: null },
  koder: { dept: "REKAM_MEDIS", spesialisasi: null },
  kasir: { dept: "KEUANGAN", spesialisasi: null },
  staf_keuangan: { dept: "KEUANGAN", spesialisasi: null },
  staf_inventaris: { dept: "KESEHATAN_LINGKUNGAN", spesialisasi: null },
  petugas_kebersihan: { dept: "KESEHATAN_LINGKUNGAN", spesialisasi: null },
  petugas_keamanan: { dept: "KESEHATAN_LINGKUNGAN", spesialisasi: null },
  admin: { dept: "REKAM_MEDIS", spesialisasi: null },
  sopir_ambulans: { dept: "IGD", spesialisasi: null },
  ahli_mikrobiologi: { dept: "MIKROBIOLOGI", spesialisasi: "Patologi Klinik" },
  ahli_patologi: { dept: "PATOLOGI", spesialisasi: "Patologi Anatomi" },
  teknisi_cssd: { dept: "CSSD", spesialisasi: null },
  teknisi_biomedik: { dept: "BIOMEDIK", spesialisasi: null },
  perawat_ppi: { dept: "PPI", spesialisasi: null },
};

const SPESIALIS_MAP: Record<Spesialisasi, DepartmentCode> = {
  "Penyakit Dalam": "PENYAKIT_DALAM",
  "Bedah Umum": "BEDAH", "Bedah Saraf": "BEDAH_SARAF",
  "Obstetri Ginekologi": "OBGYN", "Anak": "ANAK",
  "Jantung": "JANTUNG", "Saraf": "SARAF", "Mata": "MATA",
  "THT": "THT", "Kulit Kelamin": "KULIT_KELAMIN",
  "Jiwa": "JIWA", "Paru": "PARU",
  "Rehabilitasi Medik": "REHAB_MEDIK", "Anestesi": "ANESTESI",
  "Radiologi": "RAD", "Patologi Klinik": "LAB",
  "Patologi Anatomi": "LAB", "Forensik": "FORENSIK",
  "Gigi Mulut": "GIGI_MULUT", "Ortodonsia": "ORTODONTI",
  "Gizi Klinik": "GIZI_KLINIK",
};

function pickRandom<T>(arr: T[], rng?: () => number): T {
  const rand = rng ?? Math.random;
  return arr[Math.floor(rand() * arr.length)];
}

let agentCounter = 0;
export function resetAgentCounter(): void { agentCounter = 0; }

export function generateAgent(role: AgentRole, rng?: () => number): HospitalAgent {
  const rand = rng ?? Math.random;
  agentCounter++;
  const isFemale = role === "bidan" || (["perawat", "apoteker", "nutrisionis", "psikolog", "pekerja_sosial"].includes(role) && rand() > 0.5) || rand() > 0.6;
  const gender: "male" | "female" = isFemale ? "female" : "male";
  const locale = getIdentityLocale();
  const identity = locale.identity(gender, rng);
  // Staff are working-age (22-65). The identity draws a general-population age (1-87), so fold it
  // deterministically into the working range instead of drawing again (no extra rng use).
  const age = 22 + locale.ageOf(identity) % 44;

  const rd = ROLE_DEPARTMENT[role];
  const namePool = role === "dokter_umum" || role === "dokter_spesialis" || role === "dokter_gigi"
    ? (gender === "male" ? DOKTER_NAMES_M : DOKTER_NAMES_F)
    : (role === "apoteker" || role === "asisten_apoteker" ? APOTEKER_NAMES
      : role === "ahli_mikrobiologi" ? MIKROBIOLOG_NAMES
      : role === "ahli_patologi" ? PATOLOG_NAMES
      : role === "teknisi_cssd" ? CSSD_NAMES
      : role === "teknisi_biomedik" ? BIOMED_NAMES
      : role === "perawat_ppi" ? PPI_NAMES
      : PERAWAT_NAMES);

  const spesialisasi = role === "dokter_spesialis"
    ? pickRandom(Object.keys(SPESIALIS_MAP) as Spesialisasi[], rng)
    : rd.spesialisasi;

  const actualDept = spesialisasi ? SPESIALIS_MAP[spesialisasi] : rd.dept;

  const lisensi = locale.staffLicence ? locale.staffLicence(role, rng) : role.startsWith("dokter")
    ? `STR-${String(Math.floor(rand() * 1000000)).padStart(6, "0")}`
    : role === "perawat" || role === "perawat_anestesi" || role === "bidan"
    ? `SIP-${String(Math.floor(rand() * 1000000)).padStart(6, "0")}`
    : `SKP-${String(Math.floor(rand() * 1000000)).padStart(6, "0")}`;

  return {
    id: `${role.toUpperCase().slice(0, 4)}-${String(agentCounter).padStart(4, "0")}`,
    nama: locale.staffName ? locale.staffName(role, gender, rng) : pickRandom(namePool, rng) + " " + pickRandom(LAST_NAMES, rng),
    identity,
    role,
    spesialisasi: spesialisasi ?? null,
    department: actualDept,
    status: {
      kelelahan: Math.floor(rand() * 30),
      kesehatan: "sehat",
      shift: "pagi",
      inShift: true,
      shiftStartTick: 0,
      totalShiftTicks: 0,
      consecutiveTicks: 0,
      sakitTerhitung: 0,
      isHaids: gender === "female" && rand() > 0.7,
      haidCycleDay: Math.floor(rand() * 28),
      isHamil: gender === "female" && rand() > 0.95,
      hamilWeeks: Math.floor(rand() * 36) + 4,
    },
    lisensi,
    tahunPengalaman: Math.max(1, Math.floor(age - 24)),
    jamKerjaPerMinggu: 40,
  };
}

function repeatRoles(role: AgentRole, count: number): AgentRole[] {
  return Array.from({ length: count }, () => role);
}

export function generateAgentPool(totalBeds: number = 133, rng?: () => number): AgentPool {
  const agents = new Map<string, HospitalAgent>();

  const staffing = getStaffing();
  const n = (role: AgentRole) => staffing.headcount(role, totalBeds);

  const roles: AgentRole[] = [
    ...repeatRoles("dokter_spesialis", n("dokter_spesialis")),
    ...repeatRoles("dokter_umum", n("dokter_umum")),
    ...repeatRoles("dokter_gigi", n("dokter_gigi")),
    ...repeatRoles("perawat", n("perawat")),
    ...repeatRoles("perawat_anestesi", n("perawat_anestesi")),
    ...repeatRoles("bidan", n("bidan")),
    ...repeatRoles("apoteker", n("apoteker")),
    ...repeatRoles("asisten_apoteker", n("asisten_apoteker")),
    ...repeatRoles("radiografer", n("radiografer")),
    ...repeatRoles("analis_lab", n("analis_lab")),
    ...repeatRoles("nutrisionis", n("nutrisionis")),
    ...repeatRoles("fisioterapis", n("fisioterapis")),
    ...repeatRoles("okupasi_terapis", n("okupasi_terapis")),
    ...repeatRoles("psikolog", n("psikolog")),
    ...repeatRoles("pekerja_sosial", n("pekerja_sosial")),
    ...repeatRoles("rekam_medis", n("rekam_medis")),
    ...repeatRoles("koder", n("koder")),
    ...repeatRoles("kasir", n("kasir")),
    ...repeatRoles("staf_keuangan", n("staf_keuangan")),
    ...repeatRoles("staf_inventaris", n("staf_inventaris")),
    ...repeatRoles("petugas_kebersihan", n("petugas_kebersihan")),
    ...repeatRoles("petugas_keamanan", n("petugas_keamanan")),
    ...repeatRoles("admin", n("admin")),
    ...repeatRoles("sopir_ambulans", n("sopir_ambulans")),
  ];

  for (const role of roles) {
    const agent = generateAgent(role, rng);
    agents.set(agent.id, agent);
  }
  assignRoster(agents);

  return { agents, assignments: new Map() };
}
