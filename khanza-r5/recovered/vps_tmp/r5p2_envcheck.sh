set -e
echo "=== does dbutil support a DB target override env? ==="
grep -nE "CONSUMER_DB|LEDGER_DB|os.environ|getenv" /opt/Deers-Rock/tools/three_count_reconcile_p2.py | head
echo "--- check the original dbutil for any env DB override ---"
grep -nE "getenv|environ" /opt/Deers-Rock/tools/dbutil.py
