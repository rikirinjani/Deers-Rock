set -e
cd /opt/Deers-Rock/tools
export RUN_ID=r5p5_strata
# clean prior strata artifacts (fresh re-run)
rm -rf /opt/dr-benchmark/results/r5p5_strata
# verify stage_backup now works under benchmark user (DDL via root, DML via benchmark)
echo "=== STRATA DEMO (patched, FORCE_ROOT=1 so CREATE+DML via root) ==="
env RUN_ID=r5p5_strata DBUTIL_FORCE_ROOT=1 python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik_p2 --visits-file /tmp/r5p5_strata_visits.txt --allow-strata 2>&1 | tee /tmp/p5_strata2.log | tail -40
echo "STRATA RUN EXIT CODE: ${PIPESTATUS[0]}"
