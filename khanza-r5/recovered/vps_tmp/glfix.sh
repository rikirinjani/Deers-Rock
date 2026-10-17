#!/usr/bin/env bash
# glfix.sh — diagnose general-log denial; if AppArmor blocks /opt, capture to
# /tmp and plan to copy into the run dir after the sampled diff finishes.
set -uo pipefail
echo "=== apparmor / audit evidence ==="
aa-status 2>/dev/null | grep -i mysql || echo "(no aa-status or no mysql profile listed)"
dmesg 2>/dev/null | grep -i "apparmor.*denied.*mysql\|DENIED" | tail -5 || true
grep -i "apparmor.*DENIED" /var/log/syslog 2>/dev/null | tail -3 || true
grep -E "^( |/var/lib/mysql|/var/log/mysql|/tmp)" /etc/apparmor.d/usr.sbin.mysqld 2>/dev/null | head -12 || echo "(no apparmor profile file for mysqld)"

echo
echo "=== mysqld error log tail (general log open failure) ==="
ls /var/log/mysql/ 2>/dev/null | head
tail -8 /var/log/mysql/error.log 2>/dev/null | grep -i "general\|error" || tail -5 /var/log/mysql/error.log 2>/dev/null || true

echo
echo "=== empiric test: capture to /tmp ==="
rm -f /tmp/gltest.log
touch /tmp/gltest.log; chown mysql:mysql /tmp/gltest.log
if mysql -uroot -e "SET GLOBAL general_log_file='/tmp/gltest.log'; SET GLOBAL general_log=ON;" 2>&1; then
  mysql -uroot -e "SELECT 'capture-test' AS t"
  sleep 1
  mysql -uroot -e "SET GLOBAL general_log=OFF;"
  echo "gltest.log bytes: $(stat -c %s /tmp/gltest.log)"
  grep -c "capture-test" /tmp/gltest.log || true
else
  echo "even /tmp capture failed"
fi
