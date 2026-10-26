#!/bin/bash
# P15 A1/A2/A3 negative controls for the P13 and P14 drivers (task doc s2 A).
#   A1/A2 refusal: an EXISTING clone (with a sentinel table), the benchmark grant on it, and a
#         running process named BilingHarness are left untouched when the driver refuses.
#         Shown on the OLD driver bytes first (.bak_p15: the defect) and then on the new bytes.
#   A3    pipefail: a mysqldump that writes a partial dump and exits 2 makes the P14 driver abort
#         (exit 3) and drop only the half-clone it created.
# Usage: DR_LOCK_SESSION=<id> bash p15_a_negctl.sh <bak-dir> <fixture-dir> <visits-file>
set -u
cd /opt/Deers-Rock/tools
BAK=${1:?bak dir with the pre-P15 driver bytes}; FXDIR=${2:?fixture dir}; VIS=${3:?visits file}
. ./dr_runlock.sh; dr_runlock_require p15_a_negctl.sh
. ./p15_lib.sh
SQL() { mysql -uroot -N -e "$1"; }
P=0; F=0
chk() { if [ "$2" = "$3" ]; then echo "PASS $1 (got $2)"; P=$((P+1)); else echo "FAIL $1 (got $2, want $3)"; F=$((F+1)); fi; }
DUMMY=""
setup() { # clone-name: existing clone with a sentinel, a grant, and a dummy BilingHarness process
  SQL "DROP DATABASE IF EXISTS $1; CREATE DATABASE $1; CREATE TABLE $1.p15_sentinel (x INT); INSERT INTO $1.p15_sentinel VALUES (42);"
  SQL "GRANT SELECT, INSERT, UPDATE, DELETE ON \`$1\`.* TO 'benchmark'@'localhost';"   # the set the drivers grant/revoke
  ( setsid bash -c 'exec -a BilingHarness sleep 600' > /dev/null 2>&1 & )
  sleep 1
  DUMMY=$(pgrep -f '^BilingHarness' | head -1)
}
state() { # clone-name -> "sentinel=<0|1> grant=<n> dummy=<alive|dead>"
  local s; s=$(SQL "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$1' AND table_name='p15_sentinel'")
  echo "sentinel=$s grant=$(p15_grant_count $1) dummy=$(kill -0 "$DUMMY" 2>/dev/null && echo alive || echo dead)"
}
teardown() { # clone-name
  [ -n "$DUMMY" ] && kill "$DUMMY" 2>/dev/null; DUMMY=""
  SQL "REVOKE ALL PRIVILEGES ON \`$1\`.* FROM 'benchmark'@'localhost';" 2>/dev/null
  SQL "DROP DATABASE IF EXISTS $1;"
}

echo "## A1 P13 driver, existing clone: OLD bytes ($BAK/p13_wide_sample.sh)"
setup sik_p13w; echo "before: $(state sik_p13w)"
bash $BAK/p13_wide_sample.sh A1OLD "$VIS" > /tmp/p15a_p13old.log 2>&1; RC=$?
echo "old driver exit=$RC; after: $(state sik_p13w)"
chk "A1 OLD P13 refusal destroyed the existing clone (the defect)" "$(state sik_p13w | cut -d' ' -f1)" "sentinel=0"
teardown sik_p13w
echo "## A1 P13 driver, existing clone: NEW bytes"
setup sik_p13w
bash p13_wide_sample.sh A1NEW "$VIS" > /tmp/p15a_p13new.log 2>&1; RC=$?
chk "A1 NEW P13 refusal exit" "$RC" 3
chk "A1 NEW P13 refusal leaves clone, grant, process" "$(state sik_p13w)" "sentinel=1 grant=4 dummy=alive"
teardown sik_p13w

echo "## A2 P14 driver, existing clone: OLD bytes ($BAK/p14_edge_run.sh)"
setup sik_p14e
bash $BAK/p14_edge_run.sh "$FXDIR" > /tmp/p15a_p14old.log 2>&1; RC=$?
echo "old driver exit=$RC; after: $(state sik_p14e)"
chk "A2 OLD P14 refusal killed the unrelated harness and revoked the grant (the defect)" "$(state sik_p14e | cut -d' ' -f2-)" "grant=0 dummy=dead"
teardown sik_p14e
echo "## A2 P14 driver, existing clone: NEW bytes"
setup sik_p14e
bash p14_edge_run.sh "$FXDIR" > /tmp/p15a_p14new.log 2>&1; RC=$?
chk "A2 NEW P14 refusal exit" "$RC" 3
chk "A2 NEW P14 refusal leaves clone, grant, process" "$(state sik_p14e)" "sentinel=1 grant=4 dummy=alive"
teardown sik_p14e

echo "## A3 P14 driver, failing mysqldump (pipefail)"
FB=$(mktemp -d)
printf '#!/bin/bash\necho "CREATE TABLE p15_partial (a INT);"\nexit 2\n' > $FB/mysqldump; chmod +x $FB/mysqldump
PATH=$FB:$PATH bash p14_edge_run.sh "$FXDIR" > /tmp/p15a_pipefail.log 2>&1; RC=$?
grep -a "ABORT\|cleanup" /tmp/p15a_pipefail.log
chk "A3 pipefail abort exit" "$RC" 3
chk "A3 abort names the pipeline" "$(grep -ac 'clone pipeline failed' /tmp/p15a_pipefail.log)" 1
chk "A3 half-clone created by this run is dropped" "$(SQL "SHOW DATABASES LIKE 'sik_p14e'" | wc -l)" 0
rm -rf "$FB"
echo "P15-A-NC: PASS=$P FAIL=$F"
[ "$F" = "0" ]
