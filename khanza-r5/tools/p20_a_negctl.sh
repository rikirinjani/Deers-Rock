#!/bin/bash
# P20 safety controls (task doc s2 B1, B2). Run under the run lock on the box. OLD = the P19 lib kept in <bak-p20>.
#   O1  the failed-batch helper, one pattern per canned oracle log, through the real oracle_run (extracted from the
#       driver, `env` and `p15_count_sukses` shadowed by functions; the driver bytes are unchanged, the pair is the
#       OLD and NEW lib): the P19 patterns (`: FAILED (`, STAGE-RESTORE-ERROR, NOT restored) return 10 in both arms;
#       the P20 patterns (STAGE-DROP-FAILED, STAGE-KEEP x2) return 4 with OLD (the defect) and 10 with NEW; a clean log
#       returns 4. The helper is applied to real oracle logs: the clean C4 logs of the P19 chain must not match, the
#       logs of the P19 chain's B4 run must match.
#   O2  the N5b NEW arm asserts the reason text; a mutant of the NEW lib (the `ga = 2` block deleted) gives the other
#       message; a ps that fails only after the TERM exercises the wait loop and the confirmation step.
#   O6d an empty pid file and a letters-only pid file: OLD rc 0, NEW rc 1 and the message; a pid that names no process
#       and no group, and a missing pid file, are rc 0 in both.
# Usage: DR_LOCK_SESSION=<id> bash p20_a_negctl.sh <bak-p20 (P19 lib)>
set -u
cd /opt/Deers-Rock/tools
BAK=${1:?bak p20 dir (P19 bytes)}
. ./dr_runlock.sh; dr_runlock_require p20_a_negctl.sh
. ./p15_lib.sh
export DBUTIL_FORCE_ROOT=1
P=0; F=0
chk() { if [ "$2" = "$3" ]; then echo "PASS $1 (got $2)"; P=$((P+1)); else echo "FAIL $1 (got $2, want $3)"; F=$((F+1)); fi; }
T=$(mktemp -d)
RR=p20_kill_t; RD=/opt/dr-benchmark/results/$RR/B3
cleanup_all() { pkill -KILL -f 'BilingHarness_p20|other_p20' 2>/dev/null; rm -rf /opt/dr-benchmark/results/$RR /tmp/p15e_p20t.log; rm -rf "$T"; }
trap cleanup_all EXIT
XMLP() { python3 p6_dbxml.py probe 2>&1 | awk '{print $NF}' | sort -u | tr '\n' ' '; }
chk "precondition: database.xml on sik" "$(XMLP)" "sik "

echo "## O1 oracle_run with one canned pattern at a time (OLD lib vs NEW lib, same driver)"
printf '2027/12/31/900001\n2027/12/31/900002\n2027/12/31/900003\n' > $T/vis3.txt
mk() { printf '[01:38:36] ALLOW-STRATA (B3): 9 provided visits OUT-OF-ENVELOPE\n%s\n' "$2" > $T/canned_$1.log; }
mk failed       '[01:40:36] date 2027-12-31: FAILED (sukses=false for 0/3 visits) - pre-reset state NOT restored (unverified/mismatch/error; stage tables kept), run stops (P5-2)'
mk restoreerr   '[01:40:36] STAGE-RESTORE-ERROR r5_stage_B3_x_*: RuntimeError: mysql rc=1: ERROR 1644 (45000) at line 1: injected'
mk notrestored  '[01:40:36] pre-reset state of 2026-10-01 NOT restored after the failed batch'
mk dropfailed   '[01:40:37] STAGE-DROP-FAILED r5_stage_B3_x_*: errors=[] remaining=[x] (box NOT clean; verdict forced fail-closed)'
mk keepunrest   '[01:40:37] STAGE-KEEP r5_stage_B3_x_*: batches [2027-12-31] not verifiably restored - stage tables kept for a resume/manual restore (box NOT clean)'
mk keepheld     '[01:40:37] STAGE-KEEP r5_stage_B3_x_*: FAILED batches [2027-12-31] restored but held for --retry-failed (--abandon-failed releases them; box NOT clean)'
mk clean        '[01:40:40] stage-drop r5_stage_B3_x_* verified (0 remaining; box left clean)'
od_test() { # lib-file canned-log -> "RC=<n>"
  local FN; FN=$(sed -n '/^oracle_run() {/,/^}/p' ./p14_edge_run.sh)
  rm -f /tmp/p15e_p20t.log
  bash -c "
. $1
res() { :; }
env() { case \"\$*\" in *--freeze-only*) return 0;; *) cat '$2'; return 4;; esac; }
p15_count_sukses() { [ \"\$2\" = true ] && echo 3 || echo 0; }
SQL() { echo '2027-10-27 00:00:00.000000'; }
TS=p20; RUNDIR=$T/run; mkdir -p \$RUNDIR; OUT=/dev/null; RIDS=; FX=sik_none
$FN
oracle_run p20t $T/vis3.txt ''
echo RC=\$?" 2>/dev/null | tail -1
}
chk "O1 oracle_run is extracted from the driver" "$([ -n "$(sed -n '/^oracle_run() {/,/^}/p' ./p14_edge_run.sh)" ] && echo yes || echo no)" yes
for p in failed restoreerr notrestored; do
  chk "O1 P19 pattern $p: OLD lib 10 / NEW lib 10" "$(od_test $BAK/p15_lib.sh $T/canned_$p.log)/$(od_test ./p15_lib.sh $T/canned_$p.log)" "RC=10/RC=10"
done
for p in dropfailed keepunrest keepheld; do
  chk "O1 P20 pattern $p: OLD lib 4 (the defect) / NEW lib 10" "$(od_test $BAK/p15_lib.sh $T/canned_$p.log)/$(od_test ./p15_lib.sh $T/canned_$p.log)" "RC=4/RC=10"
done
chk "O1 clean log: OLD 4 / NEW 4" "$(od_test $BAK/p15_lib.sh $T/canned_clean.log)/$(od_test ./p15_lib.sh $T/canned_clean.log)" "RC=4/RC=4"
chk "O1 the NEW driver run prints ORACLE-BATCH-FAILED for STAGE-DROP-FAILED" "$(bash -c ". ./p15_lib.sh; res() { echo \"\$1\"; }; $(sed -n '/^oracle_run() {/,/^}/p' ./p14_edge_run.sh)
env() { case \"\$*\" in *--freeze-only*) return 0;; *) cat '$T/canned_dropfailed.log'; return 4;; esac; }
p15_count_sukses() { [ \"\$2\" = true ] && echo 3 || echo 0; }
SQL() { echo x; }; TS=p20; RUNDIR=$T/run2; mkdir -p \$RUNDIR; OUT=/dev/null; RIDS=; FX=sik_none
oracle_run p20t $T/vis3.txt ''" 2>/dev/null | grep -c 'ORACLE-BATCH-FAILED\[p20t\]')" 1

echo "## O1 the helper on real oracle logs"
RUNS=/opt/dr-benchmark/p15/runs
for d in fixture real; do
  L=$RUNS/$d/oracle_20261027T092146Z.log
  chk "O1 real clean C4 oracle log ($d, P19 chain): no match" "$([ -f $L ] && (p15_oracle_batch_failed $L && echo match || echo none) || echo missing)" none
done
L=$RUNS/fixture/oracle_20261027T091807Z.log
chk "O1 real oracle log of the P19 chain's B4 run (a FAILED batch and STAGE-KEEP): match" "$([ -f $L ] && (p15_oracle_batch_failed $L && echo match || echo none) || echo missing)" match
chk "O1 that log carries STAGE-KEEP, which the P19 patterns did not cover on their own" "$(grep -ac 'STAGE-KEEP' $L)" 1

echo "## kill-function cases"
alive() { kill -0 "$(cat "$1")" 2>/dev/null && echo alive || echo dead; }
child_alive() { pgrep -f "$1" > /dev/null && echo alive || echo dead; }
reap() { local p; p=$(cat "$1" 2>/dev/null); [ -n "$p" ] && { kill -KILL -- -"$p" 2>/dev/null; kill -KILL "$p" 2>/dev/null; }; rm -f "$1"; pkill -KILL -f 'BilingHarness_p20|other_p20' 2>/dev/null; }
waitfile() { for _ in 1 2 3 4 5 6 7 8 9 10; do [ -s "$1" ] && break; sleep 0.3; done; sleep 1; }
gone_with_child() { setsid bash -c 'echo $$ > "$0"; (exec -a "$1" sleep 300) & exit 0' "$1" "$2" > /dev/null 2>&1 & wait $!; waitfile "$1"; }
kill_run() { # lib-file shadow-definition -> "<rc>|<stderr, one line>"
  local err rc
  err=$(bash -c ". $1; $2; p15_kill_run_harness $RR" 2>&1 >/dev/null); rc=$?
  echo "$rc|$(echo "$err" | tr '\n' ' ')"
}
mkpid() { mkdir -p $RD; rm -f $RD/*.pid; }
PSFAIL='ps() { return 1; }'

echo "# O2 N5b with the reason text asserted, and a mutant that must give the other text"
sed '/if \[ "\$ga" = 2 \]; then/,/^        fi$/d' ./p15_lib.sh > $T/p15_lib_mutant.sh
chk "O2 the mutant lib differs from the NEW lib and still parses" "$(cmp -s ./p15_lib.sh $T/p15_lib_mutant.sh && echo same || echo differs)/$(bash -n $T/p15_lib_mutant.sh && echo ok)" differs/ok
mkpid; gone_with_child $RD/harness_b.log.pid BilingHarness_p20
R=$(kill_run ./p15_lib.sh "$PSFAIL"); sleep 1
chk "O2 NEW: rc 1, child alive, and the reason is 'ps failed while looking for group'" "${R%%|*}/$(child_alive BilingHarness_p20)/$(echo "$R" | grep -c 'ps failed while looking for group')" 1/alive/1
reap $RD/harness_b.log.pid
mkpid; gone_with_child $RD/harness_b.log.pid BilingHarness_p20
R=$(kill_run $T/p15_lib_mutant.sh "$PSFAIL"); sleep 1
echo "mutant: $R"
chk "O2 MUTANT (no ga=2 branch): rc 1 again but the reason is the OTHER text, so the reason text tells the fix from its absence" "${R%%|*}/$(echo "$R" | grep -c 'ps failed while looking for group')/$(echo "$R" | grep -c "no member looks like this run's harness")" 1/0/1
reap $RD/harness_b.log.pid

echo "# O2 ps that fails only after the TERM (wait loop and post-KILL confirmation)"
mkpid; gone_with_child $RD/harness_c.log.pid BilingHarness_p20
PSAFTER="kill() { case \"\$1\" in -TERM) : > $T/psfail;; esac; builtin kill \"\$@\"; }; ps() { if [ -e $T/psfail ]; then return 1; fi; command ps \"\$@\"; }"
rm -f $T/psfail
R=$(kill_run ./p15_lib.sh "$PSAFTER"); sleep 1
echo "after-TERM: $R"
chk "O2 ps failing after the TERM: rc 1 and 'still alive (or unknown) after KILL'" "${R%%|*}/$(echo "$R" | grep -c 'still alive (or unknown) after KILL')" 1/1
reap $RD/harness_c.log.pid; rm -f $T/psfail

echo "# O6d an empty pid file and a letters-only pid file"
for kind in empty letters; do
  mkpid; case $kind in empty) : > $RD/harness_d.log.pid;; letters) printf 'abc\n' > $RD/harness_d.log.pid;; esac
  O=$(kill_run $BAK/p15_lib.sh ":"); N=$(kill_run ./p15_lib.sh ":")
  chk "O6d $kind pid file: OLD rc 0 (silent skip: the defect)" "${O%%|*}" 0
  chk "O6d $kind pid file: NEW rc 1 and the message 'is empty or holds no pid'" "${N%%|*}/$(echo "$N" | grep -c 'is empty or holds no pid')" 1/1
done
mkpid; echo 999999 > $RD/harness_d.log.pid
chk "O6d a pid that names no process and no group: OLD rc 0 / NEW rc 0" "$(kill_run $BAK/p15_lib.sh ':' | cut -d'|' -f1)/$(kill_run ./p15_lib.sh ':' | cut -d'|' -f1)" 0/0
mkpid
chk "O6d no pid file at all: OLD rc 0 / NEW rc 0" "$(kill_run $BAK/p15_lib.sh ':' | cut -d'|' -f1)/$(kill_run ./p15_lib.sh ':' | cut -d'|' -f1)" 0/0
rm -rf /opt/dr-benchmark/results/$RR

chk "database.xml on sik at the end" "$(XMLP)" "sik "
echo "P20-A-NC: PASS=$P FAIL=$F"
[ "$F" = "0" ]
