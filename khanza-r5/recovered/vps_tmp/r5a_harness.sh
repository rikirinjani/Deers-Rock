set -e
cd /opt/simrs-khanza
echo "=== harness: the payment/akunrows logic ==="
grep -nE "akunrows|akun|payment|piutang|Simpan|akunrows=" run-env/harness/BilingHarness.java | head -30
echo "=== full payment block ==="
sed -n '55,95p' run-env/harness/BilingHarness.java
