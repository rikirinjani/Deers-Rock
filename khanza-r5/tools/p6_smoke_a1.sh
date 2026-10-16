#!/bin/bash
# Fast pre-flight for the P6 suite: one freeze + one billing run on the two
# clean visits (the A1 path), with the same harness-config trap as the suite.
set -u
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
DBXML="python3 /opt/Deers-Rock/tools/p6_dbxml.py"
trap 'pkill -f BilingHarness 2>/dev/null; $DBXML restore; true' EXIT
$DBXML retarget ${FX:-sik_p6f} | tee /tmp/p6_smoke_dbxml.log
grep -q "RETARGET-VERIFIED" /tmp/p6_smoke_dbxml.log || { echo "ABORT: retarget not verified"; exit 3; }
printf "2026/10/01/800085\n2026/10/01/800128\n" > /tmp/r6_clean.txt
RID=smoke_$(date +%H%M%S)
env RUN_ID=$RID python3 sampled_real_form_diff_r5.py --db-name ${FX:-sik_p6f} --stage B3 --visits-file /tmp/r6_clean.txt --freeze-only > /tmp/p6_smoke.log 2>&1
echo "freeze exit=$?"
T0=$(date +%s)
env RUN_ID=$RID python3 sampled_real_form_diff_r5.py --db-name ${FX:-sik_p6f} --stage B3 --visits-file /tmp/r6_clean.txt >> /tmp/p6_smoke.log 2>&1
echo "run exit=$? wall=$(( $(date +%s) - T0 ))s"
echo "stage tables left: $(mysql -uroot -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${FX:-sik_p6f}' AND table_name LIKE 'r5_stage_%';")"
