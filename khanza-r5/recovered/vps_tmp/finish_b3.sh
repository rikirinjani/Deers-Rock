#!/usr/bin/env bash
# Finish B3 rung manually: sampled real-form diff (fresh, complete) + three-count + charge-delta.
# Idempotent: sampled diff re-samples same MD5-ordered visits; consumer is idempotent.
set -uo pipefail
RESULTS=/opt/dr-benchmark/results/Bseries_20261012T045027Z
TOOLS=/opt/Deers-Rock/tools
T0=$(date -u +%H:%M:%S)

# 1. sampled real-form diff, B3
: > "$RESULTS/B3.log"
{ echo "=== B3 sampled real-form diff (re-run 2026-10-12, interrupted step completed) ==="
  date -u
  python3 "$TOOLS/sampled_real_form_diff.py" --stage B3 --rate 25 --per 10000 --cap-min 45
  echo "sampled_real_form_diff rc=$?"
} >> "$RESULTS/B3.log" 2>&1
RC1=$?
echo "[A1] sampled rc=$RC1"

# 2. three-count
{ echo; echo "=== B3 three-count reconcile $(date -u) ==="
  python3 "$TOOLS/three_count_reconcile.py" --stage B3
  echo "three_count rc=$?"
} >> "$RESULTS/B3.log" 2>&1
RC2=$?
echo "[A2] three-count rc=$RC2"

# 3. charge-delta
{ echo; echo "=== B3 charge-delta $(date -u) ==="
  python3 "$TOOLS/charge_delta_per_component.py" --stage B3
  echo "charge_delta rc=$?"
} >> "$RESULTS/B3.log" 2>&1
RC3=$?
echo "[A3] charge-delta rc=$RC3"

echo "=== B3.log tail ==="
tail -40 "$RESULTS/B3.log"
echo "=== sampled md/csv ==="
ls -la "$RESULTS"/B3_sampled_form_diff.* 2>&1
echo "=== general_log_B3 size ==="
stat -c "%s" "$RESULTS/general_log_B3.log" 2>&1
echo "=== wall ==="
date -u +%H:%M:%S
echo "A_RC1=$RC1 A_RC2=$RC2 A_RC3=$RC3"
