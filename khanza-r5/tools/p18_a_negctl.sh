#!/bin/bash
# P18 safety and recovery controls (task doc s2 B1, B2, B3, B5, B6). Run under the run lock on the box.
# OLD = the P17 bytes kept in <bak-p18>; OLD-P16 = <bak-p17> (the P16 suite); OLD-P15 = <bak-p16> (the P15 suite).
#   B1 (M2)  the A30 snapshot step of the suite   a failing p10_hash_state.py: OLD records exit 0 and still
#                                                 writes the sidecar, NEW records the failing exit and writes none.
#   B2 (M3)  p15_kill_run_harness                 (a) leader gone, harness child alive: OLD returns 0 with the child
#                                                 alive, NEW kills it; (b) live leader with an unreadable start time:
#                                                 OLD returns 0, NEW returns 1; (c) leader gone, a live group that is
#                                                 not the harness: OLD 0, NEW 1 and nothing signalled; (d) group
#                                                 liveness of a setpgid group inside a larger session: OLD wrong.
#   B3 (M4)  the P13 driver's tail                restore failure and an incomplete form: OLD goes on, NEW stops.
#   B5 (M8)  A6 and A6b                           the restore clause of A28'/A31' alone (predicate extracted, hashes
#                                                 held equal), then the same through the real suites.
#   B6 (M5)  A8                                   the drift hook's own log line from a real P11_ONLY=31 suite run.
# Usage: DR_LOCK_SESSION=<id> bash p18_a_negctl.sh <bak-p18> <bak-p17> <bak-p16> <fixture-dir> <visits-file>
set -u
cd /opt/Deers-Rock/tools
BAK=${1:?bak p18 dir}; BAK17=${2:?bak p17 dir (P16 suite)}; BAK16=${3:?bak p16 dir (P15 suite)}
FXDIR=${4:?fixture dir}; VIS=${5:?visits file}
. ./dr_runlock.sh; dr_runlock_require p18_a_negctl.sh
. ./p15_lib.sh
export DBUTIL_FORCE_ROOT=1
SQL() { mysql -uroot -N -e "$1"; }
P=0; F=0
chk() { if [ "$2" = "$3" ]; then echo "PASS $1 (got $2)"; P=$((P+1)); else echo "FAIL $1 (got $2, want $3)"; F=$((F+1)); fi; }
T=$(mktemp -d)
for d in sik_p13w sik_p14e sik_p6f; do
  [ -n "$(SQL "SHOW DATABASES LIKE '$d'")" ] && { echo "ABORT: $d exists - refusing, nothing touched"; exit 3; }
done
RR=p18_kill_t; RD=/opt/dr-benchmark/results/$RR/B3
cleanup_all() {
  pkill -KILL -f 'BilingHarness_p18|other_p18' 2>/dev/null
  rm -rf /opt/dr-benchmark/results/$RR
  for d in sik_p13w sik_p6f; do SQL "REVOKE ALL PRIVILEGES ON \`$d\`.* FROM 'benchmark'@'localhost';" 2>/dev/null; SQL "DROP DATABASE IF EXISTS $d;"; done
  rm -rf "$T"
}
trap cleanup_all EXIT
XMLP() { python3 p6_dbxml.py probe 2>&1 | awk '{print $NF}' | sort -u | tr '\n' ' '; }
chk "precondition: database.xml on sik" "$(XMLP)" "sik "

echo "## A12 (M10) the clone message: P16 printed a row count as the table count, P17/P18 the table count (the text is asserted)"
CNT=$(SQL "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='sik'")
OLDM=$(bash -c ". $BAK17/p15_lib.sh; p15_clone_matches_sik sik" 2>&1); NEWM=$(bash -c ". ./p15_lib.sh; p15_clone_matches_sik sik" 2>&1)
echo "old (P16): $OLDM"; echo "new: $NEWM"
chk "A12 OLD-P16 prints a tables= figure that is not the real count ($CNT) (the defect)" "$(echo "$OLDM" | grep -c 'tables=[0-9]')/$(echo "$OLDM" | grep -c "tables=${CNT}")" 1/0
chk "A12 NEW prints tables=$CNT (= sik)" "$(echo "$NEWM" | grep -c "tables=${CNT} (= sik)")" 1

echo "## B1 the A30 snapshot step of the suite: p10_hash_state.py fails"
A30SRC() { sed -n '/p10_hash_state.py.*p10_preserve_pre.json 2>/,/^   cp \/tmp\/r6_two.txt/p' "$1" | grep -v '^   cp /tmp/r6_two' | sed "s#/opt/dr-benchmark/p-chain/#$T/chain/#g;s#/tmp/r6_#$T/r6_#g"; }
a30_test() { # suite hash-exit-code
  local BL; BL=$(A30SRC "$1"); mkdir -p $T/chain; rm -f $T/chain/*
  bash -c "python3() { return $2; }; FX=x; PREOP_RC=0; OUT=$T/evidence.md
$BL
echo \"RCH=\$RCH pre.run=\$([ -e $T/chain/p10_preserve_pre.json.run ] && echo yes || echo no) preop.run=\$([ -e $T/chain/p11_preserve_preop.json.run ] && echo yes || echo no)\"" 2>&1 | tail -1
}
chk "B1 the A30 step is extracted from both suites" "$([ "$(A30SRC $BAK/p6_acceptance_suite.sh | grep -c RCH=)" = 1 ] && [ "$(A30SRC p6_acceptance_suite.sh | grep -c RCH=)" = 1 ] && echo yes || echo no)" yes
O=$(a30_test $BAK/p6_acceptance_suite.sh 1); N=$(a30_test p6_acceptance_suite.sh 1); echo "old (hash step exits 1): $O"; echo "new (hash step exits 1): $N"
chk "B1 OLD: a failing hash step is recorded as exit 0 and its sidecar is written (the defect)" "$O" "RCH=0 pre.run=yes preop.run=yes"
chk "B1 NEW: the failing exit is recorded and that sidecar is not written" "$N" "RCH=1 pre.run=no preop.run=yes"
chk "B1 OLD: a succeeding hash step" "$(a30_test $BAK/p6_acceptance_suite.sh 0)" "RCH=0 pre.run=yes preop.run=yes"
chk "B1 NEW: a succeeding hash step" "$(a30_test p6_acceptance_suite.sh 0)" "RCH=0 pre.run=yes preop.run=yes"

echo "## B2 p15_kill_run_harness"
alive() { kill -0 "$(cat "$1")" 2>/dev/null && echo alive || echo dead; }
reap() { local p; p=$(cat "$1" 2>/dev/null); [ -n "$p" ] && { kill -KILL -- -"$p" 2>/dev/null; kill -KILL "$p" 2>/dev/null; }; rm -f "$1"; pkill -KILL -f 'BilingHarness_p18|other_p18' 2>/dev/null; }
waitfile() { for _ in 1 2 3 4 5 6 7 8 9 10; do [ -s "$1" ] && break; sleep 0.3; done; sleep 1; }
gone_with_child() { # pidfile child-argv0 : the leader exits (and is reaped), one member of its group lives on
  setsid bash -c 'echo $$ > "$0"; (exec -a "$1" sleep 300) & exit 0' "$1" "$2" > /dev/null 2>&1 &
  wait $!; waitfile "$1"
}
child_alive() { pgrep -f "$1" > /dev/null && echo alive || echo dead; }
plain_leader() { setsid bash -c 'echo $$ > "$0"; exec sleep 300' "$1" > /dev/null 2>&1 & waitfile "$1"; }
mkdir -p $RD
kill_rc() { # lib-dir [pre-command]  -> return code of the kill function, stderr dropped
  bash -c ". $1/p15_lib.sh; ${2:-:}; p15_kill_run_harness $RR" 2>/dev/null; echo $?
}
mkpid() { mkdir -p $RD; rm -f $RD/*.pid; }

echo "# B2a the recorded leader is gone, a harness child (BilingHarness in its command line) is alive"
mkpid; gone_with_child $RD/harness_a.log.pid BilingHarness_p18
chk "B2a precondition: the leader is gone and the child lives" "$(alive $RD/harness_a.log.pid)/$(child_alive BilingHarness_p18)" dead/alive
RC=$(kill_rc "$BAK" ""); sleep 1
chk "B2a OLD returns 0 with the harness child still alive (the defect)" "$RC/$(child_alive BilingHarness_p18)" 0/alive
reap $RD/harness_a.log.pid
mkpid; gone_with_child $RD/harness_a.log.pid BilingHarness_p18
RC=$(kill_rc "." ""); sleep 1
chk "B2a NEW signals the group, kills and confirms (return code, child dead)" "$RC/$(child_alive BilingHarness_p18)" 0/dead
reap $RD/harness_a.log.pid

echo "# B2b a live leader whose start time is unreadable"
mkpid; plain_leader $RD/harness_b.log.pid
RC=$(kill_rc "$BAK" "p15_proc_start_ms() { return 1; }")
chk "B2b OLD returns 0 and does not signal (the defect: success without confirmation)" "$RC/$(alive $RD/harness_b.log.pid)" 0/alive
reap $RD/harness_b.log.pid
mkpid; plain_leader $RD/harness_b.log.pid
RC=$(kill_rc "." "p15_proc_start_ms() { return 1; }")
chk "B2b NEW returns 1 (not confirmed) and does not signal an unverifiable leader" "$RC/$(alive $RD/harness_b.log.pid)" 1/alive
reap $RD/harness_b.log.pid

echo "# B2c the leader is gone and the live group is not the harness"
mkpid; gone_with_child $RD/harness_c.log.pid other_p18
RC=$(kill_rc "$BAK" ""); sleep 1
chk "B2c OLD returns 0, child alive (nothing to see: it skips a dead leader)" "$RC/$(child_alive other_p18)" 0/alive
reap $RD/harness_c.log.pid
mkpid; gone_with_child $RD/harness_c.log.pid other_p18
RC=$(kill_rc "." ""); sleep 1
chk "B2c NEW returns 1 and signals nothing (no member looks like the harness)" "$RC/$(child_alive other_p18)" 1/alive
reap $RD/harness_c.log.pid
mkpid; echo 999999 > $RD/harness_d.log.pid
chk "B2c NEW: a recorded pid with no process and no group is a no-op (return 0)" "$(kill_rc "." "")" 0
rm -f $RD/harness_d.log.pid

echo "# B2d group liveness of a setpgid group inside a larger session (ps -g selects by session id)"
gl_test() { bash -c "set -m; sleep 120 & J=\$!; . $1/p15_lib.sh; p15_group_alive \$J && echo alive || echo notalive; kill -KILL \$J 2>/dev/null" 2>/dev/null; }
chk "B2d OLD p15_group_alive misses a live setpgid group (the defect)" "$(gl_test $BAK)" notalive
chk "B2d NEW p15_group_alive sees it" "$(gl_test .)" alive
rm -rf /opt/dr-benchmark/results/$RR

echo "## B3 the tail of p13_wide_sample.sh (from the harness-log counts to the result copy)"
tl() { sed -n '/^RUNID_HARNESS_DIR=/,/^# Copy the oracle result files/p' "$1" | sed '$d'; }
printf 'v1\nv2\nv3\n' > $T/vis3.txt
tail_test() { # driver-file true-count false-count restore-ok(yes|no) -> "rc=<n> reached=<yes|no>"
  local TL; TL=$(tl "$1"); local out rc
  out=$(bash -c "
. ./p15_lib.sh
res() { :; }
p15_count_sukses() { [ \"\$2\" = true ] && echo $2 || echo $3; }
p18_dbxml() { case \$1 in restore) [ '$4' = yes ] && return 0 || return 1;; probe) [ '$4' = yes ] && echo '[dbxml] harness sik' || echo '[dbxml] harness sik_p13w';; esac; }
DBXML=p18_dbxml; RETARGETED=1; FX=sik_none; RUN_ID=x; VISITS=$T/vis3.txt; ORACLE_RC=0; OUT=/dev/null
$TL
echo REACHED-COPY" 2>/dev/null); rc=$?
  echo "rc=$rc reached=$(echo "$out" | grep -c REACHED-COPY | sed 's/1/yes/;s/0/no/')"
}
chk "B3 the tails are extracted from both drivers" "$([ -n "$(tl $BAK/p13_wide_sample.sh)" ] && [ -n "$(tl p13_wide_sample.sh)" ] && echo yes || echo no)" yes
O=$(tail_test $BAK/p13_wide_sample.sh 3 0 no); N=$(tail_test p13_wide_sample.sh 3 0 no); echo "restore fails, form complete: old: $O  new: $N"
chk "B3 OLD goes on although database.xml was not restored (the defect)" "$O" "rc=0 reached=yes"
chk "B3 NEW exits 3 and does not go on" "$N" "rc=3 reached=no"
O=$(tail_test $BAK/p13_wide_sample.sh 0 0 yes); N=$(tail_test p13_wide_sample.sh 0 0 yes); echo "no sukses lines at all: old: $O  new: $N"
chk "B3 OLD goes on with 0 of 3 visits confirmed (the defect, A13 class)" "$O" "rc=0 reached=yes"
chk "B3 NEW stops (FORM-INCOMPLETE, exit 1)" "$N" "rc=1 reached=no"
O=$(tail_test $BAK/p13_wide_sample.sh 2 1 yes); N=$(tail_test p13_wide_sample.sh 2 1 yes); echo "stop rule (1 of 3 false): old: $O  new: $N"
chk "B3 stop rule: OLD exits 1" "$O" "rc=1 reached=no"
chk "B3 stop rule: NEW exits 1" "$N" "rc=1 reached=no"
chk "B3 clean case: OLD reaches the copy" "$(tail_test $BAK/p13_wide_sample.sh 3 0 yes)" "rc=0 reached=yes"
chk "B3 clean case: NEW reaches the copy" "$(tail_test p13_wide_sample.sh 3 0 yes)" "rc=0 reached=yes"

echo "## B5 A6/A6b: the restore clause of A28' and A31' alone (predicate extracted, hashes and checksums held equal)"
pred() { # suite-file check-number: the $( ... ) test expression of the primed check, as bash text
  grep -a "^ *check $2 \"A$2' " "$1" | sed 's/^.*FAILS" //; s/   # P1.*$//'
}
# the predicate is  [ ... ] && ... && echo 0 || echo 1 : run it and read what it prints
p28() { local E; E=$(pred "$1" 28 | sed 's/^\$(//; s/)$//'); bash -c "C0P=a; C1P=a; H28PRE=h; H28POST=h; R28='$2'; $E" 2>/dev/null; }
p31() { local E; E=$(pred "$1" 31 | sed 's/^\$(//; s/)$//'); bash -c "HSTAGE=h; STORED=h; HLIVE=h; R31='$2'; $E" 2>/dev/null; }
chk "B5 the A28' predicate is extracted from the P15, P16 and current suites" "$(for s in $BAK16 $BAK17 .; do pred $s/p6_acceptance_suite.sh 28 | grep -c 'echo 0 || echo 1'; done | tr '\n' ' ')" "1 1 1 "
chk "B5 A6c OLD-P15: A28' passes with R28=restore-not-verified, hashes equal (no restore clause)" "$(p28 $BAK16/p6_acceptance_suite.sh restore-not-verified)" 0
chk "B5 A6c NEW: A28' fails on the restore clause alone" "$(p28 p6_acceptance_suite.sh restore-not-verified)" 1
chk "B5 A6c NEW: A28' passes with R28=restored (the clause is the only difference)" "$(p28 p6_acceptance_suite.sh restored)" 0
chk "B5 A6 OLD-P16: A31' passes with R31=restore-not-verified, hashes equal (no restore clause)" "$(p31 $BAK17/p6_acceptance_suite.sh restore-not-verified)" 0
chk "B5 A6 NEW: A31' fails on the restore clause alone" "$(p31 p6_acceptance_suite.sh restore-not-verified)" 1
chk "B5 A6 NEW: A31' passes with R31=restored" "$(p31 p6_acceptance_suite.sh restored)" 0

echo "## B5/B6 the same through the real suites (P11_ONLY=31): a restore failure, then the drift hook's own log line"
eval "$(sed -n '/^nc_status_e() {/,/^}/p;/^ev_of() {/,/^}/p;/^teardown_fx() {/,/^}/p;/^ensure_fx() {/,/^}/p' p11_negative_controls.sh)"
FX=sik_p6f; PC=/opt/dr-benchmark/p-chain
run31() { # suite-copy env...
  local S=$1; shift
  teardown_fx; ensure_fx || { echo "ABORT: cannot build fixture"; exit 3; }
  env P11_ONLY=31 "$@" bash "$S" > $T/run31.log 2>&1
}
cp "$BAK17/p6_acceptance_suite.sh" $T/suite_p16.sh; cp p6_acceptance_suite.sh $T/suite_p18.sh
run31 $T/suite_p16.sh R5_FAULT_RESTORE_FAIL=1; cp $T/run31.log $T/old31.log; EVO=$(ev_of $T/run31.log); grep -a "^A31" "$EVO" | cut -c1-120
chk "B5 A6 through the suite: OLD-P16 A31' passes although the restore failed (the defect)" "$(nc_status_e "$EVO" 31)" PASS
run31 $T/suite_p18.sh R5_FAULT_RESTORE_FAIL=1; cp $T/run31.log $T/new31.log; EVN=$(ev_of $T/run31.log); grep -a "^A31" "$EVN" | cut -c1-120; grep -a "A31' restore=" "$EVN" | cut -c1-120
chk "B5 A6 through the suite: NEW A31' fails" "$(nc_status_e "$EVN" 31)" FAIL
chk "B5 the restore failure was injected in both runs: OLD-P16's oracle log carries the FAULT line (its A31' ignores the result), NEW's evidence carries restore=restore-not-verified" "$(grep -ac 'STAGE-RESTORE FAULT: R5_FAULT_RESTORE_FAIL=1' $T/old31.log)/$(grep -ac "A31' restore=restore-not-verified" "$EVN")" 1/1
run31 $T/suite_p18.sh; EVC=$(ev_of $T/run31.log)
grep -a "stage-hash FAULT" $T/run31.log | cut -c1-200 | tee /opt/dr-benchmark/p18/chain/a8_drift_hook_line.txt
chk "B6 A8: the drift hook logged that ALL billing rows of the visit were drifted (its own line)" "$(grep -ac 'stage-hash FAULT: ALL [0-9]* billing rows of .* drifted by +1' $T/run31.log)" 1
chk "B6 A8: the hook did not log a failure" "$(grep -ac 'drift UPDATE failed' $T/run31.log)" 0
chk "B6 A8: the clean run of A31' passes" "$(nc_status_e "$EVC" 31)" PASS
teardown_fx
echo "## B4 (M7) a full driver run in which ONE visit's save really fails: the stop rule fires (driver bytes unchanged since P17: no OLD arm)"
BV=$(sed -n 5p "$FXDIR/p14_edge_visits.txt")
chk "B4 a fixture visit selected" "$([ -n "$BV" ] && echo yes || echo no)" yes
( for _ in $(seq 1 12000); do
    grep -aq 'oracle\[fixture\]: run start' $T/b4.log 2>/dev/null && break; sleep 0.1   # after the consumer baseline, which saves every fixture visit once
  done
  printf 'DELIMITER //
CREATE TRIGGER sik_p14e.p18_block BEFORE INSERT ON sik_p14e.nota_jalan FOR EACH ROW BEGIN IF NEW.no_rawat='"'"'%s'"'"' THEN SIGNAL SQLSTATE '"'"'45000'"'"' SET MESSAGE_TEXT='"'"'p18 injected save failure'"'"'; END IF; END//
' "$BV" | mysql -uroot ) &
POLL=$!
bash p14_edge_run.sh "$FXDIR" > $T/b4.log 2>&1; RC=$?
wait $POLL 2>/dev/null
grep -aE "STOP RULE|FORM-INCOMPLETE|oracle\[|form\[|P15E|ABORT|cleanup" $T/b4.log | cut -c1-170
chk "B4 the injected trigger exists in the clone" "$(SQL "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema='sik_p14e' AND trigger_name='p18_block'")" 1
chk "B4 exactly one visit logged sukses=false (a real form failure)" "$(grep -ac 'form\[fixture\]: distinct visits sukses=true [0-9]*, sukses=false 1 ' $T/b4.log)" 1
chk "B4 the STOP RULE line (not FORM-INCOMPLETE)" "$(grep -ac 'STOP RULE\[fixture\]: 1/27 sukses=false' $T/b4.log)/$(grep -ac 'FORM-INCOMPLETE' $T/b4.log)" 1/0
chk "B4 the driver exits 1" "$RC" 1
chk "B4 database.xml back on sik" "$(XMLP)" "sik "
chk "B4 no grant left on the clone" "$(p15_grant_count sik_p14e)" 0
chk "B4 the clone is kept for inspection" "$(SQL "SHOW DATABASES LIKE 'sik_p14e'")" sik_p14e
mkdir -p /opt/dr-benchmark/p18/chain; cp $T/b4.log /opt/dr-benchmark/p18/chain/b4_stop_rule_driver.log
bash p14_drop_clone.sh sik_p14e > /dev/null 2>&1
chk "B4 clone dropped by p14_drop_clone.sh" "$(SQL "SHOW DATABASES LIKE 'sik_p14e'" | wc -l)" 0
chk "database.xml on sik at the end" "$(XMLP)" "sik "
echo "P18-A-NC: PASS=$P FAIL=$F"
[ "$F" = "0" ]
