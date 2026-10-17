set -u
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
DBXML="python3 /opt/Deers-Rock/tools/p6_dbxml.py"
trap 'pkill -f BilingHarness 2>/dev/null; $DBXML restore; true' EXIT
$DBXML retarget sik_p6f | tail -1
T0=$(date +%s)
env RUN_ID=smoke_045104 R5_HARNESS_TIMEOUT_S=400 python3 sampled_real_form_diff_r5.py --db-name sik_p6f --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/p6_resume.log 2>&1
echo "resume exit=$? wall=$(( $(date +%s) - T0 ))s"
echo "stage tables left: $(mysql -uroot -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='sik_p6f' AND table_name LIKE 'r5_stage_%';")"
