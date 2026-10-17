set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1 P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2
env RUN_ID=r5p2_3cv7 python3 three_count_reconcile_p2.py --stage A > /tmp/r5p2_3cv7.log 2>&1
echo "three_count rc=$?"
cat /tmp/r5p2_3cv7.log
