set -e
cd /tmp/kjar3
echo "=== javap version available? ==="
javap -version 2>&1 | head -1
echo "=== bytecode around BtnSimpan / sukses / put in the save handler ==="
# find the handler method that references the "sukses" field store
javap -c -p keuangan/DlgBilingRalan.class 2>/dev/null > /tmp/kjar3/dlg_biling.txt
echo "lines: $(wc -l < /tmp/kjar3/dlg_biling.txt)"
grep -nE "putfield.*sukses|ldc.*String|invokevirtual.*put|JOptionPane|proSimpan|proses" /tmp/kjar3/dlg_biling.txt | grep -iE "sukses|simpan|selesai|piutang|proses|JOptionPane" | head -30
echo "=== which method sets sukses=true (the true constant + putfield sukses) ==="
grep -nE "iconst_1|putfield.*DlgBilingRalan.sukses" /tmp/kjar3/dlg_biling.txt | head -20
