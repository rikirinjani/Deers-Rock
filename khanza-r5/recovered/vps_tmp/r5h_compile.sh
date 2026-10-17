set -e
cd /opt/simrs-khanza
# verify source landed
grep -c "R5-HARNESS-FIX" run-env/harness/BilingHarness.java
echo "=== recompile the harness (javac against the jar classpath) ==="
cd run-env/harness
javac -cp ".:shim:../../dist/SIMRSKhanza.jar:../../KhanzaSecurity16bit/dist/KhanzaSecurity16bit.jar" BilingHarness.java 2>&1 | head -20
echo "compile rc=$?"
ls -la BilingHarness.class
