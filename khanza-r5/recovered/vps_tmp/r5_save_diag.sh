set -e
cd /opt/simrs-khanza
# confirm ini points at the clone
grep -E "^database=" setting/database.ini
# Run ONE visit through the raw harness on the clone and capture full save output
V=2027/01/25/800056
cd /opt/simrs-khanza/run-env
echo "=== raw harness on clone $V ==="
DISPLAY=:99 faketime "2027/01/25 08:00:00" timeout 240 java -cp ".:harness:shim:../dist/SIMRSKhanza.jar:../KhanzaSecurity16bit/dist/KhanzaSecurity16bit.jar:../lib/mariadb.jar:../resumepasien/lib/*" BilingHarness "$V" 2>&1 | grep -E "VISIT|sukses|reaper|DONE|tbBilling|payment|login|ERROR|Exception|Berhasil|Gagal" | head -20
cd /opt/simrs-khanza
echo "=== billing rows now on sik_r5 for $V ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik_r5.billing WHERE no_rawat='$V';"
echo "=== does the form save dialog succeed on LIVE sik? control, 1 visit ==="
sed -i "s/^database=.*/database=sik/" setting/database.ini
V2=2027/01/25/800056
cd /opt/simrs-khanza/run-env
echo "--- live sik $V2 raw harness:"
DISPLAY=:99 faketime "2027/01/25 08:00:00" timeout 240 java -cp ".:harness:shim:../dist/SIMRSKhanza.jar:../KhanzaSecurity16bit/dist/KhanzaSecurity16bit.jar:../lib/mariadb.jar:../resumepasien/lib/*" BilingHarness "$V2" 2>&1 | grep -E "sukses|DONE|login|Berhasil|Gagal" | head -8
cd /opt/simrs-khanza
sed -i "s/^database=.*/database=sik_r5/" setting/database.ini
echo "=== restored ini to clone ==="
