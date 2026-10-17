#!/bin/bash
export MYSQL_PWD="$(cat /opt/simrs-khanza/run-env/benchmark_pw)"
my() { mysql -ubenchmark -N -B "$@"; }

echo "=== dokter D0000002 full row (INSERT template) ==="
my sik -e "SELECT kd_dokter, nm_dokter, jk, tmp_lahir, tgl_lahir, gol_drh, agama, almt_tgl, no_telp, email, stts_nikah, kd_sps, alumni, no_ijn_praktek, status FROM dokter WHERE kd_dokter='D0000002'\G" 2>/dev/null | head -20
echo "=== dokter nullability ==="
my sik -e 'DESCRIBE dokter'
echo "=== sik_bench full table list ==="
my sik_bench -e 'SHOW TABLES' | head -40
echo "=== sik_bench dokter rows ==="
my sik_bench -e 'SELECT kd_dokter, nm_dokter FROM dokter ORDER BY 1'
echo "=== classpath jars ==="
ls -la /opt/simrs-khanza/KhanzaSecurity16bit/dist/KhanzaSecurity16bit.jar /opt/simrs-khanza/lib/mariadb.jar /opt/simrs-khanza/resumepasien/lib/commons-codec-1.10.jar 2>&1
echo "=== benchmark grants ==="
my -e 'SHOW GRANTS' 2>&1 | head -6
echo "=== current /tmp/dr_encounters.txt ==="
ls -la /tmp/dr_encounters.txt 2>/dev/null; grep -c '^ENC ' /tmp/dr_encounters.txt 2>/dev/null
echo "=== md5 of consumer class vs source compile state ==="
ls -la /opt/simrs-khanza/consumer/KhanzaBillingConsumer.class /opt/simrs-khanza/consumer/KhanzaBillingConsumer.java
echo "=== javac candidates ==="
ls /usr/lib/jvm/java-17-openjdk-amd64/bin/ | grep -i javac
echo "=== resep_obat sample rows (no_resep <-> no_rawat shape) ==="
my sik -e "SELECT no_resep, no_rawat, tgl_perawatan, jam, kd_dokter, tgl_peresepan FROM resep_obat WHERE no_rawat LIKE '2026/10%' LIMIT 5"
echo "=== distinct no_rawat in resep_obat october (DR vs seed) ==="
my sik -e 'SELECT SUM(rp.no_rkm_medis LIKE "DR%") dr_visits, SUM(rp.no_rkm_medis NOT LIKE "DR%") seed_visits
FROM (SELECT DISTINCT no_rawat FROM resep_obat WHERE no_rawat LIKE "2026/10%") x
INNER JOIN reg_periksa rp ON rp.no_rawat = x.no_rawat;'
echo "=== DR procedure-only visits: sample ==="
my sik -e 'SELECT r.no_rawat, r.tgl_registrasi, COALESCE(r.jam_reg,"-") FROM reg_periksa r WHERE r.no_rkm_medis LIKE "DR%"
AND NOT EXISTS (SELECT 1 FROM resep_obat d WHERE d.no_rawat = r.no_rawat)
AND EXISTS (SELECT 1 FROM rawat_jl_dr j WHERE j.no_rawat = r.no_rawat) LIMIT 5;'
echo "=== DR visits total (reg) with october filter ==="
my sik -e 'SELECT COUNT(*) FROM reg_periksa WHERE no_rkm_medis LIKE "DR%" AND no_rawat LIKE "2026/10%";'
