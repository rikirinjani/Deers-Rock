set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
export P2_CONSUMER_DB=sik_p2
export P2_LEDGER_DB=sik_bench_p2
export RUN_ID=r5p4_b3
# Full run (bill the 5 strata through the real form on sik_p2; 5 visits ~ fast).
env RUN_ID=r5p4_b3 python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik_p2 \
  --visits-file /tmp/r5p4_b3_visits.txt --allow-strata --cap-min 20 >/tmp/r5p4_b3_run.log 2>&1
echo "run rc=$?"
grep -E "ALLOW-STRATA|FROZEN|verify|stage-backup|reset|date 2026|FINAL|ORACLE_DRIFT|not-covered|B3-STRATA|CRITICAL" /tmp/r5p4_b3_run.log | head -25
echo "=== result md (not-covered markers) ==="
cat /opt/dr-benchmark/results/r5p4_b3/B3_sampled_form_diff_r5.md 2>/dev/null | head -40
