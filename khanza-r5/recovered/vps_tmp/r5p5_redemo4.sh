cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
rm -rf /opt/dr-benchmark/results/r5p5_strata
echo "=== STRATA DEMO (patched, clean run dir) ==="
env RUN_ID=r5p5_strata python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik_p2 --visits-file /tmp/r5p5_strata_visits.txt --allow-strata 2>&1 | tail -45
RC=${PIPESTATUS[0]}
echo ""
echo "STRATA RUN EXIT CODE: $RC"
echo ""
echo "=== resulting CSV ==="
CSV=$(find /opt/dr-benchmark/results/r5p5_strata -name "B3_sampled_form_diff_r5.csv" 2>/dev/null | head -1)
if [ -n "$CSV" ]; then cat "$CSV"; else echo "no CSV found"; fi
echo ""
echo "=== resulting MD ==="
MD=$(find /opt/dr-benchmark/results/r5p5_strata -name "B3_sampled_form_diff_r5.md" 2>/dev/null | head -1)
if [ -n "$MD" ]; then cat "$MD"; else echo "no MD found"; fi
echo ""
echo "=== stage hygiene (sik_p2) ==="
mysql -uroot -N -e "SHOW TABLES FROM sik_p2 LIKE '"'"'r5_stage_%'"'"';"
echo "count: $(mysql -uroot -N -e "SHOW TABLES FROM sik_p2 LIKE '"'"'r5_stage_%'"'"';" | wc -l)"
