set -e
cd /opt/Deers-Rock/tools
# The P1 tool refuses to run because B3_oracle_run_r5/ exists from a prior run with no .state.json (AC-5 guard).
# Clean the stale dir and re-run the freeze.
export DBUTIL_FORCE_ROOT=1
export P2_CONSUMER_DB=sik_p2
export P2_LEDGER_DB=sik_bench_p2
export RUN_ID=r5p4_b3
rm -rf /opt/dr-benchmark/results/r5p4_b3
printf "STRATA-EMBALASE\nSTRATA-TUSLAH\nSTRATA-HALFPPN\nSTRATA-ZEROFEE\nSTRATA-GT3PROC\n" > /tmp/r5p4_b3_visits.txt
echo "=== P1 oracle freeze on 5 STRATA- visits (clean) ==="
env RUN_ID=r5p4_b3 python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik_p2 \
  --visits-file /tmp/r5p4_b3_visits.txt --freeze-only >/tmp/r5p4_b3_freeze.log 2>&1; echo "freeze rc=$?"
grep -E "ALIGNED|FROZEN|verify|eligible|NOT|ERROR|Traceback|refusing|ABORT" /tmp/r5p4_b3_freeze.log | head -15
echo "=== per-visit frozen baselines ==="
ls /opt/dr-benchmark/results/r5p4_b3/B3_oracle_run_r5/baseline_frozen/ 2>/dev/null | head
