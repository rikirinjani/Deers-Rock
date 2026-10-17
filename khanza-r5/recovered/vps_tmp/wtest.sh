set -u
cd /opt/Deers-Rock/tools
python3 -m py_compile charge_delta_per_component_p2.py three_count_reconcile_p2.py build_dr_charge_ledger_p2.py || exit 1
sha256sum charge_delta_per_component_p2.py three_count_reconcile_p2.py build_dr_charge_ledger_p2.py | cut -c1-12
TS=$(date -u +%Y%m%dT%H%M%SZ)
for w in ALL 2026-10; do
  for t in charge_delta_per_component_p2.py three_count_reconcile_p2.py; do
    RUN_ID=wtest_${TS}_$w timeout 900 python3 $t --window $w > /tmp/wtest_${t%%.py}_$w.log 2>&1; rc=$?
    echo "== $t --window $w exit=$rc"
    grep -aE "visits|delta=|Count [ABC]|gate|Traceback|1064" /tmp/wtest_${t%%.py}_$w.log | grep -v "^\s*$" | head -9 | cut -c1-160
  done
done
