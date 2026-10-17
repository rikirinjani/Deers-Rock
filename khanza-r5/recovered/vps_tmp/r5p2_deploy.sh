set -e
cd /opt/Deers-Rock/tools
echo "=== on-box syntax check ==="
for f in build_dr_charge_ledger_p2.py three_count_reconcile_p2.py charge_delta_per_component_p2.py; do
  python3 -c "import ast; ast.parse(open(\"$f\").read()); print(\"$f OK\")"
done
echo "=== AC-7: run P2 charge_delta default args on live (expect 7708 / 3113533580 / delta 0 / PASS) ==="
RUN_ID=r5_p2_regression python3 charge_delta_per_component_p2.py --stage A 2>&1 | grep -E "cohort visits|Khanza total|Unexplained|gate|other"
