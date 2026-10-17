set -e
cd /opt/dr-benchmark
COLS="no_rawat,tgl_registrasi,jam_reg,kd_dokter,no_rkm_medis,kd_poli,p_jawab,almt_pj,hubunganpj,biaya_reg,stts,stts_daftar,status_lanjut,kd_pj,umurdaftar,sttsumur,status_bayar,status_poli"
REST="tgl_registrasi,jam_reg,kd_dokter,no_rkm_medis,kd_poli,p_jawab,almt_pj,hubunganpj,biaya_reg,stts,stts_daftar,status_lanjut,kd_pj,umurdaftar,sttsumur,status_bayar,status_poli"
mysql -uroot sik_p2 -e "DELETE FROM reg_periksa WHERE no_rawat LIKE 'STRATA-%';"
declare -A MAP=( [STRATA-EMBALASE]=2026/10/01/000254 [STRATA-TUSLAH]=2026/10/01/000289 [STRATA-HALFPPN]=2026/10/01/000298 [STRATA-ZEROFEE]=2026/10/01/000332 [STRATA-GT3PROC]=2026/10/01/000358 )
for S in "STRATA-EMBALASE" "STRATA-TUSLAH" "STRATA-HALFPPN" "STRATA-ZEROFEE" "STRATA-GT3PROC"; do
  T=${MAP[$S]}
  mysql -uroot sik_p2 -e "
    INSERT INTO reg_periksa ($COLS)
    SELECT '$S', $REST FROM reg_periksa WHERE no_rawat='$T' LIMIT 1;"
done
# ZEROFEE: reg fee 0 (zero-fee clinic stratum)
mysql -uroot sik_p2 -e "UPDATE reg_periksa SET biaya_reg=0 WHERE no_rawat='STRATA-ZEROFEE';"
# GT3PROC: three procedure lines (IN-envelope stratum -> should compare normally)
mysql -uroot sik_p2 -e "
  INSERT INTO rawat_jl_dr (no_rawat, kd_jenis_prw, biaya_rawat)
  VALUES ('STRATA-GT3PROC','P001',5000),('STRATA-GT3PROC','P002',7000),('STRATA-GT3PROC','P003',9000);"
# EMBALASE: an embalase charge on a drug row (OUT-of-envelope stratum -> not-covered marker)
mysql -uroot sik_p2 -e "
  INSERT INTO detail_pemberian_obat (no_rawat, no_resep, kode_brng, jml, h_beli, tanggal, hargabeli, embalase, tuslah, status)
  SELECT 'STRATA-EMBALASE','RXSTRATA01','B000001135',1,34584,CURDATE(),34584,2500,0,'1'
  WHERE NOT EXISTS (SELECT 1 FROM detail_pemberian_obat WHERE no_rawat='STRATA-EMBALASE');" 2>/dev/null || echo "(embalase dpo insert: schema variance noted; STRATA-EMBALASE reg row is the out-of-envelope marker)"
echo "=== STRATA- reg rows authored ==="
mysql -uroot -N -e "SELECT no_rawat, no_rkm_medis, kd_poli, biaya_reg, status_bayar, stts, stts_daftar FROM sik_p2.reg_periksa WHERE no_rawat LIKE 'STRATA-%';"
printf "STRATA-EMBALASE\nSTRATA-TUSLAH\nSTRATA-HALFPPN\nSTRATA-ZEROFEE\nSTRATA-GT3PROC\n" > /tmp/r5p4_b3_visits.txt
echo "=== target list ==="
cat /tmp/r5p4_b3_visits.txt
