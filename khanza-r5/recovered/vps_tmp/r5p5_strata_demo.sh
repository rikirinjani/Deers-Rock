set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
export RUN_ID=r5p5_strata
rm -rf /opt/dr-benchmark/results/r5p5_strata
echo "=== P5 STRATA demo: freeze + run with --allow-strata (no --repair-consumer) ==="
env RUN_ID=r5p5_strata python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik_p2 \
  --visits-file /tmp/r5p5_strata.txt --allow-strata --freeze-only >/tmp/p5_strata_freeze.log 2>&1
echo "freeze rc=$?"
grep -E "ALLOW-STRATA|FROZEN|verify" /tmp/p5_strata_freeze.log | head -4
env RUN_ID=r5p5_strata python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik_p2 \
  --visits-file /tmp/r5p5_strata.txt --allow-strata --cap-min 20 >/tmp/p5_strata_run.log 2>&1
echo "RUN EXIT CODE: $?  (expect 4 = FAILED batches / out-of-envelope)"
grep -E "ALLOW-STRATA|verify|stage-backup|stage-restore|FAILED|BILLED|REPAIR-SKIPPED|FINAL|ORACLE_|stage-drop|verdict" /tmp/p5_strata_run.log | head -25
echo "=== state after ==="
python3 -c "import json,collections;d=json.load(open('/opt/dr-benchmark/results/r5p5_strata/B3_oracle_run_r5/.state.json'));print('phase=',d.get('phase'));print('batches=',{k:(v.get('status'),v.get('fail_reason'),'restored='+str(v.get('restored'))) for k,v in d.get('batches',{}).items()});print('out_of_envelope=',d.get('out_of_envelope'))"
echo "=== stage tables left (expect none) ==="
mysql -uroot -N -e "SHOW TABLES FROM sik_p2 LIKE 'r5_stage_%';" | wc -l
echo "=== STRATA billing rows (expect restored to pre-reset = 0) ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p2.billing WHERE no_rawat LIKE 'STRATA-%';"
