set -e
cd /opt/simrs-khanza
echo "=== DlgBilingRalan: where sukses is set + save dialog ==="
mkdir -p /tmp/kjar && cd /tmp/kjar
rm -rf ./*
unzip -o -q /opt/simrs-khanza/dist/SIMRSKhanza.jar "keuangan/DlgBilingRalan.class" 2>/dev/null
javap -p -c keuangan/DlgBilingRalan 2>/dev/null | grep -nE "sukses|put|proSimpan|BtnSimpan|JOptionPane|GMessage|proses simpan|setJDialog|Dialog" | head -30
echo "=== string constants around sukses / simpan in the class ==="
javap -p -c keuangan/DlgBilingRalan 2>/dev/null | grep -oE "String [^\"]+" | sort -u | grep -iE "sukses|simpan|berhasil|selesai|piutang|proses" | head -20
