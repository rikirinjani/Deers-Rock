set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=0
export RUN_ID=r5p5_clean
rm -rf /opt/dr-benchmark/results/r5p5_clean
env RUN_ID=r5p5_clean python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik \
  --visits-file /tmp/r5p5_drift.txt --freeze-only >/tmp/p5c2_freeze.log 2>&1
echo "freeze rc=$?"
env RUN_ID=r5p5_clean python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik \
  --visits-file /tmp/r5p5_drift.txt --cap-min 20 >/tmp/p5c2_run.log 2>&1
echo "CLEAN RUN EXIT CODE: $? (expect 0)"
grep -E "ALIGNED|FROZEN|verify|stage-backup|reset |date 2026|BILLED|FINAL|ORACLE_|verdict|stage-drop|REPAIR" /tmp/p5c2_run.log | head -15
echo "=== stage tables left on live (expect 0) ==="
mysql -uroot -N -e "SHOW TABLES FROM sik LIKE 'r5_stage_%';" | wc -l
