#!/usr/bin/env bash
set -uo pipefail
OUT=/opt/dr-benchmark/p-chain
TS=$(cat "$OUT/r3_RUN_TS")
echo "TS=$TS"
echo
echo "=== close-out log (re-run if missing) ==="
if [ ! -f "$OUT/r3_closeout_$TS.log" ]; then
  echo "(log missing — re-running close-out now, detached-safe ~3 min)"
  bash /tmp/r3_closeout.sh || echo "close-out rc=$?"
fi
cat "$OUT/r3_closeout_$TS.log" 2>/dev/null
echo
echo "=== final artifact check ==="
ls -la "$OUT/consumer_snapshot_$TS.json" "$OUT/.sampled_diff_state" "$OUT/a2a_gate_rootcause_$TS.json" "$OUT/a3_fullwindow_monthly_$TS.md" "$OUT/a1_tariff_$TS.md" "$OUT/a2b_battery_$TS.md" "$OUT/d1_restore_$TS.sh" "$OUT/d1_baseline_$TS.json" "$OUT/e1_claims_ledger_$TS.md" 2>&1
echo
echo "=== residual injection check ==="
echo -n "reg_periksa 899%: "
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM reg_periksa WHERE no_rawat LIKE '2026/10/05/899%';"
echo -n "billing 899%: "
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM billing WHERE no_rawat LIKE '2026/10/05/899%';"
echo
echo "=== a2a verdict ==="
python3 - "$OUT" "$TS" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]+"/a2a_gate_rootcause_%s.json"%sys.argv[2]))
print("gate_fn_present:",d.get("gate_function_present"))
print("oct_unbilled_under_injection:",d.get("oct_unbilled_under_injection"))
print("residual_899:",d.get("residual_899"))
PY
echo
echo "=== a3 head ==="
head -14 "$OUT/a3_fullwindow_monthly_$TS.md" 2>/dev/null
echo
echo "=== pool / lqt / units / procs ==="
mysql -uroot -N -B -e "SELECT @@innodb_buffer_pool_size, @@long_query_time;"
systemctl is-active dr-bench; systemctl is-active p-chain
pgrep -af "run_all|sampled_real|r3_" | grep -v grep || echo "no stray procs"
