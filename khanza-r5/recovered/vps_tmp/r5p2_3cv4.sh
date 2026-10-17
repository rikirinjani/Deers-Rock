set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1 P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2
echo "=== three_count_p2 full output on scratch anchor ==="
env RUN_ID=r5p2_3c_v4 python3 three_count_reconcile_p2.py --stage A 2>&1
