set -e
cd /tmp/kjar3
echo "=== JOptionPane.showConfirmDialog call site: what type/options does it use? ==="
sed -n '8265,8290p' /tmp/kjar3/dlg_biling.txt
echo "=== the confirm dialog title string near it ==="
grep -nE "String Simpan|String Batal|String Ya|String No|String Konfirmasi|String Konfirm" /tmp/kjar3/dlg_biling.txt | head
echo "=== all DISTINCT button-like short strings in the class ==="
grep -oE "// String [^\"\\\\]{1,20}" /tmp/kjar3/dlg_biling.txt | sed "s/\/\/ String //" | sort | uniq -c | sort -rn | grep -iE "simpan|batal|ya|no|ok|tidak|hapus|selesai|proses" | head -20
