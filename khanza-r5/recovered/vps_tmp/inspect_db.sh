#!/bin/bash
# read-only DB inspection for tool design
export MYSQL_PWD="$(cat /opt/simrs-khanza/run-env/benchmark_pw)"
my() { mysql -ubenchmark -N -B "$@"; }

echo "=== resep tables ==="
my sik -e 'SHOW TABLES LIKE "%resep%"'
echo "=== counts ==="
my sik -e 'SELECT "reg_total", COUNT(*) FROM reg_periksa
UNION ALL SELECT "reg_DR", COUNT(*) FROM reg_periksa WHERE no_rkm_medis LIKE "DR%"
UNION ALL SELECT "billing_total", COUNT(*) FROM billing
UNION ALL SELECT "billing_DR", COUNT(*) FROM billing WHERE no_rawat IN (SELECT no_rawat FROM reg_periksa WHERE no_rkm_medis LIKE "DR%")
UNION ALL SELECT "billing_seedpath", COUNT(*) FROM billing WHERE no_rawat IN (SELECT no_rawat FROM reg_periksa WHERE no_rkm_medis NOT LIKE "DR%");'
echo "=== resep_dokter cols ==="
my sik -e 'DESCRIBE resep_dokter' | awk '{printf "%s ", $1}'; echo
echo "=== resep_obat cols ==="
my sik -e 'DESCRIBE resep_obat' | awk '{printf "%s ", $1}'; echo
echo "=== dpo cols ==="
my sik -e 'DESCRIBE detail_pemberian_obat' | awk '{printf "%s ", $1}'; echo
echo "=== dokter cols ==="
my sik -e 'DESCRIBE dokter' | awk '{printf "%s ", $1}'; echo
echo "=== dokter rows ==="
my sik -e 'SELECT kd_dokter, nm_dokter FROM dokter ORDER BY kd_dokter'
echo "=== reg_periksa kd_dokter distinct ==="
my sik -e 'SELECT kd_dokter, COUNT(*) FROM reg_periksa GROUP BY kd_dokter ORDER BY 2 DESC LIMIT 10'
echo "=== duplicate resep_dokter pairs (multi-row, differing jml) ==="
my sik -e 'SELECT no_resep, kode_brng, COUNT(*) c, COUNT(DISTINCT jml) dj, MIN(jml), MAX(jml)
FROM resep_dokter GROUP BY no_resep, kode_brng HAVING c > 1 ORDER BY dj DESC, c DESC;'
echo "=== duplicate resep_obat pairs ==="
my sik -e 'SELECT no_resep, kode_brng, COUNT(*) c, COUNT(DISTINCT jml) dj, MIN(jml), MAX(jml)
FROM resep_obat GROUP BY no_resep, kode_brng HAVING c > 1 ORDER BY dj DESC, c DESC;'
echo "=== DR visit classification: dpo / proc ==="
my sik -e 'SELECT
 (SELECT COUNT(DISTINCT no_rawat) FROM reg_periksa WHERE no_rkm_medis LIKE "DR%") total_dr,
 (SELECT COUNT(DISTINCT no_rawat) FROM detail_pemberian_obat WHERE no_rawat IN (SELECT no_rawat FROM reg_periksa WHERE no_rkm_medis LIKE "DR%")) dr_with_dpo,
 (SELECT COUNT(DISTINCT no_rawat) FROM rawat_jl_dr WHERE no_rawat IN (SELECT no_rawat FROM reg_periksa WHERE no_rkm_medis LIKE "DR%")) dr_with_proc;'
echo "=== procedure-only DR visits (no dpo, has proc) ==="
my sik -e 'SELECT COUNT(*) FROM reg_periksa r WHERE r.no_rkm_medis LIKE "DR%"
AND NOT EXISTS (SELECT 1 FROM detail_pemberian_obat d WHERE d.no_rawat = r.no_rawat)
AND EXISTS (SELECT 1 FROM rawat_jl_dr j WHERE j.no_rawat = r.no_rawat);'
echo "=== billed DR visits ==="
my sik -e 'SELECT COUNT(DISTINCT b.no_rawat) FROM billing b INNER JOIN reg_periksa r ON b.no_rawat = r.no_rawat WHERE r.no_rkm_medis LIKE "DR%";'
echo "=== sik_bench zero-seed check ==="
my sik_bench -e 'SELECT (SELECT COUNT(*) FROM reg_periksa WHERE no_rkm_medis NOT LIKE "DR%") seed_reg,
 (SELECT COUNT(*) FROM reg_periksa) bench_reg_total;' 2>&1 | head -3
echo "=== sik_bench tables with rows (top) ==="
my information_schema -e 'SELECT table_name, table_rows FROM tables WHERE table_schema = "sik_bench" AND table_rows > 0 ORDER BY table_rows DESC LIMIT 15;'
echo "=== enc file / export tool presence ==="
ls -la /opt/simrs-khanza/consumer/dr_export.py /opt/simrs-khanza/consumer/dr_export.sh 2>/dev/null
head -40 /opt/simrs-khanza/consumer/dr_export.sh 2>/dev/null
find /opt -maxdepth 3 -name "*encounters*" -o -maxdepth 3 -name "dr_encounters*" 2>/dev/null | grep -v node_modules | head
