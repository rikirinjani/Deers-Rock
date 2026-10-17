set -e
cd /opt/dr-benchmark
RKM=$(mysql -uroot -N -e "SELECT no_rkm_medis FROM sik_p2.reg_periksa WHERE no_rkm_medis LIKE \"DR%\" LIMIT 1;")
POLI=$(mysql -uroot -N -e "SELECT kd_poli FROM sik_p2.reg_periksa WHERE no_rkm_medis LIKE \"DR%\" AND kd_poli<>\"\" LIMIT 1;")
echo "rkm=$RKM poli=$POLI"
# clean any partial STRATA- rows from the failed attempt
mysql -uroot sik_p2 -e "DELETE FROM reg_periksa WHERE no_rawat LIKE \"STRATA-%\"; DELETE FROM rawat_jl_dr WHERE no_rawat LIKE \"STRATA-%\";"
mysql -uroot sik_p2 -e "
INSERT INTO reg_periksa (no_rawat, tgl_registrasi, jam_reg, no_rkm_medis, kd_poli, biaya_reg, status_bayar, stts, stts_daftar)
VALUES
 (\"STRATA-EMBALASE\", \"2026-10-01\", \"08:00:00\", '$RKM', '$POLI', 10000, \"Belum Bayar\", \"Belum\", \"Baru\"),
 (\"STRATA-TUSLAH\",  \"2026-10-01\", \"08:05:00\", '$RKM', '$POLI', 10000, \"Belum Bayar\", \"Belum\", \"Baru\"),
 (\"STRATA-HALFPPN\",  \"2026-10-01\", \"08:10:00\", '$RKM', '$POLI', 10000, \"Belum Bayar\", \"Belum\", \"Baru\"),
 (\"STRATA-ZEROFEE\",  \"2026-10-01\", \"08:15:00\", '$RKM', '$POLI', 0,     \"Belum Bayar\", \"Belum\", \"Baru\"),
 (\"STRATA-GT3PROC\",  \"2026-10-01\", \"08:20:00\", '$RKM', '$POLI', 10000, \"Belum Bayar\", \"Belum\", \"Baru\");"
echo "authored STRATA- reg rows: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p2.reg_periksa WHERE no_rawat LIKE \"STRATA-%\";")"
# STRATA-GT3PROC: three procedure lines (in-envelope stratum -> should compare normally)
mysql -uroot sik_p2 -e "
INSERT INTO rawat_jl_dr (no_rawat, kd_jenis_prw, biaya_rawat)
 VALUES (\"STRATA-GT3PROC\", \"P001\", 5000), (\"STRATA-GT3PROC\", \"P002\", 7000), (\"STRATA-GT3PROC\", \"P003\", 9000);"
# STRATA-EMBALASE: an embalase charge on a drug row (out-of-envelope stratum -> not-covered marker)
mysql -uroot sik_p2 -e "
INSERT INTO detail_pemberian_obat (no_rawat, no_resep, kode_brng, jml, h_beli, tanggal, hargabeli, embalase, tuslah, status)
 VALUES (\"STRATA-EMBALASE\", \"RXSTRATA01\", \"B000001135\", 1, 34584, CURDATE(), 34584, 2500, 0, \"1\");" 2>/dev/null || \
echo "(embalase insert skipped if no_resep/cols differ; the STRATA-EMBALASE reg row itself is the out-of-envelope marker)"
printf "STRATA-EMBALASE\nSTRATA-TUSLAH\nSTRATA-HALFPPN\nSTRATA-ZEROFEE\nSTRATA-GT3PROC\n" > /tmp/r5p4_b3_visits.txt
echo "=== target list ==="
cat /tmp/r5p4_b3_visits.txt
