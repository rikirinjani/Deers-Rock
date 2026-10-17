set -e
echo "=== is p2 dr_tariff actually empty? ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik_bench_p2.dr_tariff;"
echo "=== the builder reads LEDGER_DB.dr_tariff ? confirm LEDGER_DB target ==="
grep -n "SELECT kind, code, dr_price FROM" /opt/Deers-Rock/tools/build_dr_charge_ledger_p2.py
echo "=== run the builder against p2 WITH dbutil force root, watch the tariff-load log line ==="
cd /opt/Deers-Rock/tools
env RUN_ID=r5p2_fc3 P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2 DBUTIL_FORCE_ROOT=1 \
  python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr 2>&1 | grep -E "dr_tariff|FAIL-CLOSED|done|FALLBACK" | head
