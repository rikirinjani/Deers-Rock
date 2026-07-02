import type { World } from "./world.js";
import { formatHospitalTime } from "./clock.js";

export const RS_IDENTITY = {
  name: "RSD Rusa (Deer's Rock Hospital)",
  type: "RS Tipe A",
  kelas: "A",
  direktur: "dr. Rusa Bakti, Sp.PD",
  alamat: "Jl. Perintis Kemerdekaan KM 15",
  kota: "Makassar",
  provinsi: "Sulawesi Selatan",
  kodePos: "90245",
  telepon: "0411-588888",
  email: "info@rsdrusa.go.id",
  website: "https://rsdrusa.go.id",
  izinOperasional: "440/001/RS/2020",
  tanggalIzin: "16 Januari 2020",
  kepemilikan: "Pemerintah Daerah",
  akreditasi: "KARS Tingkat Madama",
  tglAkreditasi: "2025-03-15",
  kelasRawatan: ["VVIP", "VIP", "Kelas I", "Kelas II", "Kelas III"],
};

interface RL1Form {
  hospitalName: string;
  type: string;
  kelas: string;
  alamat: string;
  kota: string;
  provinsi: string;
  kodePos: string;
  telepon: string;
  email: string;
  website: string;
  izinOperasional: string;
  kepemilikan: string;
  akreditasi: string;
  tglAkreditasi: string;
  totalBeds: number;
  totalPatients: number;
  totalAgents: number;
  totalDoctors: number;
  totalNurses: number;
  totalStaff: number;
}

interface RL2aForm {
  totalDokterSpesialis: number;
  totalDokterUmum: number;
  totalDokterGigi: number;
  totalPerawat: number;
  totalBidan: number;
  totalApoteker: number;
  totalAsistenApoteker: number;
  totalAnalisLab: number;
  totalRadiografer: number;
  totalNutrisionis: number;
  totalFisioterapis: number;
  totalPekerjaSosial: number;
  totalRekamMedis: number;
  totalPsikolog: number;
  totalAhliMikrobiologi: number;
  totalAhliPatologi: number;
  totalTeknisiCSSD: number;
  totalTeknisiBiomedik: number;
  totalPerawatPPI: number;
  totalTenagaKesehatan: number;
  bySpesialisasi: Record<string, number>;
}

interface RL2bForm {
  totalStafKeuangan: number;
  totalStafInventaris: number;
  totalKasir: number;
  totalAdmin: number;
  totalPetugasKebersihan: number;
  totalPetugasKeamanan: number;
  totalSopirAmbulans: number;
  totalNonKesehatan: number;
}

interface WardBedData {
  ward: string;
  total: number;
  occupied: number;
  rate: number;
  losDays: number;
}

interface RL3Form {
  totalBeds: number;
  availableBeds: number;
  occupancyRate: number;
  averageLosDays: number;
  wardData: WardBedData[];
  bedTurnoverRatio: number;
}

interface DiagnosisCount {
  code: string;
  name: string;
  count: number;
  genderBreakdown: { male: number; female: number };
  ageGroupBreakdown: Record<string, number>;
}

interface RL4aForm {
  totalInpatientAdmissions: number;
  totalInpatientDischarges: number;
  totalInpatientDays: number;
  averageLengthOfStay: number;
  bedOccupancyRate: number;
  bedTurnOverInterval: number;
  netDeathRate: number;
  grossDeathRate: number;
  dischargeByGender: { male: number; female: number };
  dischargeByAgeGroup: Record<string, number>;
}

interface RL4bForm {
  totalOutpatientVisits: number;
  totalNewPatients: number;
  totalReturnPatients: number;
  visitsByPoli: Record<string, number>;
  visitsByGender: { male: number; female: number };
  visitsByAgeGroup: Record<string, number>;
}

interface RL4cForm {
  totalTriages: number;
  acuity1: number;
  acuity2: number;
  acuity3: number;
  acuity4: number;
  acuity5: number;
  admittedCount: number;
  dischargedCount: number;
  transferredCount: number;
  arrivalWalkIn: number;
  arrivalAmbulance: number;
  arrivalTransfer: number;
  avgWaitTimeMs: number;
  complaintBreakdown: Record<string, number>;
}

interface RL5aForm {
  period: number;
  rank: number;
  top10: DiagnosisCount[];
}

interface RL5bForm {
  period: number;
  top10: { code: string; name: string; count: number; byPoli: Record<string, number>; genderBreakdown: { male: number; female: number }; ageGroupBreakdown: Record<string, number> }[];
}

interface RL6aForm {
  totalSurgeries: number;
  completedSurgeries: number;
  cancelledSurgeries: number;
  electiveSurgeries: number;
  emergencySurgeries: number;
  procedureBreakdown: Record<string, number>;
}

interface RL6bForm {
  totalOutpatientSurgeries: number;
  completedOutpatient: number;
  cancelledOutpatient: number;
  procedureBreakdown: Record<string, number>;
}

interface RL7Form {
  totalDeaths: number;
  netDeathRate: number;
  grossDeathRate: number;
  deathByDiagnosis: Record<string, number>;
  deathByAgeGroup: Record<string, number>;
  deathByGender: { male: number; female: number };
  deathAfter48Hours: number;
  deathUnder48Hours: number;
}

interface RL8Form {
  bOR: number;
  aLOS: number;
  bTO: number;
  nDR: number;
  gDR: number;
  infectionRate: number;
  handHygieneCompliance: number;
  waitingTimeAvgMs: number;
}

interface RL9Form {
  totalCharges: number;
  totalChargeAmount: number;
  totalClaims: number;
  paidClaims: number;
  deniedClaims: number;
  totalPayments: number;
  totalPaymentAmount: number;
  payerMix: Record<string, number>;
  avgChargePerEncounter: number;
  revenueByCategory: Record<string, number>;
}

export interface SirsReportBundle {
  generatedAt: string;
  hospitalTime: string;
  tick: number;
  rl1: RL1Form;
  rl2a: RL2aForm;
  rl2b: RL2bForm;
  rl3: RL3Form;
  rl4a: RL4aForm;
  rl4b: RL4bForm;
  rl4c: RL4cForm;
  rl5a: RL5aForm;
  rl5b: RL5bForm;
  rl6a: RL6aForm;
  rl6b: RL6bForm;
  rl7: RL7Form;
  rl8: RL8Form;
  rl9: RL9Form;
}

function getAgeGroup(age: number): string {
  if (age < 1) return "0-11 bln";
  if (age < 5) return "1-4 thn";
  if (age < 14) return "5-14 thn";
  if (age < 25) return "15-24 thn";
  if (age < 45) return "25-44 thn";
  if (age < 65) return "45-64 thn";
  return "65+ thn";
}

export function generateSirsReport(world: World): SirsReportBundle {
  const s = world.state;
  const patients = Array.from(s.patients.values());
  const encounters = Array.from(s.encounters.values());
  const activeEncs = encounters.filter(e => e.status === "active");
  const dischargedEncs = encounters.filter(e => e.status === "discharged");
  const agents = Array.from(s._agentState.pool.agents.values());

  const bedsArr = Array.from(s.beds.values());
  const availableBeds = bedsArr.filter(b => !b.patientId).length;

  const charts = Array.from(s.medicalCharts.values());
  const triages = Array.from(s.edTriages.values());
  const labs = Array.from(s.labOrders.values());
  const meds = Array.from(s.medicationOrders.values());
  const surgs = Array.from(s.surgeryOrders.values());
  const charges = Array.from(s.charges.values());
  const claims = Array.from(s.insuranceClaims.values());
  const payments = Array.from(s.payments.values());
  const visits = Array.from(s._outpatientVisits.values());

  // ─── RL 1: Identitas RS ───
  const byRole: Record<string, number> = {};
  for (const a of agents) byRole[a.role] = (byRole[a.role] ?? 0) + 1;
  const totalDoctors = (byRole["dokter_umum"] ?? 0) + (byRole["dokter_spesialis"] ?? 0) + (byRole["dokter_gigi"] ?? 0);
  const totalNurses = (byRole["perawat"] ?? 0) + (byRole["perawat_anestesi"] ?? 0) + (byRole["bidan"] ?? 0);

  const rl1: RL1Form = {
    hospitalName: RS_IDENTITY.name,
    type: RS_IDENTITY.type,
    kelas: RS_IDENTITY.kelas,
    alamat: RS_IDENTITY.alamat,
    kota: RS_IDENTITY.kota,
    provinsi: RS_IDENTITY.provinsi,
    kodePos: RS_IDENTITY.kodePos,
    telepon: RS_IDENTITY.telepon,
    email: RS_IDENTITY.email,
    website: RS_IDENTITY.website,
    izinOperasional: RS_IDENTITY.izinOperasional,
    kepemilikan: RS_IDENTITY.kepemilikan,
    akreditasi: RS_IDENTITY.akreditasi,
    tglAkreditasi: RS_IDENTITY.tglAkreditasi,
    totalBeds: bedsArr.length,
    totalPatients: patients.length,
    totalAgents: agents.length,
    totalDoctors,
    totalNurses,
    totalStaff: agents.length,
  };

  // ─── RL 2a: Ketenagaan Kesehatan ───
  const bySpesialisasi: Record<string, number> = {};
  for (const a of agents) {
    if (a.spesialisasi) bySpesialisasi[a.spesialisasi] = (bySpesialisasi[a.spesialisasi] ?? 0) + 1;
  }
  const rl2a: RL2aForm = {
    totalDokterSpesialis: byRole["dokter_spesialis"] ?? 0,
    totalDokterUmum: byRole["dokter_umum"] ?? 0,
    totalDokterGigi: byRole["dokter_gigi"] ?? 0,
    totalPerawat: (byRole["perawat"] ?? 0) + (byRole["perawat_anestesi"] ?? 0),
    totalBidan: byRole["bidan"] ?? 0,
    totalApoteker: byRole["apoteker"] ?? 0,
    totalAsistenApoteker: byRole["asisten_apoteker"] ?? 0,
    totalAnalisLab: byRole["analis_lab"] ?? 0,
    totalRadiografer: byRole["radiografer"] ?? 0,
    totalNutrisionis: byRole["nutrisionis"] ?? 0,
    totalFisioterapis: byRole["fisioterapis"] ?? 0,
    totalPekerjaSosial: byRole["pekerja_sosial"] ?? 0,
    totalRekamMedis: byRole["rekam_medis"] ?? 0,
    totalPsikolog: byRole["psikolog"] ?? 0,
    totalAhliMikrobiologi: byRole["ahli_mikrobiologi"] ?? 0,
    totalAhliPatologi: byRole["ahli_patologi"] ?? 0,
    totalTeknisiCSSD: byRole["teknisi_cssd"] ?? 0,
    totalTeknisiBiomedik: byRole["teknisi_biomedik"] ?? 0,
    totalPerawatPPI: byRole["perawat_ppi"] ?? 0,
    totalTenagaKesehatan: agents.filter(a => !["staf_keuangan", "staf_inventaris", "kasir", "admin", "petugas_kebersihan", "petugas_keamanan", "sopir_ambulans"].includes(a.role)).length,
    bySpesialisasi,
  };

  // ─── RL 2b: Non Kesehatan ───
  const rl2b: RL2bForm = {
    totalStafKeuangan: byRole["staf_keuangan"] ?? 0,
    totalStafInventaris: byRole["staf_inventaris"] ?? 0,
    totalKasir: byRole["kasir"] ?? 0,
    totalAdmin: byRole["admin"] ?? 0,
    totalPetugasKebersihan: byRole["petugas_kebersihan"] ?? 0,
    totalPetugasKeamanan: byRole["petugas_keamanan"] ?? 0,
    totalSopirAmbulans: byRole["sopir_ambulans"] ?? 0,
    totalNonKesehatan: agents.filter(a => ["staf_keuangan", "staf_inventaris", "kasir", "admin", "petugas_kebersihan", "petugas_keamanan", "sopir_ambulans"].includes(a.role)).length,
  };

  // ─── RL 3: Tempat Tidur ───
  const wardMap: Record<string, { total: number; occupied: number }> = {};
  for (const b of bedsArr) {
    if (!wardMap[b.ward]) wardMap[b.ward] = { total: 0, occupied: 0 };
    wardMap[b.ward]!.total++;
    if (b.patientId) wardMap[b.ward]!.occupied++;
  }
  const wardData: WardBedData[] = Object.entries(wardMap).map(([ward, w]) => ({
    ward,
    total: w.total,
    occupied: w.occupied,
    rate: w.total > 0 ? Math.round((w.occupied / w.total) * 100) : 0,
    losDays: 0,
  }));

  const dischargedInpatientRI = dischargedEncs.filter(e => e.type === "inpatient");
  const avgLosDaysRI = dischargedInpatientRI.length > 0
    ? Math.round(dischargedInpatientRI.reduce((s, e) => {
        const endMs = e.endTime ?? world.clock.tick * 60000;
        return s + (endMs - e.startTime);
      }, 0) / dischargedInpatientRI.length / 86400000 * 1000) / 1000
    : 0;
  const bedTurnoverRatio = bedsArr.length > 0 ? Math.round((dischargedInpatientRI.length / bedsArr.length) * 100) / 100 : 0;

  const rl3: RL3Form = {
    totalBeds: bedsArr.length,
    availableBeds,
    occupancyRate: bedsArr.length > 0 ? Math.round(((bedsArr.length - availableBeds) / bedsArr.length) * 100) : 0,
    averageLosDays: avgLosDaysRI,
    wardData,
    bedTurnoverRatio,
  };

  // ─── RL 4a: Rawat Inap ───
  const inpatientEncs = encounters.filter(e => e.type === "inpatient");
  const dischargedInpatient = inpatientEncs.filter(e => e.status === "discharged");
  const totalInpatientMs = dischargedInpatient.reduce((s, e) => {
    const endMs = e.endTime ?? world.clock.tick * 60000;
    return s + (endMs - e.startTime);
  }, 0);
  const avgLosDays = dischargedInpatient.length > 0
    ? Math.round((totalInpatientMs / dischargedInpatient.length) / 86400000 * 1000) / 1000
    : 0;
  const bOR = bedsArr.length > 0 ? Math.round((((bedsArr.length - availableBeds) / bedsArr.length) * 100) * 100) / 100 : 0;
  const deaths = s.morgue.length;
  const netDeaths = dischargedInpatient.length > 0
    ? Math.round((deaths / (dischargedInpatient.length + deaths)) * 10000) / 100
    : 0;
  const grossDeaths = (dischargedInpatient.length + deaths) > 0
    ? Math.round((deaths / (dischargedInpatient.length + deaths)) * 10000) / 100
    : 0;

  const dischargeByGender: { male: number; female: number } = { male: 0, female: 0 };
  const dischargeByAgeGroup: Record<string, number> = {};
  for (const enc of dischargedInpatient) {
    const pt = s.patients.get(enc.patientId);
    if (pt) {
      if (pt.gender === "male") dischargeByGender.male++;
      else dischargeByGender.female++;
      const grp = getAgeGroup(pt.age);
      dischargeByAgeGroup[grp] = (dischargeByAgeGroup[grp] ?? 0) + 1;
    }
  }

  const rl4a: RL4aForm = {
    totalInpatientAdmissions: inpatientEncs.length,
    totalInpatientDischarges: dischargedInpatient.length,
    totalInpatientDays: Math.round(totalInpatientMs / 86400000),
    averageLengthOfStay: avgLosDays,
    bedOccupancyRate: bOR,
    bedTurnOverInterval: bOR > 0 ? Math.round((1 / (bOR / 100)) * 100) / 100 : 0,
    netDeathRate: netDeaths,
    grossDeathRate: grossDeaths,
    dischargeByGender,
    dischargeByAgeGroup,
  };

  // ─── RL 4b: Rawat Jalan ───
  const visitsByPoli: Record<string, number> = {};
  const visitsByGender: { male: number; female: number } = { male: 0, female: 0 };
  const visitsByAgeGroup: Record<string, number> = {};
  let newPatients = 0;
  for (const v of visits) {
    visitsByPoli[v.poli] = (visitsByPoli[v.poli] ?? 0) + 1;
    const pt = s.patients.get(v.patientId);
    if (pt) {
      if (pt.gender === "male") visitsByGender.male++;
      else visitsByGender.female++;
      const grp = getAgeGroup(pt.age);
      visitsByAgeGroup[grp] = (visitsByAgeGroup[grp] ?? 0) + 1;
    }
    if (v.referralId === null) newPatients++;
  }
  const rl4b: RL4bForm = {
    totalOutpatientVisits: visits.length,
    totalNewPatients: newPatients,
    totalReturnPatients: visits.length - newPatients,
    visitsByPoli,
    visitsByGender,
    visitsByAgeGroup,
  };

  // ─── RL 4c: Gawat Darurat ───
  const acuityB: Record<string, number> = {};
  let acuity1 = 0, acuity2 = 0, acuity3 = 0, acuity4 = 0, acuity5 = 0;
  let admittedCount = 0, dischargedED = 0, transferredCount = 0;
  let walkIn = 0, ambulance = 0, transfer = 0;
  const complaintB: Record<string, number> = {};
  for (const t of triages) {
    if (t.acuity === 1) acuity1++;
    else if (t.acuity === 2) acuity2++;
    else if (t.acuity === 3) acuity3++;
    else if (t.acuity === 4) acuity4++;
    else acuity5++;
    if (t.disposition === "admitted") admittedCount++;
    else if (t.disposition === "discharged") dischargedED++;
    else if (t.disposition === "transferred") transferredCount++;
    if (t.arrivalMode === "walk-in") walkIn++;
    else if (t.arrivalMode === "ambulance") ambulance++;
    else transfer++;
    complaintB[t.chiefComplaint] = (complaintB[t.chiefComplaint] ?? 0) + 1;
  }
  const triagesWithTime = triages.filter(t => t.dischargedAt);
  const avgWait = triagesWithTime.length > 0
    ? Math.round(triagesWithTime.reduce((s, t) => s + (t.dischargedAt! - t.triagedAt), 0) / triagesWithTime.length)
    : 0;

  const rl4c: RL4cForm = {
    totalTriages: triages.length,
    acuity1, acuity2, acuity3, acuity4, acuity5,
    admittedCount, dischargedCount: dischargedED, transferredCount,
    arrivalWalkIn: walkIn, arrivalAmbulance: ambulance, arrivalTransfer: transfer,
    avgWaitTimeMs: avgWait,
    complaintBreakdown: Object.fromEntries(Object.entries(complaintB).sort((a, b) => b[1] - a[1]).slice(0, 10)),
  };

  // ─── RL 5a: 10 Besar Penyakit ───
  const dxCounts: Record<string, { name: string; count: number; male: number; female: number; ageGroups: Record<string, number> }> = {};
  for (const c of charts) {
    for (const d of c.diagnoses) {
      if (!dxCounts[d.code]) dxCounts[d.code] = { name: d.name, count: 0, male: 0, female: 0, ageGroups: {} };
      dxCounts[d.code]!.count++;
      const pt = s.patients.get(c.patientId);
      if (pt) {
        if (pt.gender === "male") dxCounts[d.code]!.male++;
        else dxCounts[d.code]!.female++;
        const grp = getAgeGroup(pt.age);
        dxCounts[d.code]!.ageGroups[grp] = (dxCounts[d.code]!.ageGroups[grp] ?? 0) + 1;
      }
    }
  }
  const top10 = Object.entries(dxCounts)
    .map(([code, v]) => ({ code, name: v.name, count: v.count, genderBreakdown: { male: v.male, female: v.female }, ageGroupBreakdown: v.ageGroups }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const rl5a: RL5aForm = {
    period: Math.floor(world.clock.tick / 5),
    rank: 10,
    top10,
  };

  // ─── RL 5b: 10 Besar Penyakit Rawat Jalan ───
  const outpatientDxCounts: Record<string, { name: string; count: number; male: number; female: number; ageGroups: Record<string, number>; byPoli: Record<string, number> }> = {};
  for (const v of visits) {
    const code = v.icdCode;
    if (!outpatientDxCounts[code]) outpatientDxCounts[code] = { name: v.diagnosis, count: 0, male: 0, female: 0, ageGroups: {}, byPoli: {} };
    outpatientDxCounts[code]!.count++;
    outpatientDxCounts[code]!.byPoli[v.poli] = (outpatientDxCounts[code]!.byPoli[v.poli] ?? 0) + 1;
    const pt = s.patients.get(v.patientId);
    if (pt) {
      if (pt.gender === "male") outpatientDxCounts[code]!.male++;
      else outpatientDxCounts[code]!.female++;
      const grp = getAgeGroup(pt.age);
      outpatientDxCounts[code]!.ageGroups[grp] = (outpatientDxCounts[code]!.ageGroups[grp] ?? 0) + 1;
    }
  }
  const rl5bTop10 = Object.entries(outpatientDxCounts)
    .map(([code, v]) => ({ code, name: v.name, count: v.count, byPoli: v.byPoli, genderBreakdown: { male: v.male, female: v.female }, ageGroupBreakdown: v.ageGroups }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const rl5b: RL5bForm = {
    period: Math.floor(world.clock.tick / 5),
    top10: rl5bTop10,
  };

  // ─── RL 6a: Tindakan Operasi ───
  const procCounts: Record<string, number> = {};
  for (const s of surgs) {
    procCounts[s.procedureName] = (procCounts[s.procedureName] ?? 0) + 1;
  }
  const rl6a: RL6aForm = {
    totalSurgeries: surgs.length,
    completedSurgeries: surgs.filter(s => s.status === "completed").length,
    cancelledSurgeries: surgs.filter(s => s.status === "cancelled").length,
    electiveSurgeries: surgs.filter(s => s.status === "scheduled" || s.status === "completed").length,
    emergencySurgeries: surgs.filter(s => s.status === "in-progress").length,
    procedureBreakdown: Object.fromEntries(Object.entries(procCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)),
  };

  // ─── RL 6b: Tindakan Operasi Rawat Jalan ───
  const outpatientSurgs = surgs.filter(s => {
    const enc = s.encounterId ? encounters.find(e => e.id === s.encounterId) : undefined;
    return enc?.type === "outpatient";
  });
  const outProcCounts: Record<string, number> = {};
  for (const s of outpatientSurgs) {
    outProcCounts[s.procedureName] = (outProcCounts[s.procedureName] ?? 0) + 1;
  }
  const rl6b: RL6bForm = {
    totalOutpatientSurgeries: outpatientSurgs.length,
    completedOutpatient: outpatientSurgs.filter(s => s.status === "completed").length,
    cancelledOutpatient: outpatientSurgs.filter(s => s.status === "cancelled").length,
    procedureBreakdown: Object.fromEntries(Object.entries(outProcCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)),
  };

  // ─── RL 7: Kematian ───
  const deathByDx: Record<string, number> = {};
  const deathByAgeGrp: Record<string, number> = {};
  const deathByGender: { male: number; female: number } = { male: 0, female: 0 };
  for (const m of s.morgue) {
    deathByDx[m.primaryDiagnosis] = (deathByDx[m.primaryDiagnosis] ?? 0) + 1;
    const grp = getAgeGroup(m.age);
    deathByAgeGrp[grp] = (deathByAgeGrp[grp] ?? 0) + 1;
    if (m.gender === "male") deathByGender.male++;
    else deathByGender.female++;
  }
  const allDischarges = dischargedEncs.length + s.morgue.length;
  const rl7: RL7Form = {
    totalDeaths: s.morgue.length,
    netDeathRate: allDischarges > 0 ? Math.round((s.morgue.length / allDischarges) * 10000) / 100 : 0,
    grossDeathRate: allDischarges > 0 ? Math.round((s.morgue.length / (dischargedEncs.length + s.morgue.length)) * 10000) / 100 : 0,
    deathByDiagnosis: Object.fromEntries(Object.entries(deathByDx).sort((a, b) => b[1] - a[1])),
    deathByAgeGroup: deathByAgeGrp,
    deathByGender,
    deathAfter48Hours: s.morgue.filter(m => m.deathTick > 48).length,
    deathUnder48Hours: s.morgue.filter(m => m.deathTick <= 48).length,
  };

  // ─── RL 8: Indikator Mutu ───
  const infectionRate = s._ipc && s._ipc.cases.length > 0 && encounters.length > 0
    ? Math.round((s._ipc.cases.length / encounters.length) * 10000) / 100
    : 0;
  const handHygiene = s._ipc ? Math.round(s._ipc.handHygieneCompliance * 10000) / 100 : 0;
  const bTO = bedsArr.length > 0 ? Math.round((dischargedEncs.length / bedsArr.length) * 100) / 100 : 0;

  const rl8: RL8Form = {
    bOR: rl4a.bedOccupancyRate,
    aLOS: avgLosDays,
    bTO,
    nDR: netDeaths,
    gDR: grossDeaths,
    infectionRate,
    handHygieneCompliance: handHygiene,
    waitingTimeAvgMs: avgWait,
  };

  // ─── RL 9: Keuangan ───
  const totalChargeAmount = charges.reduce((s, c) => s + c.amount, 0);
  const totalPaymentAmount = payments.reduce((s, p) => s + p.amount, 0);
  const payerMix: Record<string, number> = {};
  for (const cl of claims) payerMix[cl.payer] = (payerMix[cl.payer] ?? 0) + 1;
  const revenueByCategory: Record<string, number> = {};
  for (const c of charges) {
    revenueByCategory[c.category] = (revenueByCategory[c.category] ?? 0) + c.amount;
  }

  const rl9: RL9Form = {
    totalCharges: charges.length,
    totalChargeAmount,
    totalClaims: claims.length,
    paidClaims: claims.filter(c => c.status === "paid").length,
    deniedClaims: claims.filter(c => c.status === "denied").length,
    totalPayments: payments.length,
    totalPaymentAmount,
    payerMix,
    avgChargePerEncounter: encounters.length > 0 ? Math.round(totalChargeAmount / encounters.length) : 0,
    revenueByCategory,
  };

  return {
    generatedAt: new Date().toISOString(),
    hospitalTime: formatHospitalTime(world.clock),
    tick: world.clock.tick,
    rl1, rl2a, rl2b, rl3, rl4a, rl4b, rl4c, rl5a, rl5b, rl6a, rl6b, rl7, rl8, rl9,
  };
}
