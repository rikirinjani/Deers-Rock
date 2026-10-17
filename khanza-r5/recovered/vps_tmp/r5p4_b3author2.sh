set -e
cd /opt/dr-benchmark
RKM=$(mysql -uroot -N -e "SELECT no_rkm_medis FROM sik_p2.reg_periksa WHERE no_rkm_medis LIKE \"DR%\" LIMIT 1;")
POLI=$(mysql -uroot -N -e "SELECT kd_poli FROM sik_p2.reg_periksa WHERE no_rkm_medis LIKE \"DR%\" LIMIT 1;")
echo "rkm=$RKM poli=$POLI"
# Author 5 STRATA- reg rows using the real column set (FK-safe: reuse a real DR patient).
# biaya_reg=0 for zero-fee; STRATA-GT3PROC gets 3 procedure lines so it is in-envelope.
mysql -uroot sik_p2 -e "
INSERT INTO reg_periksa (no_rawat, tgl_registrasi, jam_reg, no_rkm_medis, kd_poli, biaya_reg, status_bayar, stts)
VALUES
 (\"STRATA-EMBALASE\", \"2026-10-01\", \"08:00:00\", '$RKM', '$POLI', 10000, \"Belum Bayar\", \"DR\"),
 (\"STRATA-TUSLAH\",  \"2026-10-01\", \"08:05:00\", '$RKM', '$POLI', 10000, \"Belum Bayar\", \"DR\"),
 (\"STRATA-HALFPPN\",  \"2026-10-01\", \"08:10:00\", '$RKM', '$POLI', 10000, \"Belum Bayar\", \"DR\"),
 (\"STRATA-ZEROFEE\",  \"2026-10-01\", \"08:15:00\", '$RKM', '$POLI', 0,     \"Belum Bayar\", \"DR\"),
 (\"STRATA-GT3PROC\",  \"2026-10-01\", \"08:20:00\", '$RKM', '$POLI', 10000, \"Belum Bayar\", \"DR\");"
echo "authored STRATA- reg rows: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p2.reg_periksa WHERE no_rawat LIKE \"STRATA-%\";")"
# Give STRATA-GT3PROC three procedure lines (in-envelope) + STRATA-EMBALASE an embalase row (out-of-envelope).
mysql -uroot sik_p2 -e "
INSERT INTO rawat_jl_dr (no_rawat, kd_jenis_prw, biaya_rawat)
 VALUES (\"STRATA-GT3PROC\", \"PRW001\", 5000), (\"STRATA-GT3PROC\", \"PRW002\", 7000), (\"STRATA-GT3PROC\", \"PRW003\", 9000);
UPDATE detail_pemberian_obat SET embalase = 2500 WHERE no_rawat = (SELECT no_rawat FROM sik_p2.reg_periksa WHERE no_rawat=\"STRATA-EMBALASE\" LIMIT 1);" 2>/dev/null || echo "(embalase note: no pre-existing dpo row for STRATA-EMBALASE; flagged as not-covered by absence)"
printf "STRATA-EMBALASE\nSTRATA-TUSLAH\nSTRATA-HALFPPN\nSTRATA-ZEROFEE\nSTRATA-GT3PROC\n" > /tmp/r5p4_b3_visits.txt
echo "=== target list ==="
cat /tmp/r5p4_b3_visits.txt
