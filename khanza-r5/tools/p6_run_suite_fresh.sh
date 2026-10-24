#!/bin/bash
# One-command P6 acceptance run on a fresh disposable fixture:
#   build sik_p6f (full mysqldump clone of sik + the 5 STRATA- reg rows)
#   -> grant benchmark@localhost the same DML it has on sik
#   -> p6_acceptance_suite.sh (retargets/restores database.xml itself)
#   -> revoke the grant; drop the fixture on success
# P9-A3: when the suite FAILS, the fixture (and its stage tables) is KEPT for
# inspection (KEEP_ON_FAIL=1, the default) and the wrapper exits with the suite's code.
# A kept fixture blocks the next run until removed with --teardown-kept.
# Usage: bash p6_run_suite_fresh.sh                (as root on the benchmark VPS)
#        bash p6_run_suite_fresh.sh --teardown-kept (drop a kept sik_p6f)
# P11: the P11_ONLY / R5_NEGCTL_* / P10_INJECT / P9_FORCE_FAIL_CHECK / P9_QUICK
#      environment variables are forwarded to the suite below (exported before the
#      FX=... invocation) so selective and negative-control runs reach p6_acceptance_suite.sh.
# 2026-10-24: refuses (exit 3) unless the caller owns the VPS run lock (dr_runlock.sh). The
#      check is BEFORE the EXIT trap and every SQL call, so a refused second run touches nothing.
set -u
cd /opt/Deers-Rock/tools
. ./dr_runlock.sh; dr_runlock_require p6_run_suite_fresh.sh
FX=sik_p6f
SQL() { mysql -uroot -N -e "$1"; }
if [ "${1:-}" = "--teardown-kept" ]; then
  if [ -n "$(SQL "SHOW DATABASES LIKE '$FX'")" ]; then
    SQL "REVOKE SELECT, INSERT, UPDATE, DELETE ON \`$FX\`.* FROM \`benchmark\`@\`localhost\`;" 2>/dev/null
    SQL "DROP DATABASE $FX;" && echo "TEARDOWN-KEPT: $FX dropped"
  else
    echo "TEARDOWN-KEPT: no $FX present"
  fi
  echo "teardown: databases now: $(SQL 'SHOW DATABASES' | grep '^sik' | tr '\n' ' ')"
  exit 0
fi
# 2026-10-24 (P12 reproducibility): the STRATA row dump is pinned by content, not by `ls | head -1`.
# The same file is tracked at evidence/p6/sik_p6f_build_20261016T042629Z/strata_reg_rows.sql.
STRATA_SHA256=c898081914597fd04cbab22d317fe2bebdd00f92df3ef48f96e324724172f14c
STRATA_SQL=${STRATA_SQL:-/opt/dr-benchmark/p-chain/sik_p6f_build_20261016T042629Z/strata_reg_rows.sql}
RC=3; SUITE_RAN=0
teardown() {
  SQL "REVOKE SELECT, INSERT, UPDATE, DELETE ON \`$FX\`.* FROM \`benchmark\`@\`localhost\`;" 2>/dev/null
  if [ "${BUILT:-0}" = "1" ]; then
    if [ "$SUITE_RAN" = "1" ] && [ "$RC" != "0" ] && [ "${KEEP_ON_FAIL:-1}" = "1" ]; then
      echo "FIXTURE-KEPT: $FX kept because the suite failed (exit $RC); stage tables: $(SQL "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$FX' AND table_name LIKE 'r5_stage_%'"); remove with: bash p6_run_suite_fresh.sh --teardown-kept"
    else
      SQL "DROP DATABASE IF EXISTS $FX;"
    fi
  fi
  echo "teardown: databases now: $(SQL 'SHOW DATABASES' | grep '^sik' | tr '\n' ' ')"
}
trap teardown EXIT
[ -n "$(SQL "SHOW DATABASES LIKE '$FX'")" ] && { echo "$FX already exists - refusing (a kept failed fixture? see --teardown-kept)"; exit 3; }
[ -f "$STRATA_SQL" ] || { echo "STRATA row dump not found"; exit 3; }
[ "$(sha256sum "$STRATA_SQL" | cut -d" " -f1)" = "$STRATA_SHA256" ] || { echo "STRATA row dump sha256 != pinned $STRATA_SHA256 - refusing"; exit 3; }
T0=$(date +%s)
SQL "CREATE DATABASE $FX CHARACTER SET $(SQL "SELECT default_character_set_name FROM information_schema.schemata WHERE schema_name='sik'") COLLATE $(SQL "SELECT default_collation_name FROM information_schema.schemata WHERE schema_name='sik'");"
BUILT=1
mysqldump -uroot --single-transaction --quick --skip-lock-tables sik | mysql -uroot $FX || exit 3
mysql -uroot $FX < "$STRATA_SQL" || exit 3
echo "fixture $FX: $(( $(date +%s) - T0 ))s; reg_periksa=$(SQL "SELECT COUNT(*) FROM $FX.reg_periksa") (sik $(SQL 'SELECT COUNT(*) FROM sik.reg_periksa') + 5 STRATA-); billing=$(SQL "SELECT COUNT(*) FROM $FX.billing")"
SQL "GRANT SELECT, INSERT, UPDATE, DELETE ON \`$FX\`.* TO \`benchmark\`@\`localhost\`;"
SUITE_RAN=1
# P11: forward the P11/P10/P9 selective and negative-control env vars to the suite
export P11_ONLY P10_INJECT P9_FORCE_FAIL_CHECK P9_QUICK P11_FORCE_FAIL
export R5_NEGCTL_BACKUP_NO_TXN R5_NEGCTL_SKIP_IMMEDIATE_RESTORE R5_NEGCTL_KEEP_STALE_FLAG R5_NEGCTL_HASH_FROM_LIVE_LATE
FX=$FX bash p6_acceptance_suite.sh
RC=$?
echo "suite exit=$RC"
exit $RC
