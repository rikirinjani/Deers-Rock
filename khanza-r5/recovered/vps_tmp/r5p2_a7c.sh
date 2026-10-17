set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1 P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2
echo "=== AC-7 scratch anchor: charge_delta (expect delta 0 / PASS) ==="
env RUN_ID=r5p2_a7c python3 charge_delta_per_component_p2.py --stage A 2>&1 | grep -E "cohort visits|Khanza total|overall delta|gate|UNEXPLAINED"
echo "=== AC-7 scratch anchor: three_count (expect A=C match, B NOT-VERIFIED -> PARTIAL) ==="
env RUN_ID=r5p2_a7d python3 three_count_reconcile_p2.py --stage A 2>&1 | grep -E "cohort|Count A|Count B|Count C|verdict|GAP"
