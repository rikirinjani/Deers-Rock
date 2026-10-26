#!/bin/bash
# P14: drop a P14 clone (sik_p14e or the NC scratch sik_p14n) after the comparators ran.
# Requires the run lock. Usage: DR_LOCK_SESSION=<id> bash p14_drop_clone.sh [sik_p14e|sik_p14n]
set -u
cd /opt/Deers-Rock/tools
FX=${1:-sik_p14e}
case "$FX" in sik_p14e|sik_p14n) ;; *) echo "refusing: $FX is not a P14 clone"; exit 3 ;; esac
. ./dr_runlock.sh; dr_runlock_require p14_drop_clone.sh
SQL() { mysql -uroot -N -e "$1"; }
DBXML="python3 /opt/Deers-Rock/tools/p6_dbxml.py"
[ -z "$(SQL "SHOW DATABASES LIKE '$FX'")" ] && { echo "clone $FX does not exist - nothing to drop"; exit 0; }
$DBXML restore > /tmp/p14_drop_dbxml.log 2>&1
SQL "REVOKE SELECT, INSERT, UPDATE, DELETE ON \`$FX\`.* FROM \`benchmark\`@\`localhost\`;" 2>/dev/null
SQL "DROP DATABASE $FX;"
echo "dropped $FX"
echo "databases: $(SQL 'SHOW DATABASES' | grep '^sik' | tr '\n' ' ')"
echo "database.xml: $($DBXML probe 2>&1 | grep '^\[dbxml\]' | awk '{print $NF}' | sort -u | tr '\n' ' ')"
