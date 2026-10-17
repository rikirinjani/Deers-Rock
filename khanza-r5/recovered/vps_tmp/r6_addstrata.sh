PAT=$(mysql -uroot -N -e "SELECT no_rkm_medis FROM sik.reg_periksa WHERE no_rkm_medis IS NOT NULL AND no_rkm_medis<>"""" LIMIT 1;" | head -1)
echo "FK patient: $PAT"
mysql -uroot sik_p6 << SQL
INSERT INTO reg_periksa (no_rawat, tgl_registrasi, jam_reg, no_rkm_medis, status_bayar) VALUES
('"'"'STRATA-EMBALASE'"'"', '"'"'2026-10-01'"'"', '"'"'08:00:00'"'"', '"'"'$PAT'"'"', '"'"'Belum Bayar'"'"'),
('"'"'STRATA-TUSLAH'"'"',   '"'"'2026-10-01'"'"', '"'"'08:00:00'"'"', '"'"'$PAT'"'"', '"'"'Belum Bayar'"'"'),
('"'"'STRATA-HALFPPN'"'"',   '"'"'2026-10-01'"'"', '"'"'08:00:00'"'"', '"'"'$PAT'"'"', '"'"'Belum Bayar'"'"'),
('"'"'STRATA-ZEROFEE'"'"',   '"'"'2026-10-01'"'"', '"'"'08:00:00'"'"', '"'"'$PAT'"'"', '"'"'Belum Bayar'"'"'),
('"'"'STRATA-GT3PROC'"'"',   '"'"'2026-10-01'"'"', '"'"'08:00:00'"'"', '"'"'$PAT'"'"', '"'"'Belum Bayar'"'"');
SQL
echo "rc: $?"
echo "=== verify 5 STRATA- reg rows in sik_p6 (P6-2a date-resolved) ==="
mysql -uroot sik_p6 -N -e "SELECT no_rawat, tgl_registrasi, no_rkm_medis, status_bayar FROM reg_periksa WHERE no_rawat LIKE '"'"'STRATA-%'"'"' ORDER BY no_rawat;"
