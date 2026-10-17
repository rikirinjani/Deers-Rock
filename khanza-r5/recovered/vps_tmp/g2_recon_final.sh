#!/bin/bash
# G2 recon: charge ledger schema + consumer DB + dr_export source schema
set +e
echo "=== dr_charge_ledger columns + row count (sik_bench) ==="
mysql -uroot sik_bench -N -B -e "SHOW COLUMNS FROM dr_charge_ledger" 2>/dev/null
echo "row count:"
mysql -uroot sik_bench -N -B -e "SELECT COUNT(*) FROM dr_charge_ledger" 2>/dev/null
echo
echo "=== consumer DB target (database.ini) ==="
grep -iE 'user|database|host|port' /opt/simrs-khanza/setting/database.ini 2>/dev/null | head
echo
echo "=== where is billing written? ==="
echo -n "sik.billing: "
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM sik.billing" 2>/dev/null
echo -n "sik_bench.billing: "
mysql -uroot sik_bench -N -B -e "SELECT COUNT(*) FROM sik_bench.billing" 2>/dev/null
echo
echo "=== dr_export.sh source schema ==="
grep -nE 'database|host|user|port|sik' /opt/simrs-khanza/consumer/dr_export.sh 2>/dev/null | head -10
echo
echo "=== build_dr_charge_ledger.py: which DB does it write to? ==="
grep -nE 'db *=|DB *=|sik_bench|sik\"|sik.*dbutil|dbutil.*sik' /opt/Deers-Rock/tools/build_dr_charge_ledger.py 2>/dev/null | head -12
echo
echo "=== 354 DR visits in sik ==="
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM reg_periksa WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis LIKE 'DR%'" 2>/dev/null
