#!/usr/bin/env bash
R=/opt/dr-benchmark/results/Bseries_20261012T045027Z
echo "=== DONE ==="; cat $R/DONE; echo
echo "=== reports + tarball + manifest ==="
ls -la $R/BENCHMARK_REPORT.md $R/BENCHMARK_REPORT_publishable.md $R/manifest.sha256 2>&1
ls -la $R/*.tar.gz 2>&1
echo
echo "=== publishable scrub grep (expect 0 matches) ==="
if grep -rEn '([0-9]{1,3}\.){3}[0-9]{1,3}|benchmark_pw|EnkripsiAES|<KHANZA_AES_KEY>|<KHANZA_AES_IV>|usere' $R/BENCHMARK_REPORT_publishable.md; then
  echo "SCREP_HIT_FOUND"
else
  echo "grep_exit=1_ZERO_MATCHES"
fi
echo
echo "=== B3 key figures ==="
grep -iE "Processed 86101|avg" $R/consumer_B3.log | tail -2
grep "drift rate" $R/B3_sampled_form_diff.md
stat -c "%s bytes general_log_B3" $R/general_log_B3.log
echo
echo "=== b3_wall_hours ==="
grep b3_wall_hours /opt/dr-benchmark/state/state.json
echo
echo "=== stray procs ==="
ps aux | grep -E "run_all|KhanzaBillingConsumer|sampled_real_form" | grep -v grep
echo "PS_DONE"
