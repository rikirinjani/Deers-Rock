set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
export P2_CONSUMER_DB=sik_p2
export P2_LEDGER_DB=sik_bench_p2
echo "=== AC-2 (corrected): p2 dr_tariff EMPTY, no fallback => expect FAIL-CLOSED rc=1 ==="
env RUN_ID=r5p2_fc4 python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/tmp/fc4.log 2>&1
echo "rc(no-fallback,empty)=$?"
grep -E "FAIL-CLOSED|EMPTY|done" /tmp/fc4.log | head
echo "=== with --allow-legacy-fallback => expect build + FALLBACK-USED rc=0 ==="
env RUN_ID=r5p2_fc5 python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr --allow-legacy-fallback >/tmp/fc5.log 2>&1
echo "rc(fallback,empty)=$?"
grep -E "FALLBACK-USED|done" /tmp/fc5.log | head
