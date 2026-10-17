set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
export P2_CONSUMER_DB=sik_p2
export P2_LEDGER_DB=sik_bench_p2
echo "=== AC-2 (corrected): p2 dr_tariff EMPTY, no fallback => expect FAIL rc=1 ==="
env RUN_ID=r5p2_fc python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/tmp/fc1.log 2>&1
echo "rc(no-fallback,empty)=$?"
grep -E "FAIL-CLOSED|done" /tmp/fc1.log | head
echo "=== with --allow-legacy-fallback => expect build + FALLBACK-USED, rc=0 ==="
env RUN_ID=r5p2_fc2 python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr --allow-legacy-fallback >/tmp/fc2.log 2>&1
echo "rc(fallback,empty)=$?"
grep -E "FALLBACK-USED|done" /tmp/fc2.log | head
echo "=== restore p2 dr_tariff + rebuild p2 ledger so it matches p2 consumer for AC-6 baseline ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p2.billing WHERE no_rawat LIKE \"2026/10/%\";"
