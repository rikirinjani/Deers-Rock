#!/bin/bash
PAT=$(mysql -uroot -N -e "SELECT no_rkm_medis FROM sik_p6.pasien WHERE no_rkm_medis<>'-' AND no_rkm_medis<>'' LIMIT 1;" | head -1)
KDPJ=$(mysql -uroot -N -e "SELECT kd_pj FROM sik_p6.penjab LIMIT 1;" | head -1)
echo "PAT=[$PAT] KDPJ=[$KDPJ]"
cat > /tmp/strata_p6_full.sql <<EOF
INSERT INTO sik_p6.reg_periksa
 (no_rawat, tgl_registrasi, jam_reg, no_rkm_medis, kd_pj, stts_daftar,
  status_lanjut, status_bayar, status_poli, biaya_reg)
VALUES
 ('STRATA-EMBALASE','2026-10-01','08:00:00','$PAT','$KDPJ','Baru','Ralan','Belum Bayar','Baru',10000),
 ('STRATA-TUSLAH','2026-10-01','08:00:00','$PAT','$KDPJ','Baru','Ralan','Belum Bayar','Baru',10000),
 ('STRATA-HALFPPN','2026-10-01','08:00:00','$PAT','$KDPJ','Baru','Ralan','Belum Bayar','Baru',10000),
 ('STRATA-ZEROFEE','2026-10-01','08:00:00','$PAT','$KDPJ','Baru','Ralan','Belum Bayar','Baru',0),
 ('STRATA-GT3PROC','2026-10-01','08:00:00','$PAT','$KDPJ','Baru','Ralan','Belum Bayar','Baru',10000);
EOF
mysql -uroot < /tmp/strata_p6_full.sql
echo "insert rc: $?"
echo "=== verify 5 STRATA- reg rows in sik_p6 (date-resolved, P6-2a) ==="
mysql -uroot -N -e "SELECT no_rawat, tgl_registrasi, status_bayar, biaya_reg FROM sik_p6.reg_periksa WHERE no_rawat LIKE 'STRATA-%' ORDER BY no_rawat;"
echo "count: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.reg_periksa WHERE no_rawat LIKE 'STRATA-%';")"
