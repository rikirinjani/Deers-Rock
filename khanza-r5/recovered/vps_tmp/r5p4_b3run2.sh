set -e
cd /opt/dr-benchmark
export DBUTIL_FORCE_ROOT=1
export P2_CONSUMER_DB=sik_p2
export P2_LEDGER_DB=sik_bench_p2
export RUN_ID=r5p4_b3
# redeploy the P1 tool (local temp -> VPS tools dir)
scp -i "C:/Users/think/AppData/Local/Temp/opencode/newvps/id_ed25519_newvps" -P 20153 \
  -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  "C:/Users/think/AppData/Local/Temp/opencode/sampled_real_form_diff_r5.py" \
  "root@$VPS_HOST:/opt/Deers-Rock/tools/sampled_real_form_diff_r5.py" 2>/dev/null || true
echo "=== P1 oracle on the 5 STRATA- visits with --allow-strata ==="
cd /opt/Deers-Rock/tools
# clean any stale run dir from the prior aborted run
rm -rf /opt/dr-benchmark/results/r5p4_b3
printf "STRATA-EMBALASE\nSTRATA-TUSLAH\nSTRATA-HALFPPN\nSTRATA-ZEROFEE\nSTRATA-GT3PROC\n" > /tmp/r5p4_b3_visits.txt
env RUN_ID=r5p4_b3 python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik_p2 \
  --visits-file /tmp/r5p4_b3_visits.txt --allow-strata --freeze-only >/tmp/r5p4_b3_freeze.log 2>&1
echo "freeze rc=$?"
grep -E "ALLOW-STRATA|FROZEN|verify|ABORT|refusing|Traceback|Error" /tmp/r5p4_b3_freeze.log | head -15
