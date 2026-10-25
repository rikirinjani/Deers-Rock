#!/bin/bash
# P13: drop the sik_p13w clone after the comparator has run.
# Requires the run lock. The clone must still exist.
set -u
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
FX=sik_p13w
. ./dr_runlock.sh; dr_runlock_require p13_drop_clone.sh
SQL() { mysql -uroot -N -e "$1"; }
DBXML="python3 /opt/Deers-Rock/tools/p6_dbxml.py"

if [ -z "$(SQL "SHOW DATABASES LIKE '$FX'")" ]; then
  echo "clone $FX does not exist — nothing to drop"
  exit 0
fi

# Ensure database.xml is on sik before dropping
$DBXML restore > /tmp/p13w_drop_dbxml.log 2>&1
echo "database.xml restored"

SQL "REVOKE SELECT, INSERT, UPDATE, DELETE ON \`$FX\`.* FROM \`benchmark\`@\`localhost\`;" 2>/dev/null
SQL "DROP DATABASE $FX;"
echo "dropped $FX"
echo "databases: $(SQL 'SHOW DATABASES' | grep '^sik' | tr '\n' ' ')"
echo "database.xml: $($DBXML probe 2>&1 | grep '^\[dbxml\]' | awk '{print $NF}' | sort -u | tr '\n' ' ')"
