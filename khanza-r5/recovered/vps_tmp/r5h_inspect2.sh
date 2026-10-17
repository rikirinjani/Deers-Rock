set -e
cd /opt/simrs-khanza
mkdir -p /tmp/kjar2 && cd /tmp/kjar2 && rm -rf ./*
unzip -o -q /opt/simrs-khanza/dist/SIMRSKhanza.jar "keuangan/DlgBilingRalan.class"
echo "=== field: sukses ==="
javap -p keuangan/DlgBilingRalan 2>/dev/null | grep -iE "sukses|boolean|void put|prosimpan|proses" | head
echo "=== string constants (all) mentioning simpan/sukses/selesai/piutang/proses ==="
javap -p -c keuangan/DlgBilingRalan 2>/dev/null | grep -oE "// String .*" | sort -u | grep -iE "simpan|sukses|selesai|piutang|proses|berhasil|gagal|pembayaran|nota" | head -40
echo "=== methods present ==="
javap -p keuangan/DlgBilingRalan 2>/dev/null | grep -E "void |public|private" | grep -iE "simpan|put|pro|isCek|isRawat|akun|kembali" | head -20
