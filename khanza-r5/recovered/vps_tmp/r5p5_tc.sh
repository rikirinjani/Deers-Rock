cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
echo "=== three_count live ==="
env RUN_ID=r5p5_gate4t python3 three_count_reconcile_p2.py 2>&1 | grep -E "Count|gate:|verdict" | grep -v "^\[" | tr -d "\r"
