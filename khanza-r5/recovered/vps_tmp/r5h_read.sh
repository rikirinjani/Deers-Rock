set -e
cd /opt/simrs-khanza
echo "=== full BilingHarness.java ==="
cat run-env/harness/BilingHarness.java
echo "=== is it git-tracked / owned by Khanza repo? ==="
ls -la run-env/harness/
echo "=== BilingHarness compiled with? (javac available) ==="
which javac java
java -version 2>&1 | head -1
