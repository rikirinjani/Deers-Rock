#!/bin/bash
echo "=== find DlgBilingRalan source ==="
find /opt -name "DlgBilingRalan.java" 2>/dev/null
echo "=== PatchDbXml.java ==="
cat /opt/simrs-khanza/consumer/PatchDbXml.java 2>/dev/null | head -60
echo "=== report candidates (visits/revenue/drugs/dx) ==="
ls /opt/simrs-khanza/run-env/report/ | grep -iE '^rpt' | grep -iE 'kunjungan|pendapatan|pemakaian|frekuensi|obat|bhp' | grep -v jrxml
echo "=== set_nota / akunbayar / admin sizes in sik ==="
export MYSQL_PWD=$(cat /opt/simrs-khanza/run-env/benchmark_pw)
M="mysql -ubenchmark -N -B"
$M -e "SELECT 'set_nota', COUNT(*) FROM sik.set_nota UNION ALL SELECT 'admin', COUNT(*) FROM sik.admin UNION ALL SELECT 'akunbayar', COUNT(*) FROM sik.akunbayar" 2>&1
$M -e "SHOW TABLES FROM sik LIKE '%akun%'" | head -8
echo "PROBE3_DONE"
