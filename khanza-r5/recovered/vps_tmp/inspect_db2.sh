#!/bin/bash
export MYSQL_PWD="$(cat /opt/simrs-khanza/run-env/benchmark_pw)"
my() { mysql -ubenchmark -N -B "$@"; }

echo "=== rawat_jl_dr distinct kd_dokter (DR visits) ==="
my sik -e 'SELECT j.kd_dokter, COUNT(DISTINCT j.no_rawat) FROM rawat_jl_dr j
 INNER JOIN reg_periksa r ON j.no_rawat = r.no_rawat
 WHERE r.no_rkm_medis LIKE "DR%" GROUP BY j.kd_dokter ORDER BY 1;'
echo "=== resep_obat distinct kd_dokter (DR visits) ==="
my sik -e 'SELECT o.kd_dokter, COUNT(*) FROM resep_obat o
 INNER JOIN reg_periksa r ON o.no_rawat = r.no_rawat
 WHERE r.no_rkm_medis LIKE "DR%" GROUP BY o.kd_dokter ORDER BY 1;'
echo "=== rawat_jl_dr kd_dokter overall distinct ==="
my sik -e 'SELECT COUNT(DISTINCT kd_dokter) FROM rawat_jl_dr;'
my sik -e 'SELECT DISTINCT kd_dokter FROM rawat_jl_dr ORDER BY 1;'
echo "=== reg_periksa kd_dokter for DR visits ==="
my sik -e 'SELECT kd_dokter, COUNT(*) FROM reg_periksa WHERE no_rkm_medis LIKE "DR%" GROUP BY kd_dokter;'
echo "=== pasien DR sample ==="
my sik -e 'SELECT no_rkm_medis, nm_pasien FROM pasien WHERE no_rkm_medis LIKE "DR%" ORDER BY no_rkm_medis LIMIT 25;'
echo "=== seed visits with billing rows (the 34) ==="
my sik -e 'SELECT r.no_rawat, COUNT(b.no_rawat) billing_rows FROM reg_periksa r
 LEFT JOIN billing b ON b.no_rawat = r.no_rawat
 WHERE r.no_rkm_medis NOT LIKE "DR%" GROUP BY r.no_rawat HAVING billing_rows > 0 ORDER BY r.no_rawat LIMIT 40;'
echo "=== nota_jalan for seed visits ==="
my sik -e 'SELECT COUNT(*) FROM nota_jalan n INNER JOIN reg_periksa r ON n.no_rawat = r.no_rawat WHERE r.no_rkm_medis NOT LIKE "DR%";'
echo "=== nota_jalan for DR visits ==="
my sik -e 'SELECT COUNT(*) FROM nota_jalan n INNER JOIN reg_periksa r ON n.no_rawat = r.no_rawat WHERE r.no_rkm_medis LIKE "DR%";'
echo "=== sample billing rows of one billed seed visit ==="
SV=$(my sik -e 'SELECT r.no_rawat FROM reg_periksa r INNER JOIN billing b ON b.no_rawat=r.no_rawat WHERE r.no_rkm_medis NOT LIKE "DR%" GROUP BY r.no_rawat LIMIT 1')
echo "seed visit: $SV"
my sik -e "SELECT noindex, no, nm_perawatan, status, totalbiaya FROM billing WHERE no_rawat='$SV' ORDER BY noindex LIMIT 12"
my sik -e "SELECT no_rawat, no_nota, tanggal, jam FROM nota_jalan WHERE no_rawat='$SV'"
echo "=== seed visits in resep_obat 2026/10 (export leak source) ==="
my sik -e 'SELECT COUNT(DISTINCT ro.no_rawat) FROM resep_obat ro
 INNER JOIN reg_periksa r ON ro.no_rawat = r.no_rawat
 WHERE ro.no_rawat LIKE "2026/10%" AND r.no_rkm_medis NOT LIKE "DR%";'
my sik -e 'SELECT DISTINCT ro.no_rawat FROM resep_obat ro
 INNER JOIN reg_periksa r ON ro.no_rawat = r.no_rawat
 WHERE ro.no_rawat LIKE "2026/10%" AND r.no_rkm_medis NOT LIKE "DR%" LIMIT 40;'
echo "=== dpo duplicate (no_rawat,kode_brng) pairs ==="
my sik -e 'SELECT no_rawat, kode_brng, COUNT(*) c, COUNT(DISTINCT jml) dj, MIN(jml), MAX(jml) FROM detail_pemberian_obat GROUP BY no_rawat, kode_brng HAVING c>1;'
echo "=== dpo rows linked to seed visits ==="
my sik -e 'SELECT COUNT(*) FROM detail_pemberian_obat d INNER JOIN reg_periksa r ON d.no_rawat=r.no_rawat WHERE r.no_rkm_medis NOT LIKE "DR%";'
echo "=== javac / toolchain ==="
which javac java mysql; java -version 2>&1 | head -1
echo "=== results dirs ==="
ls /opt/dr-benchmark/results/
echo "=== dr_export.py full ==="
cat /opt/simrs-khanza/consumer/dr_export.py
echo "=== dr_export.sh rest ==="
tail -20 /opt/simrs-khanza/consumer/dr_export.sh
