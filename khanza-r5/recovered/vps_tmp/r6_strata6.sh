#!/bin/bash
echo "=== FK constraints on reg_periksa ==="
mysql -uroot -N -e "SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA='sik_p6' AND TABLE_NAME='reg_periksa' AND REFERENCED_TABLE_NAME IS NOT NULL;"
echo "=== does pasien 000002 exist in sik_p6? ==="
mysql -uroot -N -e "SELECT no_rkm_medis FROM sik_p6.pasien WHERE no_rkm_medis='000002';"
echo "=== try insert with explicit error check ==="
PAT=$(mysql -uroot -N -e "SELECT no_rkm_medis FROM sik_p6.pasien WHERE no_rkm_medis<>'-' AND no_rkm_medis<>'' LIMIT 1;" | head -1)
echo "patient from sik_p6.pasien: [$PAT]"
mysql -uroot -e "INSERT IGNORE INTO sik_p6.reg_periksa (no_rawat, tgl_registrasi, jam_reg, no_rkm_medis, status_bayar) VALUES ('STRATA-EMBALASE','2026-10-01','08:00:00','$PAT','Belum Bayar');" 2>&1
echo "rc: $?"
mysql -uroot -N -e "SELECT no_rawat, no_rkm_medis FROM sik_p6.reg_periksa WHERE no_rawat='STRATA-EMBALASE';"
