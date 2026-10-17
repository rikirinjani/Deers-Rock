grep -n "DBUTIL_FORCE_ROOT\|FORCE_ROOT\|def _mysql\|def execute\|def query\|def scalar\|def connect" /opt/Deers-Rock/tools/dbutil.py
echo "=== full _mysql + execute ==="
sed -n '30,90p' /opt/Deers-Rock/tools/dbutil.py
