PAT=$(mysql -uroot -N -e "SELECT no_rkm_medis FROM sik.reg_periksa WHERE no_rkm_medis LIKE '"'"'DR%'"'"' LIMIT 1;" | head -1)
for n in STRATA-TUSLAH STRATA-HALFPPN STRATA-ZEROFEE STRATA-GT3PROC; do
  mysql -uroot sik_p6 -e "INSERT IGNORE INTO reg_periksa (no_rawat, tgl_registrasi, jam_reg, no_rkm_medis, status_bayar) VALUES ('$n','2026-10-01','08:00:00','$PAT','Belum Bayar');" 2>&1
done
echo "=== verify 5 STRATA- reg rows now present (P6-2a date-resolved) ==="
mysql -uroot sik_p6 -N -e "SELECT no_rawat, tgl_registrasi, status_bayar FROM reg_periksa WHERE no_rawat LIKE '"'"'STRATA-%'"'"' ORDER BY no_rawat;"
echo "count: $(mysql -uroot sik_p6 -N -e "SELECT COUNT(*) FROM reg_periksa WHERE no_rawat LIKE '"'"'STRATA-%'"'"';")"
