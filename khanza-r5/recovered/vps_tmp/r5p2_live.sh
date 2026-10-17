set -e
cd /opt/Deers-Rock/tools
echo "=== P2 gate on LIVE canonical DB (default args, no env override) ==="
echo "Note: P2 tools default CONSUMER_DB=sik / LEDGER_DB=sik_bench; run on live."
env RUN_ID=r5p2_live python3 charge_delta_per_component_p2.py --stage A 2>&1 | grep -E "cohort visits|Khanza total|overall delta|gate|UNEXPLAINED" | head -6
echo ""
echo "=== P2 three_count on LIVE (B from live form-save; likely NOT-VERIFIED->PARTIAL or verified-subset) ==="
env RUN_ID=r5p2_live2 python3 three_count_reconcile_p2.py --stage A 2>&1 | grep -E "cohort|Count A|Count B|Count C|B total|verdict|GAP|P2-" | head -12
