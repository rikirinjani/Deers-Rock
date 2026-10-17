set -e
cd /opt/simrs-khanza
echo "=== which extraction tools exist ==="
which jar unzip 2>/dev/null || true
rm -rf /tmp/kjar3 && mkdir -p /tmp/kjar3
jar -xf dist/SIMRSKhanza.jar keuangan/DlgBilingRalan.class -C /tmp/kjar3 2>/dev/null || { mkdir -p /tmp/kjar3/keuangan && cd /tmp/kjar3 && jar -xf /opt/simrs-khanza/dist/SIMRSKhanza.jar keuangan/DlgBilingRalan.class; }
cd /tmp/kjar3
echo "=== fields: sukses / save handlers ==="
javap -p keuangan/DlgBilingRalan.class 2>/dev/null | grep -iE "sukses|proSimpan|BtnSimpan|void |akun" | head -20
echo "=== string constants around simpan/sukses/piutang ==="
javap -c -p keuangan/DlgBilingRalan.class 2>/dev/null | grep -oE "// String .*" | sort -u | grep -iE "simpan|sukses|selesai|piutang|proses|berhasil|gagal|akun|pembayaran" | head -30
