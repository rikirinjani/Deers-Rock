#!/bin/bash
# P16 recovery-check controls (task doc s2 E1, E2, E3). Run under the run lock on the box.
#   E3  nc_status_e (extracted from the NC runner bytes): missing file / no verdict line -> ERROR.
#   E1  A28' restore result asserted. A textual mutation of the restore's printed result
#       ("restore-not-verified"), applied identically to OLD (.bak_p16) and NEW suite copies,
#       P11_ONLY=28: OLD -> A28' PASS (the failed restore is masked), NEW -> FAIL.
#   E2  switch value 0 is inert. R5_NEGCTL_BACKUP_NO_TXN=0, P11_ONLY=28: OLD activates the NC arm
#       (mode=NC-autocommit), NEW does not and passes.
#   Static: no raw `=${R5_NEGCTL_*:-}` capture is left in the suite or the preservation check.
# Usage: DR_LOCK_SESSION=<id> bash p16_e_negctl.sh <bak-p16-dir>
set -u
cd /opt/Deers-Rock/tools
BAK=${1:?bak dir with the pre-P16 bytes}
. ./dr_runlock.sh; dr_runlock_require p16_e_negctl.sh
export DBUTIL_FORCE_ROOT=1
SQL() { mysql -uroot -N -e "$1"; }
FX=sik_p6f
PC=/opt/dr-benchmark/p-chain
P=0; F=0
chk() { if [ "$2" = "$3" ]; then echo "PASS $1 (got $2)"; P=$((P+1)); else echo "FAIL $1 (got $2, want $3)"; F=$((F+1)); fi; }
[ -n "$(SQL "SHOW DATABASES LIKE '$FX'")" ] && { echo "ABORT: $FX exists - refusing, nothing touched"; exit 3; }
eval "$(sed -n '/^nc_status_e() {/,/^}/p;/^ev_of() {/,/^}/p;/^teardown_fx() {/,/^}/p;/^ensure_fx() {/,/^}/p' p11_negative_controls.sh)"
chk "extracted nc_status_e, ev_of, teardown_fx, ensure_fx" "$(for f in nc_status_e ev_of teardown_fx ensure_fx; do type -t $f; done | tr '\n' ' ')" "function function function function "
trap 'teardown_fx' EXIT

echo "## E3 nc_status_e (NC runner bytes)"
T=$(mktemp -d)
chk "E3 missing file -> ERROR" "$(nc_status_e $T/nope.md 28)" ERROR
chk "E3 empty path -> ERROR" "$(nc_status_e '' 28)" ERROR
echo "some unrelated line" > $T/nov.md
chk "E3 file without the verdict line -> ERROR" "$(nc_status_e $T/nov.md 28)" ERROR
echo "A28: FAIL x" > $T/f.md; chk "E3 FAIL line -> FAIL" "$(nc_status_e $T/f.md 28)" FAIL
echo "A28: PASS x" > $T/p.md; chk "E3 PASS line -> PASS" "$(nc_status_e $T/p.md 28)" PASS
echo "A28: PASS x" > $T/o.md; chk "E3 PASS line of another check -> ERROR" "$(nc_status_e $T/o.md 31)" ERROR
rm -rf $T

echo "## static: no raw switch capture left"
chk "no =\${R5_NEGCTL_*:-} capture in the suite or the preservation check" \
  "$(grep -cE '=\$\{R5_NEGCTL_[A-Z_]+:-\}' p6_acceptance_suite.sh p10_preservation_check.sh | awk -F: '{s+=$2} END{print s}')" 0
chk "no -n test of an R5_NEGCTL switch in the preservation check" "$(grep -cE '\[ -n "\$\{R5_NEGCTL_' p10_preservation_check.sh)" 0

ensure_fx || { echo "ABORT: cannot build fixture $FX"; exit 3; }
run28() { # script env... -> evidence path
  local s=$1; shift
  env P11_ONLY=28 "$@" bash "$s" > /tmp/p16e_run.log 2>&1
  ev_of /tmp/p16e_run.log
}
cp p6_acceptance_suite.sh /tmp/p16_suite_new.sh; cp "$BAK/p6_acceptance_suite.sh" /tmp/p16_suite_old.sh
MUT='s/print("restored" if ok else "restore-not-verified")/print("restore-not-verified")/'
cp /tmp/p16_suite_new.sh /tmp/p16_suite_new_mut.sh; sed -i "$MUT" /tmp/p16_suite_new_mut.sh
cp /tmp/p16_suite_old.sh /tmp/p16_suite_old_mut.sh; sed -i "$MUT" /tmp/p16_suite_old_mut.sh
chk "mutation applied to the NEW copy (two sites since P17 A6: R28 and R31)" "$(grep -c 'print("restore-not-verified")' /tmp/p16_suite_new_mut.sh)" 2
chk "mutation applied to the OLD copy" "$(grep -c 'print("restore-not-verified")' /tmp/p16_suite_old_mut.sh)" 1

echo "## E1 (N5): A28' with the restore reported as not verified"
EVO=$(run28 /tmp/p16_suite_old_mut.sh); grep -a "^A28" "$EVO" | cut -c1-150
chk "E1 OLD: A28' still PASSES (the failed restore is masked: the defect)" "$(nc_status_e "$EVO" 28)" PASS
EVN=$(run28 /tmp/p16_suite_new_mut.sh); grep -a "^A28" "$EVN" | cut -c1-150
chk "E1 NEW: A28' FAILS" "$(nc_status_e "$EVN" 28)" FAIL
chk "E1 NEW: the reported restore result is in the evidence" "$(grep -ac "A28' restore=restore-not-verified" "$EVN")" 1

echo "## E2 (N6): switch value 0"
EVO=$(run28 /tmp/p16_suite_old.sh R5_NEGCTL_BACKUP_NO_TXN=0); grep -a "A28' C0" "$EVO" | cut -c1-150
chk "E2 OLD: 0 activates the NC arm (the defect)" "$(grep -ac 'mode=NC-autocommit' "$EVO")" 1
EVN=$(run28 /tmp/p16_suite_new.sh R5_NEGCTL_BACKUP_NO_TXN=0); grep -a "A28' C0" "$EVN" | cut -c1-150
chk "E2 NEW: 0 is inert (no NC arm)" "$(grep -ac 'mode=NC-autocommit' "$EVN")" 0
chk "E2 NEW: A28' PASSES with the switch at 0" "$(nc_status_e "$EVN" 28)" PASS
EVB=$(run28 /tmp/p16_suite_new.sh); chk "baseline NEW, no switch: A28' PASSES" "$(nc_status_e "$EVB" 28)" PASS
EV1=$(run28 /tmp/p16_suite_new.sh R5_NEGCTL_BACKUP_NO_TXN=1)
chk "NEW: switch =1 still activates the NC arm and A28' FAILS" "$(nc_status_e "$EV1" 28)" FAIL
chk "NEW: switch =1 names the NC arm" "$(grep -ac 'mode=NC-autocommit' "$EV1")" 1
echo "P16-E-NC: PASS=$P FAIL=$F"
[ "$F" = "0" ]
