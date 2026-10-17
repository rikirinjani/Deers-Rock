set -e
cd /opt/dr-benchmark
# Author 5 synthetic edge-strata visits into sik_p2. Reuse a real DR patient FK (no_rkm_medis)
# with a fresh generated-marker no_rawat so FKs hold. Prefix STRATA- for provenance.
echo "=== pick a real DR patient no_rkm_medis (FK-safe) ==="
RKM=$(mysql -uroot -N -e "SELECT no_rkm_medis FROM sik_p2.reg_periksa WHERE no_rkm_medis LIKE \"DR%\" LIMIT 1;")
echo "using rkm=$RKM"
TS=20261014T0250Z
echo "=== author 5 STRATA- synthetic visits (embalase, tuslah, half-ppn, zero-fee, gt3proc) ==="
mysql -uroot sik_p2 -e "
-- STRATA-1: visit with an embalase charge (out-of-envelope stratum)
INSERT INTO reg_periksa (no_rawat, no_rkm_medis, no_kunjungan, status_bayar, tgl_registrasi, jam_registrasi, poli_id, no_rkm_medis2)
  SELECT \"STRATA-EMBALASE\", '$RKM', 1, \"Belum Bayar\", CURDATE(), \"08:00:00\", poli_id, '$RKM'
  FROM (SELECT 1) t WHERE NOT EXISTS (SELECT 1 FROM reg_periksa WHERE no_rawat=\"STRATA-EMBALASE\");
-- STRATA-2: tuslah charge
INSERT INTO reg_periksa (no_rawat, no_rkm_medis, no_kunjungan, status_bayar, tgl_registrasi, jam_registrasi, poli_id)
  SELECT \"STRATA-TUSLAH\", '$RKM', 1, \"Belum Bayar\", CURDATE(), \"08:05:00\", poli_id
  FROM (SELECT 1) t WHERE NOT EXISTS (SELECT 1 FROM reg_periksa WHERE no_rawat=\"STRATA-TUSLAH\");
-- STRATA-3: half-rupiah PPN (fractional-cent tax row)
INSERT INTO reg_periksa (no_rawat, no_rkm_medis, no_kunjungan, status_bayar, tgl_registrasi, jam_registrasi, poli_id)
  SELECT \"STRATA-HALFPPN\", '$RKM', 1, \"Belum Bayar\", CURDATE(), \"08:10:00\", poli_id
  FROM (SELECT 1) t WHERE NOT EXISTS (SELECT 1 FROM reg_periksa WHERE no_rawat=\"STRATA-HALFPPN\");
-- STRATA-4: zero-fee clinic (reg fee 0)
INSERT INTO reg_periksa (no_rawat, no_rkm_medis, no_kunjungan, status_bayar, tgl_registrasi, jam_registrasi, poli_id)
  SELECT \"STRATA-ZEROFEE\", '$RKM', 1, \"Belum Bayar\", CURDATE(), \"08:15:00\", poli_id
  FROM (SELECT 1) t WHERE NOT EXISTS (SELECT 1 FROM reg_periksa WHERE no_rawat=\"STRATA-ZEROFEE\");
-- STRATA-5: >=3 procedure lines (IN-envelope edge, should compare normally)
INSERT INTO reg_periksa (no_rawat, no_rkm_medis, no_kunjungan, status_bayar, tgl_registrasi, jam_registrasi, poli_id)
  SELECT \"STRATA-GT3PROC\", '$RKM', 1, \"Belum Bayar\", CURDATE(), \"08:20:00\", poli_id
  FROM (SELECT 1) t WHERE NOT EXISTS (SELECT 1 FROM reg_periksa WHERE no_rawat=\"STRATA-GT3PROC\");
"
echo "authored 5 STRATA- reg rows: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p2.reg_periksa WHERE no_rawat LIKE 'STRATA-%';")"
echo "=== write the 5-visit target list for the P1 oracle ==="
printf "STRATA-EMBALASE\nSTRATA-TUSLAH\nSTRATA-HALFPPN\nSTRATA-ZEROFEE\nSTRATA-GT3PROC\n" > /tmp/r5p4_b3_visits.txt
cat /tmp/r5p4_b3_visits.txt
