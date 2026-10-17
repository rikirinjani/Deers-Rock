#!/bin/bash
# One-command P6 acceptance run on a fresh disposable fixture:
#   build sik_p6f (full mysqldump clone of sik + the 5 STRATA- reg rows)
#   -> grant benchmark@localhost the same DML it has on sik
#   -> p6_acceptance_suite.sh (retargets/restores database.xml itself)
#   -> revoke the grant and drop the fixture (always, via EXIT trap)
# Usage: bash p6_run_suite_fresh.sh   (as root on the benchmark VPS)
set -u
cd /opt/Deers-Rock/tools
FX=sik_p6f
STRATA_SQL=${STRATA_SQL:-$(ls /opt/dr-benchmark/p-chain/sik_p6f_build_*/strata_reg_rows.sql | head -1)}
SQL() { mysql -uroot -N -e "$1"; }
teardown() {
  SQL "REVOKE SELECT, INSERT, UPDATE, DELETE ON \`$FX\`.* FROM \`benchmark\`@\`localhost\`;" 2>/dev/null
  [ "${BUILT:-0}" = "1" ] && SQL "DROP DATABASE IF EXISTS $FX;"
  echo "teardown: databases now: $(SQL 'SHOW DATABASES' | grep '^sik' | tr '\n' ' ')"
}
trap teardown EXIT
[ -n "$(SQL "SHOW DATABASES LIKE '$FX'")" ] && { echo "$FX already exists - refusing"; exit 3; }
[ -f "$STRATA_SQL" ] || { echo "STRATA row dump not found"; exit 3; }
T0=$(date +%s)
SQL "CREATE DATABASE $FX CHARACTER SET $(SQL "SELECT default_character_set_name FROM information_schema.schemata WHERE schema_name='sik'") COLLATE $(SQL "SELECT default_collation_name FROM information_schema.schemata WHERE schema_name='sik'");"
BUILT=1
mysqldump -uroot --single-transaction --quick --skip-lock-tables sik | mysql -uroot $FX || exit 3
mysql -uroot $FX < "$STRATA_SQL" || exit 3
echo "fixture $FX: $(( $(date +%s) - T0 ))s; reg_periksa=$(SQL "SELECT COUNT(*) FROM $FX.reg_periksa") (sik $(SQL 'SELECT COUNT(*) FROM sik.reg_periksa') + 5 STRATA-); billing=$(SQL "SELECT COUNT(*) FROM $FX.billing")"
SQL "GRANT SELECT, INSERT, UPDATE, DELETE ON \`$FX\`.* TO \`benchmark\`@\`localhost\`;"
FX=$FX bash p6_acceptance_suite.sh
RC=$?
echo "suite exit=$RC"
exit $RC
