set -e
cd /opt/dr-benchmark
# Recreate the scratch pair for the P5 demos
echo "=== recreate sik_p2 / sik_bench_p2 ==="
mysql -uroot -e "DROP DATABASE IF EXISTS sik_p2; DROP DATABASE IF EXISTS sik_bench_p2; CREATE DATABASE sik_p2; CREATE DATABASE sik_bench_p2;"
t0=$(date +%s)
mysqldump -uroot sik > /tmp/sik_p2.sql
echo "dump $(($(date +%s)-t0))s $(stat -c%s /tmp/sik_p2.sql)"
t1=$(date +%s)
mysql -uroot sik_p2 < /tmp/sik_p2.sql
echo "restore $(($(date +%s)-t1))s"
rm -f /tmp/sik_p2.sql
# Point the harness at the scratch clone
sed -i "s/^database=.*/database=sik_p2/" /opt/simrs-khanza/setting/database.ini
echo "harness DB: $(grep -E "^database=" /opt/simrs-khanza/setting/database.ini)"
# Author the 5 STRATA- visits (same recipe as P4-B3; FK-safe copy of real DR reg rows)
RKM=$(mysql -uroot -N -e "SELECT no_rkm_medis FROM sik_p2.reg_periksa WHERE no_rkm_medis LIKE 'DR%' LIMIT 1;")
echo "rkm=$RKM"
mysql -uroot sik_p2 -e "DELETE FROM reg_periksa WHERE no_rawat LIKE 'STRATA-%'; DELETE FROM rawat_jl_dr WHERE no_rawat LIKE 'STRATA-%';"
for pair in "STRATA-EMBALASE|2026/10/01/000254" "STRATA-TUSLAH|2026/10/01/000289" "STRATA-HALFPPN|2026/10/01/000298" "STRATA-ZEROFEE|2026/10/01/000332" "STRATA-GT3PROC|2026/10/01/000358"; do
  S="${pair%%|*}"; T="${pair##*|}"
  mysql -uroot sik_p2 -e "
    INSERT INTO reg_periksa (no_rawat,tgl_registrasi,jam_reg,kd_dokter,no_rkm_medis,kd_poli,p_jawab,almt_pj,hubunganpj,biaya_reg,stts,stts_daftar,status_lanjut,kd_pj,umurdaftar,sttsumur,status_bayar,status_poli)
    SELECT '$S', tgl_registrasi, jam_reg, kd_dokter, no_rkm_medis, kd_poli, p_jawab, almt_pj, hubunganpj, biaya_reg, stts, stts_daftar, status_lanjut, kd_pj, umurdaftar, sttsumur, status_bayar, status_poli
    FROM reg_periksa WHERE no_rawat='$T' LIMIT 1;"
done
mysql -uroot sik_p2 -e "UPDATE reg_periksa SET biaya_reg=0 WHERE no_rawat='STRATA-ZEROFEE';"
mysql -uroot sik_p2 -e "
INSERT INTO rawat_jl_dr (no_rawat,kd_jenis_prw,kd_dokter,tgl_perawatan,jam_rawat,material,bhp,tarif_tindakandr,kso,menejemen,biaya_rawat,stts_bayar)
SELECT 'STRATA-GT3PROC','J000376',kd_dokter,tgl_perawatan,jam_rawat,material,bhp,tarif_tindakandr,kso,menejemen,5000,stts_bayar FROM (SELECT * FROM rawat_jl_dr WHERE no_rawat='2026/10/01/000254' LIMIT 1) t;
INSERT INTO rawat_jl_dr (no_rawat,kd_jenis_prw,kd_dokter,tgl_perawatan,jam_rawat,material,bhp,tarif_tindakandr,kso,menejemen,biaya_rawat,stts_bayar)
SELECT 'STRATA-GT3PROC','J000377',kd_dokter,tgl_perawatan,jam_rawat,material,bhp,tarif_tindakandr,kso,menejemen,7000,stts_bayar FROM (SELECT * FROM rawat_jl_dr WHERE no_rawat='2026/10/01/000254' LIMIT 1) t;
INSERT INTO rawat_jl_dr (no_rawat,kd_jenis_prw,kd_dokter,tgl_perawatan,jam_rawat,material,bhp,tarif_tindakandr,kso,menejemen,biaya_rawat,stts_bayar)
SELECT 'STRATA-GT3PROC','J000378',kd_dokter,tgl_perawatan,jam_rawat,material,bhp,tarif_tindakandr,kso,menejemen,9000,stts_bayar FROM (SELECT * FROM rawat_jl_dr WHERE no_rawat='2026/10/01/000254' LIMIT 1) t;"
echo "STRATA reg rows: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p2.reg_periksa WHERE no_rawat LIKE 'STRATA-%';")  GT3PROC proc lines: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p2.rawat_jl_dr WHERE no_rawat='STRATA-GT3PROC';")"
printf "STRATA-EMBALASE\nSTRATA-TUSLAH\nSTRATA-HALFPPN\nSTRATA-ZEROFEE\nSTRATA-GT3PROC\n" > /tmp/r5p5_strata.txt
echo "READY"
