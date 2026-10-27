#!/bin/bash
# P16 controls (task doc s2 A1, A3, E4-observed). Run under the run lock on the box.
#   A1 (N1) p10_preservation_check.sh refusal: a foreign, kept sik_p6f (no r6_p10 stage tables) carrying
#      a benchmark grant. OLD bytes (.bak_p16) exit 3 AND revoke the grant (the defect: the EXIT trap acts
#      on state this run did not create); NEW bytes exit 3 and leave the grant.
#   A3 (R3b) driver wiring: the ACTUAL tail lines of p14_edge_run.sh (extracted by marker) and its pin
#      segment, run with FIX_RC / REAL_RC assigned and the xml probe stubbed (oracle_run itself is not run; P18 A10). These are wiring tests of the driver's own
#      lines, not a full clone run (the full run is the C4 rerun of the chain).
#   E4 (observed) the pre-operation snapshot missing -> exit 3, "ABORT: pre-operation snapshot missing".
# Usage: DR_LOCK_SESSION=<id> bash p16_a_negctl.sh <bak-p16-dir>
set -u
cd /opt/Deers-Rock/tools
BAK=${1:?bak dir with the pre-P16 bytes}
. ./dr_runlock.sh; dr_runlock_require p16_a_negctl.sh
. ./p15_lib.sh
export DBUTIL_FORCE_ROOT=1
SQL() { mysql -uroot -N -e "$1"; }
FX=sik_p6f
P=0; F=0
chk() { if [ "$2" = "$3" ]; then echo "PASS $1 (got $2)"; P=$((P+1)); else echo "FAIL $1 (got $2, want $3)"; F=$((F+1)); fi; }
[ -n "$(SQL "SHOW DATABASES LIKE '$FX'")" ] && { echo "ABORT: $FX exists - refusing, nothing touched"; exit 3; }
XMLP() { python3 p6_dbxml.py probe 2>&1 | awk '{print $NF}' | sort -u | tr '\n' ' '; }
setup_foreign() {
  SQL "CREATE DATABASE $FX; CREATE TABLE $FX.p16_sentinel (x INT); INSERT INTO $FX.p16_sentinel VALUES (7);"
  SQL "GRANT SELECT, INSERT, UPDATE, DELETE ON \`$FX\`.* TO 'benchmark'@'localhost';"
}
teardown_foreign() {
  SQL "REVOKE ALL PRIVILEGES ON \`$FX\`.* FROM 'benchmark'@'localhost';" 2>/dev/null
  SQL "DROP DATABASE IF EXISTS $FX;"
}
trap 'teardown_foreign' EXIT
XML0=$(XMLP)
chk "precondition: database.xml on sik" "$XML0" "sik "

echo "## A1 (N1) preservation check refusal on a foreign fixture: OLD bytes ($BAK/p10_preservation_check.sh)"
setup_foreign; echo "before: grant=$(p15_grant_count $FX) xml=$(XMLP)"
bash $BAK/p10_preservation_check.sh > /tmp/p16a_p10old.log 2>&1; RC=$?
echo "old exit=$RC; after: grant=$(p15_grant_count $FX) xml=$(XMLP)"; grep -a "ABORT" /tmp/p16a_p10old.log | head -2
chk "A1 OLD refusal exit" "$RC" 3
chk "A1 OLD refusal revoked a grant it did not create (the defect)" "$(p15_grant_count $FX)" 0
teardown_foreign
echo "## A1 (N1) NEW bytes"
setup_foreign
bash p10_preservation_check.sh > /tmp/p16a_p10new.log 2>&1; RC=$?
grep -a "ABORT" /tmp/p16a_p10new.log | head -2
chk "A1 NEW refusal exit" "$RC" 3
chk "A1 NEW refusal leaves the grant" "$(p15_grant_count $FX)" 4
chk "A1 NEW refusal leaves the fixture" "$(SQL "SELECT COUNT(*) FROM $FX.p16_sentinel")" 1
chk "A1 database.xml still on sik" "$(XMLP)" "sik "
teardown_foreign

echo "## A3 driver wiring: tail of p14_edge_run.sh (exit decision)"
TAIL=$(sed -n '/^\$DBXML restore >> \/tmp\/p14e_dbxml.log/,$p' p14_edge_run.sh)
chk "A3 tail extracted (non-empty, ends with exit 1)" "$( [ -n "$TAIL" ] && echo "$TAIL" | tail -1 | grep -q '^exit 1' && echo yes || echo no)" yes
tailrc() { # fixture-rc real-rc
  bash -c ". ./p15_lib.sh; res() { :; }; p16_dbxml() { [ \"\$1\" = probe ] && echo '[dbxml] harness sik'; return 0; }; DBXML=p16_dbxml; RETARGETED=1; FX=none; OUT=/dev/null; FIX_RC=$1; REAL_RC=$2
$TAIL" > /dev/null 2>&1; echo $?
}
chk "A3 fixture 4, real 10 (stop rule) -> driver exit 1" "$(tailrc 4 10)" 1
chk "A3 fixture 4, real 0 -> driver exit 0" "$(tailrc 4 0)" 0
chk "A3 fixture 4, no real run -> driver exit 0" "$(tailrc 4 '')" 0
chk "A3 fixture 0 (strata not out of envelope) -> driver exit 1" "$(tailrc 0 '')" 1
chk "A3 fixture 10 (stop rule) -> driver exit 1" "$(tailrc 10 '')" 1
chk "A3 fixture 4, real 4 -> driver exit 1" "$(tailrc 4 4)" 1

echo "## A3 driver wiring: ledger pin segment (A6)"
SEG=$(sed -n '/^p15_ledger_pin_check \$FX/,+1p' p14_edge_run.sh)
chk "A3 pin segment extracted (2 lines)" "$(echo "$SEG" | wc -l)" 2
segrc() { # stub-rc
  bash -c ". ./p15_lib.sh; p15_ledger_pin_check() { echo stub; return $1; }; res() { echo \"res: \$*\"; }; FX=none; PIN=x; OUT=/dev/null; KEEP=0
trap 'echo KEEP=\$KEEP' EXIT
$SEG
echo CONTINUED" 2>&1
  echo "RC=${PIPESTATUS[0]}"
}
OUTF=$(segrc 1); echo "$OUTF" | tr '\n' ' '; echo
chk "A3 pin mismatch: driver aborts (no CONTINUED)" "$(echo "$OUTF" | grep -c CONTINUED)" 0
chk "A3 pin mismatch: clone kept (KEEP=1)" "$(echo "$OUTF" | grep -c 'KEEP=1')" 1
chk "A3 pin mismatch: exit 3 (P17 A10)" "$(echo "$OUTF" | grep -c 'RC=3')" 1
chk "A3 pin mismatch: names the ABORT" "$(echo "$OUTF" | grep -c 'ABORT.*DIFFERS-FROM-PIN')" 1
OUTP=$(segrc 0)
chk "A3 pin match: driver continues" "$(echo "$OUTP" | grep -c CONTINUED)" 1

echo "## E4 observed: pre-operation snapshot missing -> exit 3"
PC=/opt/dr-benchmark/p-chain
PREOP=$PC/p11_preserve_preop.json
EV=$(grep -a '^evidence: ' /opt/dr-benchmark/p15/chain_e/e_suite.log 2>/dev/null | tail -1 | sed 's/^evidence: //')
chk "E4 precondition: a suite evidence file to point at" "$( [ -n "$EV" ] && [ -f "$EV" ] && echo yes || echo no)" yes
chk "E4 precondition: a pre-op snapshot exists to move aside" "$( [ -f "$PREOP" ] && echo yes || echo no)" yes
if [ -f "$PREOP" ] && [ -f "$EV" ]; then
  SQL "CREATE DATABASE $FX; CREATE TABLE $FX.r5_stage_B3_r6_p10_x (a INT);"
  mv "$PREOP" "$PREOP.p16hold"
  P15_SUITE_EV=$EV bash p10_preservation_check.sh > /tmp/p16a_e4.log 2>&1; RC=$?
  mv "$PREOP.p16hold" "$PREOP"
  grep -a "ABORT" /tmp/p16a_e4.log | head -2
  chk "E4 exit with the pre-op snapshot missing" "$RC" 3
  chk "E4 names the missing snapshot" "$(grep -ac 'ABORT: pre-operation snapshot missing' /tmp/p16a_e4.log)" 1
  chk "E4 snapshot restored after the control" "$( [ -f "$PREOP" ] && echo yes || echo no)" yes
  teardown_foreign
fi
chk "database.xml on sik at the end" "$(XMLP)" "sik "
echo "P16-A-NC: PASS=$P FAIL=$F"
[ "$F" = "0" ]
