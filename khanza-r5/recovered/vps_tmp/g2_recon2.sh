#!/bin/bash
# G2 recon: consumer DB target, billing location, dr_charge_ledger, dr_export source
set +e
echo "=== consumer DB config (database.ini) ==="
grep -iE 'user|database|host|port' /opt/simrs-khanza/setting/database.ini 2>/dev/null | head
echo
echo "=== where is billing written? Check both schemas ==="
echo -n "sik.billing: "
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM sik.billing" 2>/dev/null
echo -n "sik_bench.billing: "
mysql -uroot sik_bench -N -B -e "SELECT COUNT(*) FROM sik_bench.billing" 2>/dev/null
echo
echo "=== dr_charge_ledger location + row count ==="
echo -n "sik.dr_charge_ledger: "
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM sik.dr_charge_ledger" 2>/dev/null
echo -n "sik_bench.dr_charge_ledger: "
mysql -uroot sik_bench -N -B -e "SELECT COUNT(*) FROM sik_bench.dr_charge_ledger" 2>/dev/null
echo
echo "=== dr_export.sh source schema (which DB does it read from?) ==="
grep -nE 'database|sik|DBNAME|FROM |JOIN|SELECT' /opt/simrs-khanza/consumer/dr_export.sh 2>/dev/null | head -20
echo
echo "=== 354 DR visits in which schema? ==="
echo -n "sik: "
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM reg_periksa WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis LIKE 'DR%'" 2>/dev/null
echo -n "sik_bench: "
mysql -uroot sik_bench -N -B -e "SELECT COUNT(*) FROM reg_periksa WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis LIKE 'DR%'" 2>/dev/null
echo
echo "=== dr_charge_ledger sample rows (if populated) ==="
mysql -uroot sik_bench -B -e "SELECT no_rawat, component, code, quantity, unit_price, amount FROM dr_charge_ledger LIMIT 6" 2>/dev/null
echo
echo "=== dr_charge_ledger per-component totals ==="
mysql -uroot sik_bench -B -e "SELECT component, COUNT(*) c, SUM(amount) s FROM dr_charge_ledger GROUP BY component" 2>/dev/null
