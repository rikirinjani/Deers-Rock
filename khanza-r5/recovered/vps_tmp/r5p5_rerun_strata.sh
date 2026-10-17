cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
echo "=== re-run STRATA demo (patched: per-visit rows for non-BILLED batches) ==="
env RUN_ID=r5p5_strata2 python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik_p2 --visits-file /tmp/r5p5_strata.txt --allow-strata > /tmp/p5_strata2.log 2>&1
echo "STRATA exit code: $?"
echo "--- key lines ---"
grep -E "FAILED|ORACLE_|verdict|exit|OUT-OF-ENVELOPE|classification" /tmp/p5_strata2.log | head
echo ""
echo "=== resulting CSV (must have 5 OUT-OF-ENVELOPE rows now) ==="
find /opt/dr-benchmark/results -path "*r5p5_strata2*" -name "*.csv" 2>/dev/null | head -1 | xargs cat 2>/dev/null
