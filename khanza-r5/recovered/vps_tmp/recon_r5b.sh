set -e
echo "=== dbutil head ==="
sed -n 1,75p /opt/Deers-Rock/tools/dbutil.py
echo "=== find khanza run-env / harness java config ==="
find /opt -maxdepth 5 -name "BilingHarness*" 2>/dev/null | head
find /opt -maxdepth 5 -name "*.java" -path "*harness*" 2>/dev/null | head
find /opt -maxdepth 4 \( -name "run-env" -o -name "harness" \) 2>/dev/null | head
