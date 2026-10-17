cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
echo "=== check sik_p2 grants for benchmark user ==="
mysql -uroot -N -e "SHOW GRANTS FOR '"'"'benchmark'"'"'@'"'"'localhost'"'"';" | tr ";" "\n" | grep -iE "sik_p2|ALL PRIVILEGES|ON \*" | head
echo ""
echo "=== STRATA DEMO (patched) ==="
env RUN_ID=r5p5_strata python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik_p2 --visits-file /tmp/r5p5_strata_visits.txt --allow-strata 2>&1 | tee /tmp/p5_strata2.log | tail -45
RC=${PIPESTATUS[0]}
echo "STRATA RUN EXIT CODE: $RC"
echo ""
echo "=== resulting CSV ==="
CSV=$(find /opt/dr-benchmark/results/r5p5_strata -name "B3_sampled_form_diff_r5.csv" 2>/dev/null | head -1)
if [ -n "$CSV" ]; then cat "$CSV"; else echo "no CSV found"; fi
