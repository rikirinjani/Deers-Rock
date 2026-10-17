#!/bin/bash
# G2 recon: consumer DB target + dr_charge_ledger state + dr_export source
set +e
echo "=== consumer DB target (database.ini) ==="
grep -iE 'user|database|host|port' /opt/simrs-khanza/setting/database.ini 2>/dev/null | head
echo
echo "=== where is billing written? both schemas ==="
echo "sik.billing:"
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM sik.billing" 2>/dev/null
echo "sik_bench.billing:"
mysql -uroot sik_bench -N -B -e "SELECT COUNT(*) FROM sik_bench.billing" 2>/dev/null
echo
echo "=== dr_charge_ledger in sik_bench ==="
mysql -uroot sik_bench -N -B -e "SHOW TABLES LIKE 'dr_charge%'" 2>/dev/null
echo "row count + per component:"
mysql -uroot sik_bench -N -B -e "SELECT COUNT(*) FROM dr_charge_ledger" 2>/dev/null
mysql -uroot sik_bench -B -e "SELECT component, COUNT(*) c, SUM(amount) s FROM dr_charge_ledger GROUP BY component" 2>/dev/null
echo
echo "=== dr_export.sh source schema ==="
grep -nE 'DATABASE|DBNAME|sik' /opt/simrs-khanza/consumer/dr_export.sh 2>/dev/null | head -8
echo
echo "=== is there a separate sik_bench export or does dr_export read sik? ==="
grep -nE 'sik_bench|sik' /opt/simrs-khanza/consumer/dr_export.sh 2>/dev/null | head -10
