#!/bin/bash
# P23 controls (task doc s2). Run under the run lock. OLD = the P22 bytes kept in <bak-p23>.
#   F1  the free-disk threshold of p14_edge_run.sh (the STOP RULE line, extracted from the driver, `df` and `res` shadowed):
#       OLD ignores P14_MIN_FREE_GB (14 GB free < 20: STOP RULE even with the variable set to 8); NEW with the variable
#       unset behaves as OLD (default 20); NEW with 8 passes; the boundary (14 free, threshold 14 passes, 15 stops);
#       a value that is not a whole number is refused with rc 3 (not read as a number); 70 GB free with the default passes.
#   F2  p23_chain.sh's freshness helper (extracted): a file newer than the marker is fresh; an older, an empty and a
#       missing file are stale.
# Usage: DR_LOCK_SESSION=<id> bash p23_a_negctl.sh <bak-p23 (P22 bytes)>
set -u
cd /opt/Deers-Rock/tools
BAK=${1:?bak p23 dir (P22 bytes)}
. ./dr_runlock.sh; dr_runlock_require p23_a_negctl.sh
P=0; F=0
chk() { if [ "$2" = "$3" ]; then echo "PASS $1 (got $2)"; P=$((P+1)); else echo "FAIL $1 (got $2, want $3)"; F=$((F+1)); fi; }
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT

chk "precondition: OLD and NEW p14_edge_run.sh differ" "$(cmp -s $BAK/p14_edge_run.sh p14_edge_run.sh && echo same || echo differs)" differs
echo "## F1 the free-disk threshold"
OLDL=$(grep -F 'STOP RULE' $BAK/p14_edge_run.sh)
NEWL=$(sed -n '/^MINFREE=/,/STOP RULE/p' p14_edge_run.sh)
chk "F1 the OLD line and the NEW lines are extracted" "$([ -n "$OLDL" ] && echo y || echo n)/$(echo "$NEWL" | grep -c .)" y/3
run_line() { # lines avail-GB env-assignment -> "rc|output"
  # the variable is unset first: an environment that sets P14_MIN_FREE_GB (the 20 GiB machine does) must not leak into the "unset" cases
  printf '%s\n' "res() { echo \"RES: \$*\"; }" "df() { printf 'Avail\n %sG\n' $2; }" "unset P14_MIN_FREE_GB" "$3" "$1" "echo PASSED-THE-CHECK" > $T/l.sh
  out=$(bash $T/l.sh 2>&1); rc=$?
  echo "$rc|$(echo "$out" | tr '\n' ' ')"
}
R=$(run_line "$OLDL" 14 ":");                     chk "F1 OLD, 14 GB free, variable unset: STOP RULE <20GB, rc 3" "${R%%|*}/$(echo "$R" | grep -c 'STOP RULE: <20GB free')" 3/1
R=$(run_line "$OLDL" 14 "export P14_MIN_FREE_GB=8"); chk "F1 OLD, 14 GB free, variable 8: still STOP RULE (the variable is ignored: the defect)" "${R%%|*}/$(echo "$R" | grep -c 'PASSED-THE-CHECK')" 3/0
R=$(run_line "$NEWL" 14 ":");                     chk "F1 NEW, 14 GB free, variable unset: STOP RULE <20GB, rc 3 (default unchanged)" "${R%%|*}/$(echo "$R" | grep -c 'STOP RULE: <20GB free')" 3/1
R=$(run_line "$NEWL" 14 "export P14_MIN_FREE_GB=8");  chk "F1 NEW, 14 GB free, variable 8: passes" "${R%%|*}/$(echo "$R" | grep -c 'PASSED-THE-CHECK')" 0/1
R=$(run_line "$NEWL" 14 "export P14_MIN_FREE_GB=14"); chk "F1 NEW, boundary 14 free, threshold 14: passes" "${R%%|*}/$(echo "$R" | grep -c 'PASSED-THE-CHECK')" 0/1
R=$(run_line "$NEWL" 14 "export P14_MIN_FREE_GB=15"); chk "F1 NEW, 14 free, threshold 15: STOP RULE <15GB, rc 3" "${R%%|*}/$(echo "$R" | grep -c 'STOP RULE: <15GB free')" 3/1
R=$(run_line "$NEWL" 70 ":");                     chk "F1 NEW, 70 GB free, variable unset (the source box): passes" "${R%%|*}/$(echo "$R" | grep -c 'PASSED-THE-CHECK')" 0/1
for bad in 1e3 -5 "8 " 8GB; do
  R=$(run_line "$NEWL" 70 "export P14_MIN_FREE_GB='$bad'"); chk "F1 NEW, threshold '$bad' is refused (rc 3, 'not a whole number', the check is not passed)" "${R%%|*}/$(echo "$R" | grep -c 'not a whole number')/$(echo "$R" | grep -c 'PASSED-THE-CHECK')" 3/1/0
done
R=$(run_line "$NEWL" 14 "export P14_MIN_FREE_GB="); chk "F1 NEW, variable set but empty: the default 20 applies (STOP RULE <20GB at 14 GB free)" "${R%%|*}/$(echo "$R" | grep -c 'STOP RULE: <20GB free')" 3/1

echo "## F2 the freshness helper of p23_chain.sh"
FN=$(sed -n '/^p23_isfresh() {/,/^}/p' p23_chain.sh)
chk "F2 the helper is extracted from the chain" "$(echo "$FN" | grep -c .)" 3
mkdir -p $T/b/chain; : > $T/b/chain/.t0
sleep 1
echo '{"x":1}' > $T/b/chain/new.json
echo '{"x":1}' > $T/b/chain/old.json; touch -d '2 hours ago' $T/b/chain/old.json
: > $T/b/chain/empty.json
fr() { bash -c "B=$T/b; $FN; p23_isfresh $T/b/chain/$1"; }
chk "F2 a file written after the marker is fresh" "$(fr new.json)" fresh
chk "F2 a file older than the marker (shipped from another box) is stale" "$(fr old.json)" stale
chk "F2 an empty file is stale" "$(fr empty.json)" stale
chk "F2 a missing file is stale" "$(fr nothere.json)" stale

echo "P23-A-NC: PASS=$P FAIL=$F"
[ "$F" = "0" ]
