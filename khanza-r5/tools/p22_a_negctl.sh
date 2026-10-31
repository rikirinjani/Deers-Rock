#!/bin/bash
# P22 safety controls (task doc s2 A, B). Run under the run lock on the box. OLD = the P20 bytes kept in <bak-p22>.
#   R1  p15_oracle_batch_failed on a missing, an empty and an unreadable log: OLD "none" (grep exit 2 / no match),
#       NEW "match" (fail closed); a clean log stays "none", a failed log stays "match". Through the real oracle_run
#       (extracted from the driver, `env` and `p15_count_sukses` shadowed): an oracle that exits 4 with an EMPTY log
#       returns 4 with OLD and 10 with NEW; a clean log still returns 4.
#   R2  the EXIT-trap cleanup of p14_edge_run.sh and p13_wide_sample.sh (each extracted with sed, $DBXML shadowed by a
#       function that fails on `restore`): OLD rc 0 and no message, NEW rc 3 and CLEANUP-RESTORE-FAILED; a restore that
#       succeeds is silent and rc 0 in both.
#   R3  p15_clone_matches_sik with `mysql` shadowed: failing mysql (empty output) and non-numeric output, OLD "matches"
#       rc 0, NEW rc 1; equal numbers still match (and print count-equal); a real mismatch still fails in both.
# Usage: DR_LOCK_SESSION=<id> bash p22_a_negctl.sh <bak-p22 (P20 bytes)>
set -u
cd /opt/Deers-Rock/tools
BAK=${1:?bak p22 dir (P20 bytes)}
. ./dr_runlock.sh; dr_runlock_require p22_a_negctl.sh
. ./p15_lib.sh
export DBUTIL_FORCE_ROOT=1
P=0; F=0
chk() { if [ "$2" = "$3" ]; then echo "PASS $1 (got $2)"; P=$((P+1)); else echo "FAIL $1 (got $2, want $3)"; F=$((F+1)); fi; }
T=$(mktemp -d)
cleanup_all() { rm -f /tmp/p15e_p22t.log; rm -rf "$T"; }
trap cleanup_all EXIT
XMLP() { python3 p6_dbxml.py probe 2>&1 | awk '{print $NF}' | sort -u | tr '\n' ' '; }
chk "precondition: database.xml on sik" "$(XMLP)" "sik "
chk "precondition: OLD bytes differ from NEW bytes (lib, p14, p13)" "$(cmp -s $BAK/p15_lib.sh p15_lib.sh && echo same || echo differs)/$(cmp -s $BAK/p14_edge_run.sh p14_edge_run.sh && echo same || echo differs)/$(cmp -s $BAK/p13_wide_sample.sh p13_wide_sample.sh && echo same || echo differs)" differs/differs/differs

echo "## R1 the helper on a missing, empty, unreadable, clean and failed log (OLD lib vs NEW lib)"
printf '[01:38:36] ALLOW-STRATA (B3): 9 provided visits OUT-OF-ENVELOPE\n[01:40:40] stage-drop r5_stage_B3_x_* verified (0 remaining; box left clean)\n' > $T/clean.log
printf '[01:38:36] ALLOW-STRATA (B3): 9 provided visits OUT-OF-ENVELOPE\n[01:40:37] STAGE-DROP-FAILED r5_stage_B3_x_*: errors=[] remaining=[x] (box NOT clean; verdict forced fail-closed)\n' > $T/failed.log
: > $T/empty.log
mkdir $T/adir
hf() { bash -c ". $1; p15_oracle_batch_failed $2 2>/dev/null && echo match || echo none"; }
chk "R1 missing log: OLD none (the defect) / NEW match" "$(hf $BAK/p15_lib.sh $T/nonexistent.log)/$(hf ./p15_lib.sh $T/nonexistent.log)" none/match
chk "R1 empty log: OLD none / NEW match" "$(hf $BAK/p15_lib.sh $T/empty.log)/$(hf ./p15_lib.sh $T/empty.log)" none/match
chk "R1 a directory instead of a log: OLD none / NEW match" "$(hf $BAK/p15_lib.sh $T/adir)/$(hf ./p15_lib.sh $T/adir)" none/match
chk "R1 clean log: OLD none / NEW none (no false trigger)" "$(hf $BAK/p15_lib.sh $T/clean.log)/$(hf ./p15_lib.sh $T/clean.log)" none/none
chk "R1 failed log: OLD match / NEW match (positive control for the line above)" "$(hf $BAK/p15_lib.sh $T/failed.log)/$(hf ./p15_lib.sh $T/failed.log)" match/match
chk "R1 the NEW helper says why on stderr for a missing log" "$(bash -c ". ./p15_lib.sh; p15_oracle_batch_failed $T/nonexistent.log" 2>&1 | grep -c 'missing, unreadable or empty')" 1

echo "## R1 through the real oracle_run (extracted from the driver)"
printf '2027/12/31/900001\n2027/12/31/900002\n2027/12/31/900003\n' > $T/vis3.txt
od_test() { # lib-file canned-log -> "RC=<n>"
  local FN; FN=$(sed -n '/^oracle_run() {/,/^}/p' ./p14_edge_run.sh)
  rm -f /tmp/p15e_p22t.log
  bash -c "
. $1
res() { :; }
env() { case \"\$*\" in *--freeze-only*) return 0;; *) cat '$2'; return 4;; esac; }
p15_count_sukses() { [ \"\$2\" = true ] && echo 3 || echo 0; }
SQL() { echo '2027-10-27 00:00:00.000000'; }
TS=p22; RUNDIR=$T/run; mkdir -p \$RUNDIR; OUT=/dev/null; RIDS=; FX=sik_none
$FN
oracle_run p22t $T/vis3.txt ''
echo RC=\$?" 2>/dev/null | tail -1
}
chk "R1 oracle_run is extracted from the driver" "$([ -n "$(sed -n '/^oracle_run() {/,/^}/p' ./p14_edge_run.sh)" ] && echo yes || echo no)" yes
chk "R1 oracle exits 4 with an EMPTY log: OLD 4 (accepted as an out-of-envelope run) / NEW 10 (ORACLE-BATCH-FAILED)" "$(od_test $BAK/p15_lib.sh $T/empty.log)/$(od_test ./p15_lib.sh $T/empty.log)" "RC=4/RC=10"
chk "R1 oracle exits 4 with a clean log: OLD 4 / NEW 4" "$(od_test $BAK/p15_lib.sh $T/clean.log)/$(od_test ./p15_lib.sh $T/clean.log)" "RC=4/RC=4"
chk "R1 oracle exits 4 with a failed log: OLD 10 / NEW 10" "$(od_test $BAK/p15_lib.sh $T/failed.log)/$(od_test ./p15_lib.sh $T/failed.log)" "RC=10/RC=10"

echo "## R2 the EXIT-trap cleanup, failing and succeeding \$DBXML restore (OLD driver vs NEW driver)"
cl_test() { # driver-file restore-rc -> "rc|<output, one line>"
  local f=$T/cl_$$.sh out rc
  {
    echo '. ./p15_lib.sh'
    echo 'res() { echo "RES: $*"; }'
    echo 'p15_kill_run_harness() { return 0; }'
    echo "DBXMLF() { case \"\$1\" in restore) return $2;; probe) echo '[dbxml] sik';; esac; }"
    echo 'DBXML=DBXMLF; RETARGETED=1; GRANTED=0; CREATED=0; KEEP=0; BUILT=0; ORACLE_RC=0; RUN_ID=x; RIDS=x; FX=sik_none'
    echo 'SQL() { :; }'
    sed -n '/^cleanup() {/,/^}/p' "$1"
    echo 'cleanup'
  } > $f
  out=$(bash $f 2>&1); rc=$?
  rm -f $f
  echo "$rc|$(echo "$out" | tr '\n' ' ' | cut -c1-200)"
}
for d in p14_edge_run.sh p13_wide_sample.sh; do
  chk "R2 $d: cleanup is extracted" "$([ -n "$(sed -n '/^cleanup() {/,/^}/p' ./$d)" ] && echo yes || echo no)" yes
  O=$(cl_test $BAK/$d 1); N=$(cl_test ./$d 1)
  echo "  $d failing restore: OLD [$O] NEW [$N]"
  chk "R2 $d failing restore: OLD rc 0 and no CLEANUP-RESTORE-FAILED (the defect)" "${O%%|*}/$(echo "$O" | grep -c CLEANUP-RESTORE-FAILED)" 0/0
  chk "R2 $d failing restore: NEW rc 3 and the message" "${N%%|*}/$(echo "$N" | grep -c CLEANUP-RESTORE-FAILED)" 3/1
  O=$(cl_test $BAK/$d 0); N=$(cl_test ./$d 0)
  chk "R2 $d succeeding restore: OLD rc 0 / NEW rc 0, no CLEANUP-RESTORE-FAILED" "${O%%|*}/${N%%|*}/$(echo "$O$N" | grep -c CLEANUP-RESTORE-FAILED)" 0/0/0
done

echo "## R3 p15_clone_matches_sik with mysql shadowed"
cm() { # lib-file mysql-shadow -> "rc|<output>"
  local out rc
  out=$(bash -c ". $1; $2; p15_clone_matches_sik clone_x" 2>&1); rc=$?
  echo "$rc|$(echo "$out" | tr '\n' ' ')"
}
MYFAIL='mysql() { return 1; }'
MYJUNK='mysql() { echo "ERROR 1049 not a number"; }'
MYOK='mysql() { case "$*" in *information_schema*) echo 1179;; *) echo 5;; esac; }'
MYDIFF='mysql() { case "$*" in *"table_schema='"'"'sik'"'"'"*) echo 1179;; *information_schema*) echo 1100;; *) echo 5;; esac; }'
O=$(cm $BAK/p15_lib.sh "$MYFAIL"); N=$(cm ./p15_lib.sh "$MYFAIL")
echo "  failing mysql: OLD [$O] NEW [$N]"
chk "R3 failing mysql (two empty strings): OLD rc 0 'clone matches sik' (the defect) / NEW rc 1" "${O%%|*}/$(echo "$O" | grep -c 'clone matches sik')/${N%%|*}/$(echo "$N" | grep -c 'mysql failed')" 0/1/1/1
O=$(cm $BAK/p15_lib.sh "$MYJUNK"); N=$(cm ./p15_lib.sh "$MYJUNK")
chk "R3 non-numeric output on both sides: OLD rc 0 (the defect) / NEW rc 1" "${O%%|*}/${N%%|*}" 0/1
O=$(cm $BAK/p15_lib.sh "$MYOK"); N=$(cm ./p15_lib.sh "$MYOK")
chk "R3 equal numbers: OLD rc 0 / NEW rc 0, NEW prints 'tables=1179 (= sik)' and 'count-equal'" "${O%%|*}/${N%%|*}/$(echo "$N" | grep -c 'tables=1179 (= sik).*count-equal')" 0/0/1
O=$(cm $BAK/p15_lib.sh "$MYDIFF"); N=$(cm ./p15_lib.sh "$MYDIFF")
chk "R3 a real table-count mismatch: OLD rc 1 / NEW rc 1 (positive control)" "${O%%|*}/${N%%|*}/$(echo "$N" | grep -c 'clone table count')" 1/1/1

chk "database.xml on sik at the end" "$(XMLP)" "sik "
echo "P22-A-NC: PASS=$P FAIL=$F"
[ "$F" = "0" ]
