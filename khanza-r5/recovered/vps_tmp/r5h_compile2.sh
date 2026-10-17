set -e
cd /opt/simrs-khanza/run-env/harness
javac -cp ".:shim:../../dist/SIMRSKhanza.jar:../../KhanzaSecurity16bit/dist/KhanzaSecurity16bit.jar" BilingHarness.java 2>&1
echo "compile rc=$?"
ls -la BilingHarness.class
