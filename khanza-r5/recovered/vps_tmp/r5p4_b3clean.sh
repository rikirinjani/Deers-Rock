set -e
cd /opt/dr-benchmark
# The 6 NOT-NULL-no-default columns: no_rawat, stts_daftar, status_lanjut, kd_pj, status_bayar, status_poli
# My previous attempts failed because the SELECT-copy didn't supply all of them with valid values.
# Cleanest: insert explicitly with the required fields from the template row.
RKM_COL="no_rawat,tgl_registrasi,jam_reg,kd_dokter,no_rkm_medis,kd_poli,p_jawab,almt_pj,hubunganpj,biaya_reg,stts,stts_daftar,status_lanjut,kd_pj,umurdaftar,sttsumur,status_bayar,status_poli"
echo "cols: $RKM_COL"
# First verify no STRATA rows left, then insert one at a time with explicit column set
mysql -uroot sik_p2 -e "DELETE FROM reg_periksa WHERE no_rawat LIKE \"STRATA-%\";"
echo "cleared; reg count now: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p2.reg_periksa;")"
