set -e
cd /opt/simrs-khanza
# Point harness at the clone
sed -i "s/^database=.*/database=sik_r5/" setting/database.ini
grep -E "^database=" setting/database.ini
# Run the raw harness (no tool) on 3 clone visits to read sukses directly
for V in 2027/04/23/800051 2026/12/04/800064 2027/01/25/800056; do
  echo "=== harness on clone: $V ==="
  cd /opt/simrs-khanza/run-env
  DISPLAY=:99 faketime "${V%/*} 08:00:00" timeout 300 java -cp ".:harness:shim:../dist/SIMRSKhanza.jar:../KhanzaSecurity16bit/dist/KhanzaSecurity16bit.jar:../lib/mariadb.jar:../resumepasien/lib/*" BilingHarness "$V" 2>&1 | grep -E "VISIT|sukses|reaper|DONE|tbBilling|payment|ERROR|Exception" | head -15
  cd /opt/simrs-khanza
  echo "--- sik_r5 billing rows for $V just now:"
  mysql -uroot -N -e "SELECT COUNT(*) FROM sik_r5.billing WHERE no_rawat='$V';"
done
