set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1 P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2
echo "=== AC-1/AC-7: three_count on scratch anchor ==="
env RUN_ID=r5p2_3c_v3 python3 three_count_reconcile_p2.py --stage A 2>&1 | grep -E "cohort|Count A|Count B|Count C|B total|verdict|GAP|P2-" | head -20
