import type { ProvinceData, RegencyData, DistrictData, ReferralFacility } from "./types.js";

export const PROVINCES: ProvinceData[] = [
  {
    code: "11", name: "Aceh", ibukota: "Banda Aceh", kabupatenKota: [
      { code: "01", name: "Aceh Selatan", type: "Kabupaten", ibukota: "Tapaktuan", districts: [{ code: "01", name: "Bakongan" }, { code: "02", name: "Kluet Utara" }, { code: "03", name: "Kluet Selatan" }, { code: "04", name: "Labuhan Haji" }] },
      { code: "71", name: "Banda Aceh", type: "Kota", ibukota: "Banda Aceh", districts: [{ code: "01", name: "Meuraxa" }, { code: "02", name: "Kuta Alam" }, { code: "03", name: "Baiturrahman" }, { code: "04", name: "Syiah Kuala" }] },
    ]
  },
  {
    code: "12", name: "Sumatera Utara", ibukota: "Medan", kabupatenKota: [
      { code: "71", name: "Medan", type: "Kota", ibukota: "Medan", districts: [{ code: "01", name: "Medan Kota" }, { code: "02", name: "Medan Barat" }, { code: "03", name: "Medan Timur" }, { code: "04", name: "Medan Selayang" }] },
      { code: "72", name: "Binjai", type: "Kota", ibukota: "Binjai", districts: [{ code: "01", name: "Binjai Kota" }, { code: "02", name: "Binjai Barat" }] },
    ]
  },
  {
    code: "13", name: "Sumatera Barat", ibukota: "Padang", kabupatenKota: [
      { code: "71", name: "Padang", type: "Kota", ibukota: "Padang", districts: [{ code: "01", name: "Padang Barat" }, { code: "02", name: "Padang Timur" }, { code: "03", name: "Padang Utara" }, { code: "04", name: "Padang Selatan" }] },
    ]
  },
  {
    code: "14", name: "Riau", ibukota: "Pekanbaru", kabupatenKota: [
      { code: "71", name: "Pekanbaru", type: "Kota", ibukota: "Pekanbaru", districts: [{ code: "01", name: "Sukajadi" }, { code: "02", name: "Pekanbaru Kota" }, { code: "03", name: "Senapelan" }] },
    ]
  },
  {
    code: "15", name: "Jambi", ibukota: "Jambi", kabupatenKota: [
      { code: "71", name: "Jambi", type: "Kota", ibukota: "Jambi", districts: [{ code: "01", name: "Telanaipura" }, { code: "02", name: "Pasar Jambi" }] },
    ]
  },
  {
    code: "16", name: "Sumatera Selatan", ibukota: "Palembang", kabupatenKota: [
      { code: "71", name: "Palembang", type: "Kota", ibukota: "Palembang", districts: [{ code: "01", name: "Ilir Barat I" }, { code: "02", name: "Ilir Timur I" }, { code: "03", name: "Kemuning" }] },
    ]
  },
  {
    code: "17", name: "Bengkulu", ibukota: "Bengkulu", kabupatenKota: [
      { code: "71", name: "Bengkulu", type: "Kota", ibukota: "Bengkulu", districts: [{ code: "01", name: "Gading Cempaka" }, { code: "02", name: "Ratu Samban" }] },
    ]
  },
  {
    code: "18", name: "Lampung", ibukota: "Bandar Lampung", kabupatenKota: [
      { code: "71", name: "Bandar Lampung", type: "Kota", ibukota: "Bandar Lampung", districts: [{ code: "01", name: "Teluk Betung Selatan" }, { code: "02", name: "Tanjung Karang Timur" }] },
    ]
  },
  {
    code: "19", name: "Kepulauan Bangka Belitung", ibukota: "Pangkalpinang", kabupatenKota: [
      { code: "71", name: "Pangkalpinang", type: "Kota", ibukota: "Pangkalpinang", districts: [{ code: "01", name: "Rangkui" }, { code: "02", name: "Taman Sari" }] },
    ]
  },
  {
    code: "21", name: "Kepulauan Riau", ibukota: "Tanjungpinang", kabupatenKota: [
      { code: "71", name: "Batam", type: "Kota", ibukota: "Batam", districts: [{ code: "01", name: "Batam Kota" }, { code: "02", name: "Lubuk Baja" }, { code: "03", name: "Nagoya" }] },
    ]
  },
  {
    code: "31", name: "DKI Jakarta", ibukota: "Jakarta", kabupatenKota: [
      { code: "71", name: "Jakarta Pusat", type: "Kota", ibukota: "Jakarta Pusat", districts: [{ code: "01", name: "Gambir" }, { code: "02", name: "Senen" }, { code: "03", name: "Menteng" }, { code: "04", name: "Tanah Abang" }] },
      { code: "72", name: "Jakarta Utara", type: "Kota", ibukota: "Jakarta Utara", districts: [{ code: "01", name: "Penjaringan" }, { code: "02", name: "Kelapa Gading" }] },
      { code: "73", name: "Jakarta Barat", type: "Kota", ibukota: "Jakarta Barat", districts: [{ code: "01", name: "Cengkareng" }, { code: "02", name: "Kembangan" }] },
      { code: "74", name: "Jakarta Selatan", type: "Kota", ibukota: "Jakarta Selatan", districts: [{ code: "01", name: "Kebayoran Baru" }, { code: "02", name: "Pasar Minggu" }] },
      { code: "75", name: "Jakarta Timur", type: "Kota", ibukota: "Jakarta Timur", districts: [{ code: "01", name: "Matraman" }, { code: "02", name: "Kramat Jati" }] },
    ]
  },
  {
    code: "32", name: "Jawa Barat", ibukota: "Bandung", kabupatenKota: [
      { code: "73", name: "Bandung", type: "Kota", ibukota: "Bandung", districts: [{ code: "01", name: "Coblong" }, { code: "02", name: "Bandung Wetan" }, { code: "03", name: "Cibeunying Kidul" }] },
      { code: "74", name: "Cirebon", type: "Kota", ibukota: "Cirebon", districts: [{ code: "01", name: "Kejaksan" }, { code: "02", name: "Lemahwungkuk" }] },
      { code: "75", name: "Bekasi", type: "Kota", ibukota: "Bekasi", districts: [{ code: "01", name: "Bekasi Timur" }, { code: "02", name: "Bekasi Barat" }] },
    ]
  },
  {
    code: "33", name: "Jawa Tengah", ibukota: "Semarang", kabupatenKota: [
      { code: "74", name: "Semarang", type: "Kota", ibukota: "Semarang", districts: [{ code: "01", name: "Semarang Tengah" }, { code: "02", name: "Semarang Utara" }, { code: "03", name: "Semarang Selatan" }] },
      { code: "75", name: "Surakarta", type: "Kota", ibukota: "Surakarta", districts: [{ code: "01", name: "Laweyan" }, { code: "02", name: "Banjarsari" }, { code: "03", name: "Jebres" }] },
    ]
  },
  {
    code: "34", name: "DI Yogyakarta", ibukota: "Yogyakarta", kabupatenKota: [
      { code: "71", name: "Yogyakarta", type: "Kota", ibukota: "Yogyakarta", districts: [{ code: "01", name: "Gondokusuman" }, { code: "02", name: "Danurejan" }, { code: "03", name: "Jetis" }] },
    ]
  },
  {
    code: "35", name: "Jawa Timur", ibukota: "Surabaya", kabupatenKota: [
      { code: "78", name: "Surabaya", type: "Kota", ibukota: "Surabaya", districts: [{ code: "01", name: "Gubeng" }, { code: "02", name: "Tegalsari" }, { code: "03", name: "Sawahan" }, { code: "04", name: "Wonokromo" }, { code: "05", name: "Rungkut" }] },
      { code: "79", name: "Malang", type: "Kota", ibukota: "Malang", districts: [{ code: "01", name: "Klojen" }, { code: "02", name: "Lowokwaru" }, { code: "03", name: "Blimbing" }] },
      { code: "09", name: "Jember", type: "Kabupaten", ibukota: "Jember", districts: [{ code: "01", name: "Kaliwates" }, { code: "02", name: "Sumbersari" }, { code: "03", name: "Patrang" }] },
    ]
  },
  {
    code: "36", name: "Banten", ibukota: "Serang", kabupatenKota: [
      { code: "71", name: "Tangerang", type: "Kota", ibukota: "Tangerang", districts: [{ code: "01", name: "Ciledug" }, { code: "02", name: "Karawaci" }, { code: "03", name: "Tangerang" }] },
    ]
  },
  {
    code: "51", name: "Bali", ibukota: "Denpasar", kabupatenKota: [
      { code: "71", name: "Denpasar", type: "Kota", ibukota: "Denpasar", districts: [{ code: "01", name: "Denpasar Barat" }, { code: "02", name: "Denpasar Timur" }, { code: "03", name: "Denpasar Selatan" }] },
    ]
  },
  {
    code: "52", name: "Nusa Tenggara Barat", ibukota: "Mataram", kabupatenKota: [
      { code: "71", name: "Mataram", type: "Kota", ibukota: "Mataram", districts: [{ code: "01", name: "Mataram" }, { code: "02", name: "Cakranegara" }, { code: "03", name: "Ampenan" }] },
      { code: "72", name: "Bima", type: "Kota", ibukota: "Bima", districts: [{ code: "01", name: "Rasanae Barat" }, { code: "02", name: "Rasanae Timur" }] },
    ]
  },
  {
    code: "53", name: "Nusa Tenggara Timur", ibukota: "Kupang", kabupatenKota: [
      { code: "71", name: "Kupang", type: "Kota", ibukota: "Kupang", districts: [{ code: "01", name: "Kelapa Lima" }, { code: "02", name: "Oebobo" }, { code: "03", name: "Maulafa" }] },
      { code: "03", name: "Flores Timur", type: "Kabupaten", ibukota: "Larantuka", districts: [{ code: "01", name: "Larantuka" }, { code: "02", name: "Ile Boleng" }] },
    ]
  },
  {
    code: "61", name: "Kalimantan Barat", ibukota: "Pontianak", kabupatenKota: [
      { code: "71", name: "Pontianak", type: "Kota", ibukota: "Pontianak", districts: [{ code: "01", name: "Pontianak Kota" }, { code: "02", name: "Pontianak Barat" }] },
    ]
  },
  {
    code: "62", name: "Kalimantan Tengah", ibukota: "Palangka Raya", kabupatenKota: [
      { code: "71", name: "Palangka Raya", type: "Kota", ibukota: "Palangka Raya", districts: [{ code: "01", name: "Pahandut" }, { code: "02", name: "Jekan Raya" }] },
    ]
  },
  {
    code: "63", name: "Kalimantan Selatan", ibukota: "Banjarmasin", kabupatenKota: [
      { code: "71", name: "Banjarmasin", type: "Kota", ibukota: "Banjarmasin", districts: [{ code: "01", name: "Banjarmasin Tengah" }, { code: "02", name: "Banjarmasin Timur" }] },
    ]
  },
  {
    code: "64", name: "Kalimantan Timur", ibukota: "Samarinda", kabupatenKota: [
      { code: "71", name: "Samarinda", type: "Kota", ibukota: "Samarinda", districts: [{ code: "01", name: "Samarinda Ulu" }, { code: "02", name: "Samarinda Ilir" }] },
      { code: "72", name: "Balikpapan", type: "Kota", ibukota: "Balikpapan", districts: [{ code: "01", name: "Balikpapan Timur" }, { code: "02", name: "Balikpapan Barat" }] },
    ]
  },
  {
    code: "65", name: "Kalimantan Utara", ibukota: "Tanjung Selor", kabupatenKota: [
      { code: "71", name: "Tarakan", type: "Kota", ibukota: "Tarakan", districts: [{ code: "01", name: "Tarakan Timur" }, { code: "02", name: "Tarakan Barat" }] },
    ]
  },
  {
    code: "71", name: "Sulawesi Utara", ibukota: "Manado", kabupatenKota: [
      { code: "71", name: "Manado", type: "Kota", ibukota: "Manado", districts: [{ code: "01", name: "Wenang" }, { code: "02", name: "Sario" }, { code: "03", name: "Malalayang" }] },
    ]
  },
  {
    code: "72", name: "Sulawesi Tengah", ibukota: "Palu", kabupatenKota: [
      { code: "71", name: "Palu", type: "Kota", ibukota: "Palu", districts: [{ code: "01", name: "Palu Barat" }, { code: "02", name: "Palu Timur" }, { code: "03", name: "Palu Selatan" }] },
    ]
  },
  {
    code: "73", name: "Sulawesi Selatan", ibukota: "Makassar", kabupatenKota: [
      { code: "71", name: "Makassar", type: "Kota", ibukota: "Makassar", districts: [{ code: "01", name: "Makassar" }, { code: "02", name: "Panakkukang" }, { code: "03", name: "Tamalate" }, { code: "04", name: "Biringkanaya" }, { code: "05", name: "Tallo" }] },
      { code: "72", name: "Parepare", type: "Kota", ibukota: "Parepare", districts: [{ code: "01", name: "Ujung" }, { code: "02", name: "Bacukiki" }] },
      { code: "73", name: "Palopo", type: "Kota", ibukota: "Palopo", districts: [{ code: "01", name: "Wara" }, { code: "02", name: "Wara Utara" }] },
    ]
  },
  {
    code: "74", name: "Sulawesi Tenggara", ibukota: "Kendari", kabupatenKota: [
      { code: "71", name: "Kendari", type: "Kota", ibukota: "Kendari", districts: [{ code: "01", name: "Kendari" }, { code: "02", name: "Kendari Barat" }] },
      { code: "72", name: "Baubau", type: "Kota", ibukota: "Baubau", districts: [{ code: "01", name: "Betoambari" }, { code: "02", name: "Wolio" }] },
    ]
  },
  {
    code: "75", name: "Gorontalo", ibukota: "Gorontalo", kabupatenKota: [
      { code: "71", name: "Gorontalo", type: "Kota", ibukota: "Gorontalo", districts: [{ code: "01", name: "Kota Selatan" }, { code: "02", name: "Kota Utara" }] },
    ]
  },
  {
    code: "76", name: "Sulawesi Barat", ibukota: "Mamuju", kabupatenKota: [
      { code: "01", name: "Mamuju", type: "Kabupaten", ibukota: "Mamuju", districts: [{ code: "01", name: "Mamuju" }, { code: "02", name: "Simboro" }] },
    ]
  },
  {
    code: "81", name: "Maluku", ibukota: "Ambon", kabupatenKota: [
      { code: "71", name: "Ambon", type: "Kota", ibukota: "Ambon", districts: [{ code: "01", name: "Sirimau" }, { code: "02", name: "Nusaniwe" }, { code: "03", name: "Teluk Ambon" }] },
    ]
  },
  {
    code: "82", name: "Maluku Utara", ibukota: "Ternate", kabupatenKota: [
      { code: "71", name: "Ternate", type: "Kota", ibukota: "Ternate", districts: [{ code: "01", name: "Ternate Tengah" }, { code: "02", name: "Ternate Selatan" }] },
      { code: "72", name: "Tidore Kepulauan", type: "Kota", ibukota: "Tidore", districts: [{ code: "01", name: "Tidore" }, { code: "02", name: "Oba" }] },
    ]
  },
  {
    code: "91", name: "Papua", ibukota: "Jayapura", kabupatenKota: [
      { code: "71", name: "Jayapura", type: "Kota", ibukota: "Jayapura", districts: [{ code: "01", name: "Jayapura Utara" }, { code: "02", name: "Jayapura Selatan" }, { code: "03", name: "Abepura" }] },
    ]
  },
  {
    code: "92", name: "Papua Barat", ibukota: "Manokwari", kabupatenKota: [
      { code: "01", name: "Manokwari", type: "Kabupaten", ibukota: "Manokwari", districts: [{ code: "01", name: "Manokwari Barat" }, { code: "02", name: "Manokwari Timur" }] },
    ]
  },
  {
    code: "93", name: "Papua Selatan", ibukota: "Merauke", kabupatenKota: [
      { code: "01", name: "Merauke", type: "Kabupaten", ibukota: "Merauke", districts: [{ code: "01", name: "Merauke" }, { code: "02", name: "Kurik" }] },
    ]
  },
  {
    code: "94", name: "Papua Tengah", ibukota: "Nabire", kabupatenKota: [
      { code: "01", name: "Nabire", type: "Kabupaten", ibukota: "Nabire", districts: [{ code: "01", name: "Nabire" }, { code: "02", name: "Teluk Umar" }] },
    ]
  },
  {
    code: "95", name: "Papua Pegunungan", ibukota: "Jayawijaya", kabupatenKota: [
      { code: "01", name: "Jayawijaya", type: "Kabupaten", ibukota: "Wamena", districts: [{ code: "01", name: "Wamena" }, { code: "02", name: "Asologaima" }] },
    ]
  },
  {
    code: "96", name: "Papua Barat Daya", ibukota: "Sorong", kabupatenKota: [
      { code: "71", name: "Sorong", type: "Kota", ibukota: "Sorong", districts: [{ code: "01", name: "Sorong" }, { code: "02", name: "Sorong Barat" }, { code: "03", name: "Sorong Timur" }] },
    ]
  },
];

export const STREET_NAMES = [
  "Jl. Ahmad Yani", "Jl. Diponegoro", "Jl. Sudirman", "Jl. Thamrin", "Jl. Merdeka",
  "Jl. Gajah Mada", "Jl. Pahlawan", "Jl. Veteran", "Jl. Sisingamangaraja", "Jl. Imam Bonjol",
  "Jl. Dr. Soetomo", "Jl. Hayam Wuruk", "Jl. Pattimura", "Jl. Teuku Umar", "Jl. Kaliurang",
  "Jl. Raya Pos", "Jl. Mangga Dua", "Jl. Gunung Sahari", "Jl. Matraman Raya", "Jl. Margorejo",
  "Jl. Siliwangi", "Jl. A. P. Pettarani", "Jl. Perintis Kemerdekaan", "Jl. Hertasning",
  "Jl. Urip Sumoharjo", "Jl. Andi Mappanyukki", "Jl. Sultan Hasanuddin", "Jl. Todopuli",
  "Jl. Veteran Selatan", "Jl. Kapten Pierre Tendean",
];

export const KAMPUNG_NAMES = [
  "Kelurahan", "Desa", "Lingkungan",
];

export const POSTAL_CODES: Record<string, string[]> = {
  "71": ["90111", "90112", "90113"],
  "73": ["90221", "90222", "90223", "90224", "90225"],
  "11": ["23111", "23112"],
  "31": ["10110", "10220", "10330", "10440"],
  "35": ["60211", "60231", "60251", "60281"],
  "32": ["40111", "40121", "40131"],
  "51": ["80111", "80112", "80113"],
};

export function getRandomPostalCode(provinceCode: string, rng?: () => number): string {
  const rand = rng ?? Math.random;
  const codes = POSTAL_CODES[provinceCode];
  if (codes && codes.length > 0) return codes[Math.floor(rand() * codes.length)];
  return `${provinceCode}${String(Math.floor(100 + rand() * 899))}${String(Math.floor(10 + rand() * 89))}`;
}

export const REFERRAL_FACILITIES: ReferralFacility[] = [
  { id: "PUSK-001", name: "Puskesmas Pancoran", type: "Puskesmas", provinceCode: "31", regencyCode: "74", capacity: 50, doctors: 2, nurses: 5, beds: 0 },
  { id: "PUSK-002", name: "Puskesmas Kembangan", type: "Puskesmas", provinceCode: "31", regencyCode: "73", capacity: 40, doctors: 2, nurses: 4, beds: 0 },
  { id: "PUSK-003", name: "Puskesmas Makassar Kota", type: "Puskesmas", provinceCode: "73", regencyCode: "71", capacity: 60, doctors: 3, nurses: 6, beds: 0 },
  { id: "PUSK-004", name: "Puskesmas Panakkukang", type: "Puskesmas", provinceCode: "73", regencyCode: "71", capacity: 55, doctors: 2, nurses: 5, beds: 0 },
  { id: "PUSK-005", name: "Puskesmas Tamalate", type: "Puskesmas", provinceCode: "73", regencyCode: "71", capacity: 45, doctors: 2, nurses: 4, beds: 0 },
  { id: "PUSK-006", name: "Puskesmas Pahandut", type: "Puskesmas", provinceCode: "62", regencyCode: "71", capacity: 35, doctors: 1, nurses: 3, beds: 0 },
  { id: "PUSK-007", name: "Puskesmas Sirimau", type: "Puskesmas", provinceCode: "81", regencyCode: "71", capacity: 40, doctors: 2, nurses: 4, beds: 0 },
  { id: "PUSK-008", name: "Puskesmas Abepura", type: "Puskesmas", provinceCode: "91", regencyCode: "71", capacity: 30, doctors: 1, nurses: 3, beds: 0 },
  { id: "PUSK-009", name: "Puskesmas Wenang", type: "Puskesmas", provinceCode: "71", regencyCode: "71", capacity: 50, doctors: 2, nurses: 5, beds: 0 },
  { id: "PUSK-010", name: "Puskesmas Kuta Alam", type: "Puskesmas", provinceCode: "11", regencyCode: "71", capacity: 45, doctors: 2, nurses: 4, beds: 0 },
  { id: "PUSK-011", name: "Puskesmas Mataram Kota", type: "Puskesmas", provinceCode: "52", regencyCode: "71", capacity: 50, doctors: 2, nurses: 5, beds: 0 },
  { id: "PUSK-012", name: "Puskesmas Kelapa Lima", type: "Puskesmas", provinceCode: "53", regencyCode: "71", capacity: 40, doctors: 2, nurses: 3, beds: 0 },
  { id: "PUSK-013", name: "Puskesmas Tarakan Timur", type: "Puskesmas", provinceCode: "65", regencyCode: "71", capacity: 35, doctors: 1, nurses: 3, beds: 0 },
  { id: "PUSK-014", name: "Puskesmas Merauke", type: "Puskesmas", provinceCode: "93", regencyCode: "01", capacity: 25, doctors: 1, nurses: 2, beds: 0 },
  { id: "PUSK-015", name: "Puskesmas Palu Timur", type: "Puskesmas", provinceCode: "72", regencyCode: "71", capacity: 45, doctors: 2, nurses: 4, beds: 0 },
  { id: "KLINIK-001", name: "Klinik Sehat Bersama Makassar", type: "Klinik", provinceCode: "73", regencyCode: "71", capacity: 30, doctors: 3, nurses: 4, beds: 0 },
  { id: "KLINIK-002", name: "Klinik Medika Surabaya", type: "Klinik", provinceCode: "35", regencyCode: "78", capacity: 40, doctors: 4, nurses: 5, beds: 0 },
  { id: "KLINIK-003", name: "Klinik Prima Manado", type: "Klinik", provinceCode: "71", regencyCode: "71", capacity: 25, doctors: 2, nurses: 3, beds: 0 },
  { id: "KLINIK-004", name: "Klinik Asih Ambon", type: "Klinik", provinceCode: "81", regencyCode: "71", capacity: 20, doctors: 2, nurses: 3, beds: 0 },
  { id: "KLINIK-005", name: "Klinik Sejati Jayapura", type: "Klinik", provinceCode: "91", regencyCode: "71", capacity: 20, doctors: 2, nurses: 2, beds: 0 },
  { id: "RSD-001", name: "RS Tipe D Makassar", type: "RS Tipe D", provinceCode: "73", regencyCode: "71", capacity: 50, doctors: 5, nurses: 15, beds: 30 },
  { id: "RSD-002", name: "RS Tipe D Palu", type: "RS Tipe D", provinceCode: "72", regencyCode: "71", capacity: 40, doctors: 4, nurses: 12, beds: 25 },
  { id: "RSD-003", name: "RS Tipe D Kupang", type: "RS Tipe D", provinceCode: "53", regencyCode: "71", capacity: 35, doctors: 3, nurses: 10, beds: 20 },
  { id: "RSD-004", name: "RS Tipe D Ambon", type: "RS Tipe D", provinceCode: "81", regencyCode: "71", capacity: 40, doctors: 4, nurses: 12, beds: 25 },
  { id: "RSD-005", name: "RS Tipe D Jayapura", type: "RS Tipe D", provinceCode: "91", regencyCode: "71", capacity: 35, doctors: 3, nurses: 10, beds: 20 },
  { id: "RSC-001", name: "RS Tipe C Haji Makassar", type: "RS Tipe C", provinceCode: "73", regencyCode: "71", capacity: 150, doctors: 30, nurses: 80, beds: 100 },
  { id: "RSC-002", name: "RS Tipe C Undata Palu", type: "RS Tipe C", provinceCode: "72", regencyCode: "71", capacity: 120, doctors: 25, nurses: 60, beds: 80 },
  { id: "RSC-003", name: "RS Tipe C Prof Dr WZ Kupang", type: "RS Tipe C", provinceCode: "53", regencyCode: "71", capacity: 130, doctors: 25, nurses: 65, beds: 85 },
  { id: "RSC-004", name: "RS Tipe C Bhayangkara Ambon", type: "RS Tipe C", provinceCode: "81", regencyCode: "71", capacity: 100, doctors: 20, nurses: 50, beds: 65 },
  { id: "RSC-005", name: "RS Tipe C Dian Harapan Jayapura", type: "RS Tipe C", provinceCode: "91", regencyCode: "71", capacity: 110, doctors: 22, nurses: 55, beds: 70 },
  { id: "RSC-006", name: "RS Tipe C Elim Manado", type: "RS Tipe C", provinceCode: "71", regencyCode: "71", capacity: 140, doctors: 28, nurses: 70, beds: 90 },
  { id: "RSC-007", name: "RS Tipe C Banjarmasin", type: "RS Tipe C", provinceCode: "63", regencyCode: "71", capacity: 120, doctors: 24, nurses: 60, beds: 75 },
  { id: "RSC-008", name: "RS Tipe C Samarinda", type: "RS Tipe C", provinceCode: "64", regencyCode: "71", capacity: 130, doctors: 26, nurses: 65, beds: 80 },
  { id: "RSC-009", name: "RS Tipe C Mataram", type: "RS Tipe C", provinceCode: "52", regencyCode: "71", capacity: 125, doctors: 25, nurses: 62, beds: 78 },
  { id: "RSC-010", name: "RS Tipe C Kota Gorontalo", type: "RS Tipe C", provinceCode: "75", regencyCode: "71", capacity: 90, doctors: 18, nurses: 45, beds: 55 },
];
