PAT=$(mysql -uroot -N -e "SELECT no_rkm_medis FROM sik.reg_periksa WHERE no_rkm_medis LIKE '"'"'DR%'"'"' LIMIT 1;" | head -1)
echo "PAT=[$PAT]"
cat > /tmp/strata_insert.sql <<EOF
INSERT IGNORE INTO sik_p6.reg_periksa (no_rawat, tgl_registrasi, jam_reg, no_rkm_medis, status_bayar) VALUES
('STRATA-EMBALASE','2026-10-01','08:00:00','$PAT','Belum Bayar'),
('STRATA-TUSLAH','2026-10-01','08:00:00','$PAT','Belum Bayar'),
('STRATA-HALFPPN','2026-10-01','08:00:00','$PAT','Belum Bayar'),
('STRATA-ZEROFEE','2026-10-01','08:00:00','$PAT','Belum Bayar'),
('STRATA-GT3PROC','2026-10-01','08:00:00','$PAT','Belum Bayar');
EOF
mysql -uroot < /tmp/strata_insert.sql 2>&1
echo "insert rc: $?"
echo "=== verify ==="
mysql -uroot -N -e "SELECT no_rawat, tgl_registrasi, status_bayar FROM sik_p6.reg_periksa WHERE no_rawat LIKE 'STRATA-%' ORDER BY no_rawat;"
