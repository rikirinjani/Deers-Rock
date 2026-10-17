set -e
echo "=== billing rows for the 2 visits (crash happened BEFORE reset; expect 31 intact) ==="
mysql -uroot -N -e "SELECT no_rawat, COUNT(*) FROM sik.billing WHERE no_rawat IN ('2026/10/01/000254','2026/10/01/000289') GROUP BY no_rawat;"
echo "=== gate sanity ==="
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
env RUN_ID=r5p5_gate3 python3 charge_delta_per_component_p2.py --stage A >/tmp/p5d_gate3.log 2>&1
echo "charge_delta rc=$? $(grep -oE 'gate \(all deltas == 0, other == 0\): (PASS|FAIL)' /tmp/p5d_gate3.log | head -1)"
echo "=== clean re-run WITH force-root ==="
export RUN_ID=r5p5_clean
rm -rf /opt/dr-benchmark/results/r5p5_clean
env RUN_ID=r5p5_clean python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik \
  --visits-file /tmp/r5p5_drift.txt --freeze-only >/tmp/p5c3_freeze.log 2>&1
echo "freeze rc=$?"
set +e
env RUN_ID=r5p5_clean python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik \
  --visits-file /tmp/r5p5_drift.txt --cap-min 20 >/tmp/p5c3_run.log 2>&1
CLEAN_RC=$?
set -e
echo "CLEAN RUN EXIT CODE: $CLEAN_RC (expect 0 if form output matches frozen baseline; 1 if B-subset drift)"
grep -E "ALIGNED|FROZEN|verify|stage-backup|reset |date 2026|BILLED|FAILED|FINAL|ORACLE_|verdict|stage-drop|REPAIR" /tmp/p5c3_run.log | head -16
echo "=== stage tables left (expect 0) ==="
mysql -uroot -N -e "SHOW TABLES FROM sik LIKE 'r5_stage_%';" | wc -l
