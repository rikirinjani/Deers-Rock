set -e
cd /opt/Deers-Rock/tools
echo "=== re-run P2 charge_delta on LIVE (post canonical rebuild) ==="
env RUN_ID=r5p2_live_cd python3 charge_delta_per_component_p2.py --stage A >/tmp/cd_live.log 2>&1; echo "charge_delta rc=$?"
grep -E "cohort visits|Khanza total|overall delta|gate|UNEXPLAINED" /tmp/cd_live.log | head -6
echo ""
echo "=== re-run P2 three_count on LIVE ==="
env RUN_ID=r5p2_live_3c python3 three_count_reconcile_p2.py --stage A >/tmp/3c_live.log 2>&1
echo "three_count rc=$?"
grep -E "Count A|Count B|Count C|B total|verdict|GAP|P2-" /tmp/3c_live.log | head -8
