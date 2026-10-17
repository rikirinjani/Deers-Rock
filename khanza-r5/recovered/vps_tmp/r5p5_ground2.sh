grep -n "RESULTS_ROOT" /opt/Deers-Rock/tools/dbutil.py | head -5
echo "---"
RROOT=$(python3 -c "import sys; sys.path.insert(0,'/opt/Deers-Rock/tools'); import dbutil; print(dbutil.RESULTS_ROOT)" 2>/dev/null || grep -oE "RESULTS_ROOT[^\n]*" /opt/Deers-Rock/tools/dbutil.py | head -3)
echo "RESULTS_ROOT probe: $RROOT"
