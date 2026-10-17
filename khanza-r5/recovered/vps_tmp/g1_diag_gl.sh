#!/bin/bash
# Diagnose why the general_log toggle reports on_in 0/26.
set +e
echo "=== current general_log state ==="
mysql -uroot sik -N -B -e "SELECT @@global.general_log, @@global.general_log_file" 2>&1
echo
echo "=== try to turn it ON as root to a writable file ==="
GF=/opt/dr-benchmark/results/g1test/g1_attempt1/gl/diag_gl.log
touch "$GF"; chmod 666 "$GF"
mysql -uroot -e "SET GLOBAL general_log_file='$GF'; SET GLOBAL general_log=ON;" 2>&1
echo "root toggle rc=$?"
mysql -uroot sik -N -B -e "SELECT @@global.general_log, @@global.general_log_file" 2>&1
echo
echo "=== confirm the file is being written ==="
mysql -uroot -e "SELECT 1" 2>/dev/null
sleep 0.3
echo "file size after: $(stat -c%s $GF 2>/dev/null) bytes; first line:"
head -2 "$GF" 2>/dev/null
echo
echo "=== turn it OFF again (leave clean) ==="
mysql -uroot -e "SET GLOBAL general_log=OFF;" 2>&1
echo "off rc=$?"
