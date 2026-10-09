/**
 * @deers-rock/adapter-khanza — DR ↔ Khanza data transformer
 *
 * Transforms Deer's Rock simulation state into SIMRS-Khanza schema
 * compatible records for benchmarking, claim parity, and reporting.
 */

// ─── Khanza schema types (mirroring sik DB tables) ──────────────────────────

export interface KhanzaPasien {
  no_rkm_medis: string;
  nama: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  jenis_kelamin: 'L' | 'P';
  no_hp?: string;
  golongan_darah?: string;
  rhesus?: '+' | '-';
  agama?: string;
  pekerjaan?: string;
  pendidikan?: string;
  status_nikah?: string;
  alamat?: string;
 Provinsi?: string;
  kabupaten?: string;
  kecamatan?: string;
  kelurahan?: string;
  kode_pos?: string;
  suku_bangsa?: string;
  kewarganegaraan?: string;
  no_kk?: string;
  no_ktp?: string;
  nama_ortu?: string;
  nama_hub_keluarga?: string;
  nama_wali?: string;
  hari_libur?: number;
  masuk_rs?: string;
  tanggal_masuk?: string;
  golongan_pasien?: string;
  no_asuransi?: string;
  nama_asuransi?: string;
  no_bpjs?: string;
  nama_bpjs?: string;
  pekerjaaan_bpjs?: string;
  status_bpjs?: string;
  tanggal_akhir_bpjs?: string;
  kelas_reg?: string;
  no_km?: string;
  kamar_inap?: string;
  bangsal?: string;
  poliklinik?: string;
  entered_by?: string;
  last_update?: string;
}

export interface KhanzaPemeriksaanRalan {
  no_reg?: string;
  no_rkm_medis?: string;
  nama_pasien?: string;
  tempat_pelayanan?: string;
  poli_ralan?: string;
  tanggal_periksa?: string;
  jam_mulai?: string;
  jam_selesai?: string;
  dpjp?: string;
  diagnosa?: string;
  terapi?: string;
  prognosis?: string;
  tindakan?: string;
  rujukan?: string;
  kategori?: string;
  triase?: string;
  catatan?: string;
  status?: string;
}

export interface KhanzaPemeriksaanRanap {
  no_reg?: string;
  no_rkm_medis?: string;
  nama_pasien?: string;
  ruang_inap?: string;
  kelas?: string;
  tanggal_masuk?: string;
  jam_masuk?: string;
  tanggal_keluar?: string;
  jam_keluar?: string;
  dpjp_dokter?: string;
  diagnosa_masuk?: string;
  diagnosa_keluar?: string;
  tindakan?: string;
  komplikasi?: string;
  mutu_keluar?: string;
  penyebab?: string;
  metode?: string;
  anestesi?: string;
  pembedah?: string;
  penolong?: string;
  status?: string;
  outcome?: 'Sembuh' | 'Rujuk' | 'Meninggal' | 'LARI' | 'Transfer';
  icd10?: string;
  icd9?: string;
}

export interface KhanzaJurnal {
  no_jurnal?: string;
  tgl_jurnal?: string;
  no_bukti?: string;
  keterangan?: string;
  debit?: number;
  kredit?: number;
  akundebit?: string;
  akunkredit?: string;
  jenis?: string;
  ref1?: string;
  ref2?: string;
  ref3?: string;
  ref4?: string;
  ref5?: string;
  ref6?: string;
  ref7?: string;
  ref8?: string;
  ref9?: string;
  ref10?: string;
}

export interface KhanzaBilling {
  no_reg?: string;
  no_rkm_medis?: string;
  nama_pasien?: string;
  poli_ralan?: string;
  tanggal_periksa?: string;
  total_biaya?: number;
  dibayar?: number;
  piutang?: number;
  potongan?: number;
  total_tagihan?: number;
  status_bayar?: string;
  cara_bayar?: string;
  dpjp?: string;
}

export interface KhanzaClaim {
  no_sep?: string;
  no_rkm_medis?: string;
  nama_pasien?: string;
  diagnosa?: string;
  icd10?: string;
  tindakan?: string;
  icd9?: string;
  grup_cbg?: string;
  tariff?: number;
  status?: string;
  tanggal_claim?: string;
  payer?: string;
  no_klaim?: string;
}

export interface KhanzaInventory {
  kode_barang?: string;
  nama_barang?: string;
  satuan?: string;
  stok?: number;
  min_stok?: number;
  max_stok?: number;
  harga_beli?: number;
  harga_jual?: number;
  departemen?: string;
  gudang?: string;
}

export interface KhanzaAgent {
  nip?: string;
  nama?: string;
  jabatan?: string;
  departemen?: string;
  spesialis?: string;
  no_hp?: string;
  alamat?: string;
  status?: string;
}

export interface KhanzaBed {
  no_kamar?: string;
  ruang?: string;
  nama_kamar?: string;
  tipe_kamar?: string;
  status?: string;
  harga_per_hari?: number;
}

export interface KhanzaReferral {
  no_rkm_medis?: string;
  nama_pasien?: string;
  diagosa_rujukan?: string;
  icd10?: string;
  tujuan_rujukan?: string;
  tipe_rujukan?: string;
  status?: string;
  tanggal_rujukan?: string;
  asal_faskes?: string;
  tujuan_faskes?: string;
  no_sep?: string;
}

// ─── Export bundle ────────────────────────────────────────────────────────────

export interface KhanzaExportBundle {
  timestamp: string;
  tick: number;
  pasien: KhanzaPasien[];
  pemeriksaan_ralan: KhanzaPemeriksaanRalan[];
  pemeriksaan_ranap: KhanzaPemeriksaanRanap[];
  jurnal: KhanzaJurnal[];
  billing: KhanzaBilling[];
  claims: KhanzaClaim[];
  inventory: KhanzaInventory[];
  agents: KhanzaAgent[];
  beds: KhanzaBed[];
  referrals: KhanzaReferral[];
}

export interface BenchmarkReport {
  version: string;
  timestamp: string;
  tick: number;
  dr_metrics: {
    patients: number;
    encounters: number;
    charges: number;
    claims: number;
    morgue: number;
    activeScenario?: string;
  };
  khanza_metrics: {
    pasien_count: number;
    ralan_count: number;
    ranap_count: number;
    jurnal_entries: number;
    billing_total: number;
    claims_total: number;
    inventory_items: number;
    agents_count: number;
    beds_total: number;
    beds_occupied: number;
  };
  claim_parities: {
    total_compared: number;
    matches: number;
    mismatches: number;
    mismatches_detail: Array<{
      encounterId: string;
      drGroup: string;
      khanzaGroup: string;
      drTariff: number;
      khanzaTariff: number;
    }>;
  };
  db_delta: {
    total_rows_inserted: number;
    total_rows_updated: number;
    total_rows_deleted: number;
    insert_by_table: Record<string, number>;
    errors: string[];
  };
  accounting_summary: {
    total_revenue: number;
    total_expense: number;
    net_income: number;
    accounts_receivable: number;
    cash_balance: number;
    journal_entries: number;
  };
  disaster_results?: Array<{
    scenario: string;
    tick_triggered: number;
    tick_duration: number;
    patients_admitted: number;
    patients_dead: number;
    patients_referrals: number;
    supply_shortage: string[];
    bed_occupancy_before: number;
    bed_occupancy_after: number;
  }>;
}
