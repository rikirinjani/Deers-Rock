cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
env RUN_ID=r5p5_tc2 python3 three_count_reconcile_p2.py > /tmp/p5_tc2.log 2>&1
echo "exit: $?"
grep -aE "Count|gate:|verdict|===" /tmp/p5_tc2.log | tr -d "\r" | head -20
