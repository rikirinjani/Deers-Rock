#!/bin/bash
export MYSQL_PWD="$(cat /opt/simrs-khanza/run-env/benchmark_pw)"
echo "=== stray processes (should be empty) ==="
ps aux | grep -E 'run_all|heartbeat|sleep 600|Xvfb' | grep -v grep || echo "none"
echo "=== defect logs in run dir ==="
ls -la /opt/dr-benchmark/results/20261011T053833Z/ | grep -E 'defect|STOPPED'
echo "=== final DB sanity ==="
mysql -ubenchmark -N -B sik -e '
SELECT "billed_DR", COUNT(DISTINCT b.no_rawat) FROM billing b INNER JOIN reg_periksa r ON b.no_rawat=r.no_rawat WHERE r.no_rkm_medis LIKE "DR%";
SELECT "DR_visits", COUNT(*) FROM reg_periksa WHERE no_rkm_medis LIKE "DR%";
SELECT "distinct_DR_doctors", COUNT(DISTINCT kd_dokter) FROM reg_periksa WHERE no_rkm_medis LIKE "DR%";
SELECT "resep_dokter_reread_pairs", COUNT(*) FROM (SELECT no_resep,kode_brng FROM resep_dokter GROUP BY no_resep,kode_brng HAVING COUNT(*)>1 AND COUNT(DISTINCT jml)>1) x;
SELECT "billing_value_total", SUM(totalbiaya) FROM billing WHERE status IN ("Registrasi","Ralan Dokter","Obat","TtlObat");'
mysql -ubenchmark -N -B sik_bench -e 'SELECT "sik_bench_seed_rows", (SELECT COUNT(*) FROM reg_periksa WHERE no_rkm_medis NOT LIKE "DR%") + (SELECT COUNT(*) FROM billing WHERE no_rawat IN (SELECT no_rawat FROM reg_periksa WHERE no_rkm_medis NOT LIKE "DR%"));'
echo "=== pm1-trace availability ==="
which pm1-trace || ls /usr/local/bin/pm1* /opt/*/pm1* 2>/dev/null || echo "pm1-trace NOT FOUND on VPS"
