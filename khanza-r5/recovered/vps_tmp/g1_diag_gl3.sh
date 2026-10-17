#!/bin/bash
set +e
echo "=== general_log_file global setting ==="
mysql -uroot sik -N -B -e "SELECT @@global.general_log_file"
echo
echo "=== is there a log_error / general_log dir allowlist? (systemd override) ==="
cat /etc/systemd/system/mysql.service.d/*.conf 2>/dev/null
cat /etc/systemd/system/mysqld.service.d/*.conf 2>/dev/null
echo "=== mysqld config ==="
grep -nE 'general_log|log_output|skip-log-bin' /etc/mysql/my.cnf /etc/mysql/*/my.cnf /etc/mysql/mysql.conf.d/*.cnf 2>/dev/null | head
echo
echo "=== test: can mysql open general_log in /tmp? (writable by mysql user) ==="
GF=/tmp/diag_gl.log
touch "$GF"; chown mysql:mysql "$GF"; chmod 660 "$GF"
mysql -uroot -e "SET GLOBAL general_log_file='$GF'; SET GLOBAL general_log=ON;" 2>&1
echo "tmp toggle rc=$?"
mysql -uroot sik -N -B -e "SELECT @@global.general_log"
mysql -uroot sik -e "SELECT 77" >/dev/null 2>&1; sleep 0.3
echo "tmp file size: $(stat -c%s $GF 2>/dev/null)"
grep -c 'SELECT' "$GF" 2>/dev/null
echo "=== turn OFF ==="
mysql -uroot -e "SET GLOBAL general_log=OFF;" 2>&1
