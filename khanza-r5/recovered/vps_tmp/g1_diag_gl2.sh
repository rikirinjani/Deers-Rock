#!/bin/bash
# Verify the general_log_file can actually be written to a mysql-owned file/dir.
set +e
echo "=== which user does mysqld run as? ==="
ps -o user=,comm= -C mysqld 2>/dev/null || ps -eo user=,comm= | grep -i mysqld | head
echo
GLDIR=/opt/dr-benchmark/results/g1test/g1_attempt1/gl
GF=$GLDIR/diag2.log
mkdir -p "$GLDIR"; chown mysql:mysql "$GLDIR"; chmod 775 "$GLDIR"
touch "$GF"; chown mysql:mysql "$GF"; chmod 660 "$GF"
echo "=== toggle ON as root to mysql-owned file ==="
mysql -uroot -e "SET GLOBAL general_log_file='$GF'; SET GLOBAL general_log=ON;" 2>&1
echo "rc=$?"
mysql -uroot sik -N -B -e "SELECT @@global.general_log, @@global.general_log_file" 2>&1
echo "=== write a probe row, check the file ==="
mysql -uroot sik -e "SELECT 42" >/dev/null 2>&1
sleep 0.5
echo "file size: $(stat -c%s $GF 2>/dev/null)"
grep -c 'SELECT' "$GF" 2>/dev/null
echo "=== turn OFF ==="
mysql -uroot -e "SET GLOBAL general_log=OFF;" 2>&1
echo "off rc=$?"
