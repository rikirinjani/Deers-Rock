#!/bin/bash
echo "=== poliklinik columns ==="
mysql -uroot -N -e "SHOW COLUMNS FROM sik.poliklinik"
echo "=== reg-only DR visits (no resep, no proc)? ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik.reg_periksa rp WHERE rp.no_rawat LIKE '2026/10/%' AND rp.no_rkm_medis LIKE 'DR%' AND NOT EXISTS (SELECT 1 FROM sik.resep_obat ro WHERE ro.no_rawat=rp.no_rawat) AND NOT EXISTS (SELECT 1 FROM sik.rawat_jl_dr j WHERE j.no_rawat=rp.no_rawat)"
echo "=== DR strata counts ==="
mysql -uroot -N -e "SELECT
  SUM(n_obat=0 AND n_proc=0) reg_only,
  SUM(n_drugs=1 AND n_proc=0) single_drug,
  SUM(n_drugs>=2 AND n_proc>=1) multi_drug_proc,
  SUM(n_etc>0) has_embalase_tuslah,
  SUM(n_proc>2) gt2_proc
FROM (
  SELECT rp.no_rawat,
    (SELECT COUNT(*) FROM sik.resep_obat ro WHERE ro.no_rawat=rp.no_rawat) n_obat,
    (SELECT COUNT(*) FROM sik.rawat_jl_dr j WHERE j.no_rawat=rp.no_rawat) n_proc,
    (SELECT COUNT(DISTINCT rd.kode_brng) FROM sik.resep_obat ro JOIN sik.resep_dokter rd ON rd.no_resep=ro.no_resep WHERE ro.no_rawat=rp.no_rawat) n_drugs,
    (SELECT COUNT(*) FROM sik.detail_pemberian_obat d WHERE d.no_rawat=rp.no_rawat AND (d.embalase<>0 OR d.tuslah<>0)) n_etc
  FROM sik.reg_periksa rp WHERE rp.no_rawat LIKE '2026/10/%' AND rp.no_rkm_medis LIKE 'DR%'
) x"
echo "=== detail_piutang_pasien exists ==="
mysql -uroot -N -e "SHOW TABLES FROM sik LIKE 'detail_piutang_pasien'"
echo "=== Xvfb running? ==="
pgrep -a Xvfb | head -3
echo "=== nota_jalan sample rows ==="
mysql -uroot -e "SELECT * FROM sik.nota_jalan ORDER BY tanggal DESC LIMIT 3"
echo "=== billing TtlObat rows (structural check) ==="
mysql -uroot -e "SELECT status, biaya, jumlah, totalbiaya, COUNT(*) c FROM sik.billing WHERE status LIKE 'Ttl%' GROUP BY status, biaya, jumlah, totalbiaya LIMIT 10"
