set -e
cd /opt/Deers-Rock/tools
# Drift demo on LIVE sik (F1 precedent: tamper -> detect -> revert -> green)
export DBUTIL_FORCE_ROOT=0
sed -i "s/^database=.*/database=sik/" /opt/simrs-khanza/setting/database.ini
echo "harness DB: $(grep -E "^database=" /opt/simrs-khanza/setting/database.ini)"
printf "2026/10/01/000254\n2026/10/01/000289\n" > /tmp/r5p5_drift.txt
export RUN_ID=r5p5_drift
rm -rf /opt/dr-benchmark/results/r5p5_drift
echo "=== 1. freeze 2 in-envelope visits ==="
env RUN_ID=r5p5_drift python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik \
  --visits-file /tmp/r5p5_drift.txt --freeze-only >/tmp/p5d_freeze.log 2>&1
echo "freeze rc=$? $(grep -oE 'ALIGNED-PREDICATE: [0-9]+ visits.*eligible' /tmp/p5d_freeze.log | head -1)"
echo "=== 2. tamper databarang.ralan B000001135 +1000 (F1-style) ==="
mysql -uroot sik -e "UPDATE databarang SET ralan = ralan + 1000 WHERE kode_brng='B000001135';"
echo "=== 3. run -> expect BILLED batch (live form saves), drift>0, EXIT 1 ==="
set +e
env RUN_ID=r5p5_drift python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik \
  --visits-file /tmp/r5p5_drift.txt --cap-min 20 >/tmp/p5d_run.log 2>&1
DRIFT_RC=$?
set -e
echo "DRIFT RUN EXIT CODE: $DRIFT_RC (expect 1)"
grep -E "ALIGNED|FROZEN|verify|stage-backup|reset |date 2026|BILLED|FINAL|ORACLE_|verdict|stage-drop|REPAIR" /tmp/p5d_run.log | head -18
echo "=== 4. revert price ==="
mysql -uroot sik -e "UPDATE databarang SET ralan = ralan - 1000 WHERE kode_brng='B000001135';"
echo "price reverted: $(mysql -uroot -N -e "SELECT ralan FROM sik.databarang WHERE kode_brng='B000001135';")"
echo "=== 5. clean re-run -> expect exit 0 PASS ==="
export RUN_ID=r5p5_clean
rm -rf /opt/dr-benchmark/results/r5p5_clean
env RUN_ID=r5p5_clean python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik \
  --visits-file /tmp/r5p5_drift.txt --cap-min 20 >/tmp/p5d_clean.log 2>&1
CLEAN_RC=$?
echo "CLEAN RUN EXIT CODE: $CLEAN_RC (expect 0)"
grep -E "date 2026|BILLED|FINAL|verdict|stage-drop" /tmp/p5d_clean.log | head -8
echo "=== 6. canonical gate check on live ==="
env RUN_ID=r5p5_gate python3 charge_delta_per_component_p2.py --stage A >/tmp/p5d_gate.log 2>&1
echo "charge_delta rc=$? $(grep -oE 'gate \(all deltas == 0, other == 0\): (PASS|FAIL)' /tmp/p5d_gate.log | head -1)"
