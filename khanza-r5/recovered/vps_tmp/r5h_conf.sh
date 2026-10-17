set -e
cd /opt/simrs-khanza
cp run-env/harness/BilingHarness.java /tmp/BilingHarness.java.r5bak
echo "=== save-confirmation dialog constants (confirm yes/no vs plain message) ==="
grep -nE "Data pembayaran|showConfirm|JOptionPane.showMessage|Selesai|selesai|proses simpan" /tmp/kjar3/dlg_biling.txt | head -15
echo "=== the confirm dialog options (0=Yes,1=No default?) ? look for showConfirmDialog context ==="
grep -nE "showConfirmDialog|showMessageDialog" /tmp/kjar3/dlg_biling.txt | head
