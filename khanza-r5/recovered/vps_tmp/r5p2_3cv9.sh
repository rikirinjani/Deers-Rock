set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1 P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2
echo "=== three_count_p2 on scratch anchor (expect A==C, B either VERIFIED w/ total or NOT-VERIFIED->PARTIAL) ==="
env RUN_ID=r5p2_3cv9 python3 three_count_reconcile_p2.py --stage A > /tmp/3cv9.log 2>&1
echo "three_count rc=$?"
cat /tmp/3cv9.log
