set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
echo "=== AC-2 fail-closed (dr_tariff empty -> without flag = FAIL, with flag = FALLBACK-USED) ==="
echo "--- case 1: empty tariff, NO --allow-legacy-fallback => expect rc=1"
env RUN_ID=r5_p2_fc python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr --require-tariff 2>&1 | grep -E "FAIL-CLOSED|done" | head
env RUN_ID=r5_p2_fc python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/dev/null 2>&1; echo "rc(empty,no-fallback)=$?"
echo "--- case 2: empty tariff, WITH --allow-legacy-fallback => expect build + FALLBACK-USED"
env RUN_ID=r5_p2_fc2 python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr --allow-legacy-fallback 2>&1 | grep -E "FALLBACK-USED|done|legacy" | head
env RUN_ID=r5_p2_fc2 python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr --allow-legacy-fallback >/dev/null 2>&1; echo "rc(empty,fallback)=$?"
echo "=== AC-3 --window ALL on charge_delta ==="
env RUN_ID=r5_p2_all python3 charge_delta_per_component_p2.py --stage A --window ALL 2>&1 | grep -E "cohort visits|Khanza total|overall delta|gate|Unexplained" | head
echo "=== AC-1 P2 three_count default (expect B NOT-VERIFIED -> PARTIAL) ==="
env RUN_ID=r5_p2_3c python3 three_count_reconcile_p2.py --stage A 2>&1 | grep -E "cohort visits|Count A|Count B|Count C|verdict|GAP" | head
