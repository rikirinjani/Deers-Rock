#!/usr/bin/env bash
set -euo pipefail
R=/opt/dr-benchmark/results/Bseries_20261012T045027Z
echo "===== run_all.sh 340-400 ====="
sed -n '340,400p' /opt/dr-benchmark/run_all.sh
echo
echo "===== stageA_G2_validation.md ====="
cat "$R/stageA_G2_validation.md"
echo
echo "===== stageA_three_count_B1.log ====="
cat "$R/stageA_three_count_B1.log"
echo
echo "===== stageA_three_count_B2.log ====="
cat "$R/stageA_three_count_B2.log"
echo
echo "===== stageA_charge_delta_B1.log ====="
cat "$R/stageA_charge_delta_B1.log"
echo
echo "===== telemetry_B1.md ====="
cat "$R/telemetry_B1.md"
echo
echo "===== telemetry_B2.md ====="
cat "$R/telemetry_B2.md"
echo
echo "===== B1_sampled_form_diff.md ====="
cat "$R/B1_sampled_form_diff.md"
echo
echo "===== B1.log ====="
cat "$R/B1.log"
echo
echo "===== B2.log ====="
cat "$R/B2.log"
echo
echo "===== B3.log ====="
cat "$R/B3.log"
echo
echo "===== B1_generate_manifest.md (head 40) ====="
head -40 "$R/B1_generate_manifest.md"
echo
echo "===== state.json / run dir state ====="
ls /opt/dr-benchmark/state* 2>/dev/null || true
cat /opt/dr-benchmark/state.json 2>/dev/null || true
find /opt/dr-benchmark -maxdepth 1 -name "*.json" -o -maxdepth 1 -name "state*" | head
