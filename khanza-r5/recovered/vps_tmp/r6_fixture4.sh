echo "=== verify sik_p6 loaded ==="
for t in reg_periksa billing detail_pemberian_obat databarang rawat_jl_dr pasien; do
  echo "$t: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.$t;" 2>&1)"
done
echo ""
echo "=== now add the 5 P4 STRATA- visits (FK-safe: reuse a real DR patient) ==="
# find a real DR patient
PAT=$(mysql -uroot -N -e "SELECT no_rkm_medis FROM sik.reg_periksa WHERE no_rkm_medis LIKE '"'"'DR%'"'"' LIMIT 1;")
echo "using patient: $PAT"
# author 5 STRATA- reg_periksa rows in sik_p6 (reusing the real patient FK, 2026-10-01)
mysql -uroot sik_p6 << SQL
INSERT IGNORE INTO reg_periksa (no_rawat, no_rkm_medis, tgl_registrasi, jam_reg, status_bayar) VALUES
('"'"'STRATA-EMBALASE'"'"', '"'"'$PAT'"'"', '"'"'2026-10-01'"'"', '"'"'08:00:00'"'"', '"'"'Belum Bayar'"'"'),
('"'"'STRATA-TUSLAH'"'"',   '"'"'$PAT'"'"', '"'"'2026-10-01'"'"', '"'"'08:00:00'"'"', '"'"'Belum Bayar'"'"'),
('"'"'STRATA-HALFPPN'"'"',   '"'"'$PAT'"'"', '"'"'2026-10-01'"'"', '"'"'08:00:00'"'"', '"'"'Belum Bayar'"'"'),
('"'"'STRATA-ZEROFEE'"'"',   '"'"'$PAT'"'"', '"'"'2026-10-01'"'"', '"'"'08:00:00'"'"', '"'"'Belum Bayar'"'"'),
('"'"'STRATA-GT3PROC'"'"',   '"'"'$PAT'"'"', '"'"'2026-10-01'"'"', '"'"'08:00:00'"'"', '"'"'Belum Bayar'"'"');
SQL
echo "strata reg rows in sik_p6: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.reg_periksa WHERE no_rawat LIKE '"'"'STRATA-%'"'"';")"
mysql -uroot -N -e "SELECT no_rawat, tgl_registrasi FROM sik_p6.reg_periksa WHERE no_rawat LIKE '"'"'STRATA-%'"'"' ORDER BY no_rawat;"
