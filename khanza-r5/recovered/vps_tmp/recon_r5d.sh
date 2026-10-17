set -e
echo "=== BilingHarness.java (head) ==="
head -60 /opt/simrs-khanza/run-env/harness/BilingHarness.java
echo "=== setting dir ==="
ls /opt/simrs-khanza/setting/ 2>/dev/null
find /opt/simrs-khanza/setting -maxdepth 2 -type f | head -20
