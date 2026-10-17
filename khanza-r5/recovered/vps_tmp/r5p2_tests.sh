set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
echo "=== AC-2: fail-closed tariff (force empty dr_tariff view via flag) ==="
echo "-- with --allow-legacy-fallback should build (source=legacy), without should FAIL"
# Simulate: temporarily point the builder at an empty tariff by requiring it.
RUN_ID=r5_p2_fc python3 build_dr_charge_ledger_p2.py --window 2026-10 --require-tariff --cohort dr 2>&1 | grep -E "dr_tariff|FAIL|FALLBACK|done" | head
echo "rc-require-tariff (empty table) = $?"
echo "=== AC-3: --window ALL runs the gate over all months ==="
RUN_ID=r5_p2_all python3 charge_delta_per_component_p2.py --stage A --window ALL 2>&1 | grep -E "cohort visits|Khanza total|gate|Unexplained" | head
echo "=== P2 three_count default (expect A=C=31750/3113533580, B NOT-VERIFIED, PARTIAL) ==="
RUN_ID=r5_p2_3c python3 three_count_reconcile_p2.py --stage A 2>&1 | grep -E "cohort visits|Count|NOT-VERIFIED|verdict|GAP" | head
