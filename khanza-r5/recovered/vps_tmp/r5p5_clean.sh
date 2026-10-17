set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=0
export RUN_ID=r5p5_clean
rm -rf /opt/dr-benchmark/results/r5p5_clean
echo "=== freeze (canonical baseline) ==="
env RUN_ID=r5p5_clean python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik \
  --visits-file /tmp/r5p5_drift.txt --freeze-only >/tmp/p5c_freeze.log 2>&1
echo "freeze rc=$?"
echo "=== run (expect exit 0 PASS) ==="
env RUN_ID=r5p5_clean python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik \
  --visits-file /tmp/r5p5_drift.txt --cap-min 20 >/tmp/p5c_run.log 2>&1
CLEAN_RC=$?
echo "CLEAN RUN EXIT CODE: $CLEAN_RC (expect 0)"
grep -E "date 2026|BILLED|FINAL|ORACLE_|verdict|stage-drop" /tmp/p5c_run.log | head -10
