set -e
cd /tmp/kjar3
echo "=== what are the confirm-dialog button labels? (JOptionPane default buttons) ==="
grep -oE "// String (Ya|No|OK|Ok|Tidak|Simpan|Batal|Batal.?)" /tmp/kjar3/dlg_biling.txt | sort | uniq -c
echo "=== the confirm dialog: is it a standard JOptionPane (buttons Yes/No) or a custom widget? ==="
grep -nE "showConfirmDialog|JOptionPane\$|OptionPane" /tmp/kjar3/dlg_biling.txt | head
echo "=== does the form check an 'already billed' / duplicate state before committing? ==="
grep -oE "// String .*" /tmp/kjar3/dlg_biling.txt | grep -iE "sudah|belum|duplikat|ganda|berubah|sama|exist|existing|already" | sort -u | head
echo "=== is DlgBilingRalan.sukses set to true anywhere in the SAVE path specifically? ==="
awk '/proSimpan|simpanData|putData|psbilling/{f=1} f&&/putfield.*sukses/{print NR": "$0}' /tmp/kjar3/dlg_biling.txt | head
