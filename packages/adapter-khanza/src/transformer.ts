/**
 * @deers-rock/adapter-khanza — Data transformer
 *
 * Converts Deer's Rock simulation state into Khanza schema-compatible records.
 */
import type {
  KhanzaPasien, KhanzaPemeriksaanRalan, KhanzaPemeriksaanRanap,
  KhanzaJurnal, KhanzaBilling, KhanzaClaim, KhanzaInventory,
  KhanzaAgent, KhanzaBed, KhanzaReferral, KhanzaExportBundle,
} from './types.js';
import type { World } from '@deers-rock/core';
import { AdapterRegistry } from '@deers-rock/core';

/**
 * Transform a Deer's Rock world state into a Khanza-compatible export bundle.
 *
 * Mapping strategy:
 * - Patient → pasien (with NIK mapped from identity)
 * - Active/Discharged encounters → pemeriksaan_ralan / pemeriksaan_ranap
 * - Charges → billing + jurnal entries
 * - Claims → claims table
 * - Agents → pegawai
 * - Beds → kamar/bangsal
 */
export function transformWorldToKhanza(w: World): KhanzaExportBundle {
  const now = new Date().toISOString();
  const msPerTick = 60_000; // 1 tick = 1 minute
  const hospitalEpochMs = w.clock.hospitalTimeMs;

  // ─── Patients ──────────────────────────────────────────────────────────────
  const pasien: KhanzaPasien[] = [];
  for (const [id, patient] of w.state.patients) {
    const identity = (patient as any).identity;
    const nik = identity?.nik?.value ?? `SIM-${id}`;
    pasien.push({
      no_rkm_medis: id,
      nama: patient.name,
      tanggal_lahir: identity?.birthDate ?? '',
      jenis_kelamin: patient.gender === 'female' ? 'P' : 'L',
      no_hp: patient.phone,
      golongan_darah: patient.bloodType,
      rhesus: patient.rhesus,
      agama: identity?.religion,
      pekerjaan: '',
      pendidikan: '',
      status_nikah: identity?.maritalStatus,
      alamat: identity?.addressKtp?.street ?? '',
      Provinsi: identity?.addressKtp?.provinsi,
      kabupaten: identity?.addressKtp?.kabupatenKota,
      kecamatan: identity?.addressKtp?.kecamatan,
      kelurahan: identity?.addressKtp?.kelurahan,
      kode_pos: identity?.addressKtp?.postalCode,
      suku_bangsa: '',
      kewarganegaraan: 'WNI',
      no_kk: '',
      no_ktp: nik,
      nama_ortu: '',
      nama_hub_keluarga: '',
      masuk_rs: now,
      golongan_pasien: 'Umum',
      status_bpjs: patient.morgueId ? 'Meninggal' : 'Aktif',
      entered_by: 'system',
      last_update: now,
    });
  }

  // ─── Encounters → pemeriksaan_ralan / pemeriksaan_ranap ──────────────────
  const pemeriksaanRalan: KhanzaPemeriksaanRalan[] = [];
  const pemeriksaanRanap: KhanzaPemeriksaanRanap[] = [];

  for (const enc of w.state.encounters.values()) {
    const startTime = new Date(enc.startTime).toISOString();
    const endTime = enc.endTime ? new Date(enc.endTime).toISOString() : now;
    const durationMin = enc.endTime
      ? Math.round((enc.endTime - enc.startTime) / 60_000)
      : 0;

    const base = {
      no_reg: enc.id,
      no_rkm_medis: enc.patientId,
      tanggal_periksa: startTime,
      jam_mulai: startTime,
      jam_selesai: endTime,
      diagnosa: enc.primaryDiagnosis ?? '',
      catatan: '',
      status: enc.status === 'active' ? 'Dalam Perawatan' : 'Selesai',
    };

    if (enc.type === 'outpatient' || enc.type === 'ED') {
      pemeriksaanRalan.push({
        ...base,
        poli_ralan: enc.type === 'outpatient' ? 'Poli Umum' : 'IGD',
        dpjp: enc.attendingDoctorId ?? '',
        triase: 'Normal',
        terapi: '',
        prognosis: '',
        tindakan: '',
        rujukan: '',
        kategori: 'BPJS',
      });
    } else {
      // Inpatient
      pemeriksaanRanap.push({
        ...base,
        ruang_inap: 'Ranap Umum',
        kelas: 'Kelas 3',
        tanggal_masuk: startTime,
        jam_masuk: startTime,
        tanggal_keluar: endTime,
        jam_keluar: endTime,
        dpjp_dokter: enc.attendingDoctorId ?? '',
        diagnosa_masuk: enc.primaryDiagnosis ?? '',
        diagnosa_keluar: enc.primaryDiagnosis ?? '',
        tindakan: '',
        komplikasi: '',
        mutu_keluar: 'Rawat Jalan',
        status: enc.status,
        outcome: getOutcome(enc),
        icd10: enc.primaryDiagnosis ?? '',
      });
    }
  }

  // ─── Charges → billing ─────────────────────────────────────────────────────
  const billing: KhanzaBilling[] = [];
  for (const [id, charge] of w.state.charges) {
    billing.push({
      no_reg: charge.encounterId,
      no_rkm_medis: charge.patientId,
      nama_pasien: '', // lookup from patient map
      poli_ralan: '',
      tanggal_periksa: new Date(charge.billedAt).toISOString(),
      total_biaya: charge.amount,
      dibayar: 0,
      piutang: charge.amount,
      potongan: 0,
      total_tagihan: charge.amount,
      status_bayar: 'Belum Bayar',
      cara_bayar: 'Self-pay',
      dpjp: '',
    });
  }

  // ─── Claims ────────────────────────────────────────────────────────────────
  const claims: KhanzaClaim[] = [];
  for (const claim of w.state.insuranceClaims.values()) {
    claims.push({
      no_sep: claim.id,
      no_rkm_medis: claim.patientId,
      nama_pasien: '',
      diagnosa: '',
      icd10: claim.sepNumber ?? '',
      tindakan: '',
      icd9: '',
      grup_cbg: claim.sepNumber ?? '',
      tariff: claim.coveredAmount,
      status: claim.status,
      tanggal_claim: new Date(claim.submittedAt).toISOString(),
      payer: claim.payer,
      no_klaim: claim.id,
    });
  }

  // ─── Journal entries ───────────────────────────────────────────────────────
  const jurnal: KhanzaJurnal[] = [];
  for (const charge of w.state.charges.values()) {
    jurnal.push({
      no_jurnal: `JR-${charge.id}`,
      tgl_jurnal: new Date(charge.billedAt).toISOString(),
      no_bukti: charge.id,
      keterangan: charge.description,
      debit: charge.amount,
      kredit: 0,
      akundebit: 'Piutang Pasien',
      akunkredit: 'Pendapatan Jasa',
      jenis: 'Penyesuaian',
    });
  }

  // ─── Agents → pegawai ──────────────────────────────────────────────────────
  const agents: KhanzaAgent[] = [];
  for (const agent of w.state._agentState.pool.agents.values()) {
    agents.push({
      nip: agent.id,
      nama: agent.name,
      jabatan: agent.role,
      departemen: agent.department ?? '',
      spesialis: agent.spesialisasi ?? '',
      no_hp: '',
      alamat: '',
      status: agent.healthState === 'sick' ? 'Sakit' : 'Aktif',
    });
  }

  // ─── Beds → kamar ──────────────────────────────────────────────────────────
  const beds: KhanzaBed[] = [];
  for (const [id, bed] of w.state.beds) {
    beds.push({
      no_kamar: id,
      ruang: bed.ward ?? 'Umum',
      nama_kamar: `Bed ${id}`,
      tipe_kamar: 'Kelas 3',
      status: bed.patientId ? 'Terisi' : 'Kosong',
      harga_per_hari: 350000, // IDR default Tier C rate
    });
  }

  // ─── Inventory (simplified) ────────────────────────────────────────────────
  const inventory: KhanzaInventory[] = [];
  for (const [code, item] of w.state.inventory) {
    inventory.push({
      kode_barang: code,
      nama_barang: item.itemName,
      satuan: item.unit,
      stok: item.stock,
      min_stok: item.minStock,
      max_stok: item.maxStock,
      harga_beli: 0,
      harga_jual: 0,
      departemen: item.departmentId,
      gudang: 'Gudang Utama',
    });
  }

  // ─── Referrals ─────────────────────────────────────────────────────────────
  const referrals: KhanzaReferral[] = [];
  for (const ref of w.state._referralState.letters.values()) {
    referrals.push({
      no_rkm_medis: ref.patientId,
      nama_pasien: '',
      diagosa_rujukan: ref.reason ?? '',
      icd10: ref.icd10 ?? '',
      tujuan_rujukan: ref.targetFacility,
      tipe_rujukan: ref.type,
      status: ref.status,
      tanggal_rujukan: new Date(ref.createdAt).toISOString(),
      asal_faskes: 'RS Deer\\'s Rock',
      tujuan_faskes: ref.targetFacility,
    });
  }

  return {
    timestamp: now,
    tick: w.clock.tick,
    pasien,
    pemeriksaan_ralan: pemeriksaanRalan,
    pemeriksaan_ranap: pemeriksaanRanap,
    jurnal,
    billing,
    claims,
    inventory,
    agents,
    beds,
    referrals,
  };
}

/**
 * Map DR encounter outcome to Khanza outcome vocabulary.
 */
function getOutcome(enc: any): string {
  // Check if patient is in morgue
  const morgueIds = new Set((w.state.morgue ?? []).map((m: any) => m.encounterId));
  if (morgueIds.has(enc.id)) return 'Meninggal';
  if (enc.status === 'transferred') return 'Transfer';
  if (enc.status === 'discharged') return 'Sembuh';
  return 'Dalam Perawatan';
}
