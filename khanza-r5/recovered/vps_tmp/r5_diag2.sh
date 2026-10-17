echo "=== is dump still running? ==="
ps aux | grep -E "mysql -uroot sik" | grep -v grep | head
echo "=== t.sql size now ==="
stat -c%s /tmp/t.sql 2>/dev/null || echo "no t.sql"
echo "=== t.err ==="
head -c 400 /tmp/t.err 2>/dev/null || echo "no t.err"
echo "=== mysqldump available? ==="
which mysqldump
echo "=== try mysqldump (smaller, table listing only) ==="
mysqldump -uroot --no-data sik 2>/tmp/md.err | head -c 200
echo ""
echo "md.err:"; head -c 300 /tmp/md.err 2>/dev/null
