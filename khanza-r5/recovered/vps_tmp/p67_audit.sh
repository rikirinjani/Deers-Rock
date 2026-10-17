#!/usr/bin/env bash
# p67_audit.sh — READ-ONLY audit of B1/B2 rungs. No writes anywhere.
set -uo pipefail
R=/opt/dr-benchmark/results/Bseries_20261012T045027Z

echo "##### A. three-count logs (with line numbers) #####"
echo "--- stageA_three_count_B1.log ---"; awk '{printf "%d: %s\n", NR, $0}' "$R/stageA_three_count_B1.log"
echo "--- stageA_three_count_B2.log ---"; awk '{printf "%d: %s\n", NR, $0}' "$R/stageA_three_count_B2.log"
echo "--- GAP lines anywhere in run dir (expect none) ---"
grep -rn "GAP \[" "$R" || echo "(no GAP lines — zero gaps)"

echo
echo "##### B. charge-delta logs #####"
echo "--- stageA_charge_delta_B1.log ---"; awk '{printf "%d: %s\n", NR, $0}' "$R/stageA_charge_delta_B1.log"
echo "--- stageA_charge_delta_B2.log ---"; awk '{printf "%d: %s\n", NR, $0}' "$R/stageA_charge_delta_B2.log"

echo
echo "##### C. sampled real-form diff artifacts #####"
echo "--- B1_sampled_form_diff.csv (full) ---"; awk '{printf "%d: %s\n", NR, $0}' "$R/B1_sampled_form_diff.csv"
echo "--- B1_sampled_form_diff.md lines 1-6 + table row count ---"
awk 'NR<=6{printf "%d: %s\n", NR, $0}' "$R/B1_sampled_form_diff.md"
echo "B1 md table rows: $(grep -c '^| 2026' "$R/B1_sampled_form_diff.md")"
echo "--- B2_sampled_form_diff.csv (full) ---"; awk '{printf "%d: %s\n", NR, $0}' "$R/B2_sampled_form_diff.csv"
echo "--- B2_sampled_form_diff.md lines 1-6 + table row count ---"
awk 'NR<=6{printf "%d: %s\n", NR, $0}' "$R/B2_sampled_form_diff.md"
echo "B2 md table rows: $(grep -c '^| 2026' "$R/B2_sampled_form_diff.md")"
echo "--- sampled_real_form_diff.log (shared log tail 12) ---"; tail -12 "$R/sampled_real_form_diff.log"

echo
echo "##### D. manifests: visits + sha256 #####"
for s in B1 B2; do
  echo "--- ${s}_generate_manifest.md ---"
  grep -n "days:\|visits:\|sha256:\|seed:\|note:" "$R/${s}_generate_manifest.md"
done

echo
echo "##### E. telemetry json keys with line numbers #####"
for s in B1 B2; do
  echo "--- telemetry_${s}.json ---"
  grep -n '"stage"\|"visits"\|"billing_rows"\|"total_rp"\|"wall_s"\|"visits_per_min"\|"datadir_mb"\|"sik_total_mb"\|"rows_est"\|"p50_ms"\|"p95_ms"\|"p99_ms"\|"runs"\|"Slow_queries"\|"buffer_pool_hit_pct"\|"note_buckets"\|_derived' "$R/telemetry_${s}.json" | head -80
done

echo
echo "##### F. telemetry md label/caveat lines #####"
for s in B1 B2; do
  echo "--- telemetry_${s}.md ---"
  grep -n "est\|lifetime\|reconstructed\|avg\|snapshot\|note" "$R/telemetry_${s}.md"
done

echo
echo "##### G. consumer logs: OK lines #####"
for s in B1 B2; do
  echo "--- consumer_${s}.log ---"
  grep -n "Processed\|Billing rows inserted\|DONE" "$R/consumer_${s}.log"
done

echo
echo "##### H. replay-determinism artifacts for Stage B (expect none) #####"
ls -la "$R" | grep -i "replay" || echo "(no replay* artifacts in this run dir — replay was Stage A / G2 only)"

echo
echo "##### I. general_log files (sizes) #####"
ls -la "$R"/general_log_*.log

echo
echo "##### J. stageA_G2_validation.md — section list (grep headings + gates) #####"
grep -n "^# \|gate (" "$R/stageA_G2_validation.md"

echo
echo "##### K. B3 in-flight status #####"
ls -la "$R" | grep "B3\|telemetry" || true
echo "consumer_B3.log bytes now: $(stat -c %s "$R/consumer_B3.log")"
tail -2 "$R/B3.log" || true
systemctl is-active dr-bench
cat /opt/dr-benchmark/state/heartbeat 2>/dev/null || true
echo
echo "##### L. per-visit CSV row counts #####"
for f in "$R/stageA_charge_delta_per_visit.csv"; do
  echo "$f: $(wc -l < "$f") lines (incl header)"
done
echo "##### done (read-only) #####"
