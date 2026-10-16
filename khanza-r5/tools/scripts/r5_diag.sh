echo "=== mysql binary ==="
which mysql
mysql --version
echo "=== try dump with stderr ==="
mysql -uroot sik > /tmp/t.sql 2>/tmp/t.err
echo "rc=$? size=$(stat -c%s /tmp/t.sql)"
head -c 400 /tmp/t.err
echo ""
echo "=== does sik have tables? ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='sik';" 2>&1 | head -1
