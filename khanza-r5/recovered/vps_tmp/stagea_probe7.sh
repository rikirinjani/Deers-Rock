#!/bin/bash
export MYSQL_PWD=$(cat /opt/simrs-khanza/run-env/benchmark_pw)
M="mysql -ubenchmark -N -B"
echo "=== jns_perawatan name collisions (multi kd per name, in DR cohort procedures) ==="
$M sik -e "SELECT COUNT(*) FROM (SELECT j.nm_perawatan, COUNT(DISTINCT j.kd_jenis_prw) c FROM jns_perawatan j WHERE j.kd_jenis_prw IN (SELECT DISTINCT kd_jenis_prw FROM rawat_jl_dr WHERE no_rawat LIKE '2026/10/%') GROUP BY j.nm_perawatan HAVING c>1) x"
echo "=== dpo embalase/tuslah nonzero in cohort ==="
$M sik -e "SELECT COUNT(*) FROM detail_pemberian_obat WHERE no_rawat LIKE '2026/10/%' AND (embalase<>0 OR tuslah<>0)"
echo "=== dpo total == jml*h_beli canonical check ==="
$M sik -e "SELECT COUNT(*) FROM detail_pemberian_obat WHERE no_rawat LIKE '2026/10/%' AND ABS(total - jml*h_beli) > 0.001"
echo "=== small masters in sik ==="
$M sik -e "SELECT 'akun_piutang', COUNT(*) FROM akun_piutang UNION ALL SELECT 'set_akun_mandiri', COUNT(*) FROM set_akun_mandiri UNION ALL SELECT 'set_akun_bankjabar', COUNT(*) FROM set_akun_bankjabar UNION ALL SELECT 'set_akun_bankpapua', COUNT(*) FROM set_akun_bankpapua UNION ALL SELECT 'set_akun_bankjateng', COUNT(*) FROM set_akun_bankjateng UNION ALL SELECT 'set_akun_bankbri', COUNT(*) FROM set_akun_bankbri UNION ALL SELECT 'tagihan_briva', COUNT(*) FROM tagihan_briva UNION ALL SELECT 'tagihan_obat_langsung', COUNT(*) FROM tagihan_obat_langgang" 2>&1 | head -3
$M sik -e "SELECT 'tagihan_obat_langsung', COUNT(*) FROM tagihan_obat_langsung" 2>&1
echo "=== temporary-family tables in sik ==="
$M -e "SHOW TABLES FROM sik LIKE 'temporary%'"
$M -e "SHOW TABLES FROM sik LIKE 'tamp%'"
$M -e "SHOW COLUMNS FROM sik.temporary" | awk '{print $1}' | tr '\n' ' '; echo ""
echo "=== dr-bench unit + Xvfb ==="
systemctl status dr-bench.service --no-pager 2>&1 | head -3
pgrep -a Xvfb || echo "no Xvfb running"
echo "=== jasper deps in resumepasien/lib ==="
ls /opt/simrs-khanza/resumepasien/lib/ | grep -iE 'commons-(beanutils|collections|digester|logging)' 
echo "=== pasien DR count ==="
$M sik -e "SELECT COUNT(DISTINCT no_rkm_medis) FROM reg_periksa WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis LIKE 'DR%'"
echo "PROBE7_DONE"
