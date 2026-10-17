#!/bin/bash
PAT=$(mysql -uroot -N -e "SELECT no_rkm_medis FROM sik.reg_periksa WHERE no_rkm_medis NOT IN ('','-') AND no_rkm_medis IS NOT NULL LIMIT 1;" | head -1)
echo "PAT=[$PAT]"
cat > /tmp/strata_p6.sql <<EOF
INSERT IGNORE INTO sik_p6.reg_periksa (no_rawat, tgl_registrasi, jam_reg, no_rkm_medis, status_bayar) VALUES
('STRATA-EMBALASE','2026-10-01','08:00:00','$PAT','Belum Bayar'),
('STRATA-TUSLAH','2026-10-01','08:00:00','$PAT','Belum Bayar'),
('STRATA-HALFPPN','2026-10-01','08:00:00','$PAT','Belum Bayar'),
('STRATA-ZEROFEE','2026-10-01','08:00:00','$PAT','Belum Bayar'),
('STRATA-GT3PROC','2026-10-01','08:00:00','$PAT','Belum Bayar');
EOF
mysql -uroot < /tmp/strata_p6.sql
echo "insert rc: $?"
echo "=== verify 5 STRATA- reg rows in sik_p6 ==="
mysql -uroot -N -e "SELECT no_rawat, tgl_registrasi, status_bayar, no_rkm_medis FROM sik_p6.reg_periksa WHERE no_rawat LIKE 'STRATA-%' ORDER BY no_rawat;"
echo "count: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.reg_periksa WHERE no_rawat LIKE 'STRATA-%';")"
