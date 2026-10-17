#!/bin/bash
# G2: check consumer DB target + ledger state + dr_export.sh source
set +e
echo "=== consumer DB (database.ini) ==="
grep -iE 'user|database|host|port' /opt/simrs-khanza/setting/database.ini 2>/dev/null | head
echo
echo "=== sik.billing count ==="
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM sik.billing" 2>/dev/null
echo "=== sik reg_DR count ==="
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM sik.reg_periksa WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis LIKE 'DR%'" 2>/dev/null
echo
echo "=== sik_bench dr_charge_ledger ==="
mysql -uroot sik_bench -N -B -e "SELECT COUNT(*) FROM sik_bench.dr_charge_ledger" 2>/dev/null
echo "=== sample rows ==="
mysql -uroot sik_bench -B -e "SELECT no_rawat, component, code, quantity, unit_price, amount FROM dr_charge_ledger LIMIT 5" 2>/dev/null
echo
echo "=== per-component totals ==="
mysql -uroot sik_bench -B -e "SELECT component, COUNT(*), SUM(amount) FROM dr_charge_ledger GROUP BY component" 2>/dev/null
echo
echo "=== dr_export.sh: which schema does it read from? ==="
grep -nE 'database|DBNAME|sik' /opt/simrs-khanza/consumer/dr_export.sh 2>/dev/null | head -10
