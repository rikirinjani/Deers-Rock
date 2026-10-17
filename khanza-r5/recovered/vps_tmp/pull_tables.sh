#!/usr/bin/env bash
# Pull all reconciliation/delta source logs from the run dir
R=/opt/dr-benchmark/results/Bseries_20261012T045027Z
for f in stageA_three_count_B1.log stageA_charge_delta_B1.log stageA_three_count_B2.log stageA_charge_delta_B2.log stageA_three_count_B3.log stageA_charge_delta_B3.log B1_sampled_form_diff.md B2_sampled_form_diff.md B3_sampled_form_diff.md B1_generate_manifest.md B2_generate_manifest.md B3_generate_manifest.md BENCHMARK_REPORT.md; do
  echo "########## FILE: $f ##########"
  cat "$R/$f" 2>/dev/null || echo "(missing: $f)"
  echo
done
