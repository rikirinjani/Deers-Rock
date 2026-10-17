PAT=$(mysql -uroot -N -e "SELECT no_rkm_medis FROM sik.reg_periksa WHERE no_rkm_medis LIKE '"'"'DR%'"'"' LIMIT 1;" | head -1)
echo "FK patient: [$PAT]"
echo "len check: STRATA-EMBALASE = $(printf %s STRATA-EMBALASE | wc -c)"
# test a single insert with the patient
mysql -uroot sik_p6 -e "INSERT IGNORE INTO reg_periksa (no_rawat, tgl_registrasi, jam_reg, no_rkm_medis, status_bayar) VALUES ('STRATA-EMBALASE','2026-10-01','08:00:00','$PAT','Belum Bayar');" 2>&1
echo "single insert rc: $?"
