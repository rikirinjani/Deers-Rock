set -e
cd /opt/dr-benchmark
export DBUTIL_FORCE_ROOT=1
export P2_CONSUMER_DB=sik_p2
export P2_LEDGER_DB=sik_bench_p2
export RUN_ID=r5p4_b3
# The P1 tool bills through the real form (harness -> sik_p2). Run freeze + full run.
cd /opt/Deers-Rock/tools
echo "=== P1 oracle on the 5 STRATA- visits (freeze + run) ==="
env RUN_ID=r5p4_b3 python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik_p2 \
  --visits-file /tmp/r5p4_b3_visits.txt --freeze-only >/tmp/r5p4_b3_freeze.log 2>&1; echo "freeze rc=$?"
grep -E "ALIGNED-PREDICATE|FROZEN|verify-frozen|eligible|NOT eligible|REBUILT" /tmp/r5p4_b3_freeze.log | head -12
