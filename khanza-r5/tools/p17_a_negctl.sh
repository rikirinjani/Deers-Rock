#!/bin/bash
# P17 safety controls (task doc s2 A). Run under the run lock on the box. OLD = the P16 bytes kept in
# <bak-p17> (copied before the P17 patch); OLD-P15 = <bak-p16> (the P15 suite, for A6b only).
#   A12 clone message      OLD prints a row count as the table count; NEW prints the real table count.
#   A3  confirmed death    a group leader that ignores TERM: OLD returns with it alive, NEW kills and confirms.
#   A4  sub-second identity a leader started 200 ms after its pid file: OLD signals it, NEW does not.
#   A3d driver cleanup     the real cleanup() of p14_edge_run.sh with the harness not confirmed dead:
#                          OLD restores xml / revokes / drops, NEW leaves everything and exits 3.
#   A1  xml restore        the real tail of p14_edge_run.sh with a failing restore: OLD exit 0, NEW exit 3.
#   A2  CREATE checked     p13_wide_sample.sh with a CREATE DATABASE that fails on an existing database:
#                          OLD's cleanup drops it, NEW exits 3 and leaves it.
#   A5  helper discipline  p15_a_negctl.sh run with an existing sik_p13w: OLD drops it, NEW refuses.
#   A6b real restore failure (R5_FAULT_RESTORE_FAIL): the P15 suite masks it (compensation), the P17 suite fails.
#   A7  snapshot binding   the binding block of p10_preservation_check.sh: OLD accepts newer-mtime snapshots
#                          of another run, NEW requires the sidecar to name this run's evidence file.
#   A9  full driver run    NEW bytes only: p14_edge_run.sh with R5_HARNESS_TIMEOUT_S=3 -> stop rule -> exit 1.
# Usage: DR_LOCK_SESSION=<id> bash p17_a_negctl.sh <bak-p17> <bak-p16> <fixture-dir> <visits-file>
set -u
cd /opt/Deers-Rock/tools
BAK=${1:?bak p17 dir}; BAK16=${2:?bak p16 dir (P15 suite)}; FXDIR=${3:?fixture dir}; VIS=${4:?visits file}
. ./dr_runlock.sh; dr_runlock_require p17_a_negctl.sh
. ./p15_lib.sh
export DBUTIL_FORCE_ROOT=1
SQL() { mysql -uroot -N -e "$1"; }
P=0; F=0
chk() { if [ "$2" = "$3" ]; then echo "PASS $1 (got $2)"; P=$((P+1)); else echo "FAIL $1 (got $2, want $3)"; F=$((F+1)); fi; }
T=$(mktemp -d)
for d in sik_p13w sik_p14e sik_p6f; do
  [ -n "$(SQL "SHOW DATABASES LIKE '$d'")" ] && { echo "ABORT: $d exists - refusing, nothing touched"; exit 3; }
done
RR=p17_kill_t; RD=/opt/dr-benchmark/results/$RR/B3
cleanup_all() {
  rm -rf /opt/dr-benchmark/results/$RR
  for d in sik_p13w sik_p6f; do SQL "REVOKE ALL PRIVILEGES ON \`$d\`.* FROM 'benchmark'@'localhost';" 2>/dev/null; SQL "DROP DATABASE IF EXISTS $d;"; done
  rm -rf "$T"
}
trap cleanup_all EXIT
XMLP() { python3 p6_dbxml.py probe 2>&1 | awk '{print $NF}' | sort -u | tr '\n' ' '; }
chk "precondition: database.xml on sik" "$(XMLP)" "sik "

echo "## A12 clone message (read-only)"
CNT=$(SQL "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='sik'")
OLDM=$(bash -c ". $BAK/p15_lib.sh; p15_clone_matches_sik sik" 2>&1); NEWM=$(bash -c ". ./p15_lib.sh; p15_clone_matches_sik sik" 2>&1)
echo "old: $OLDM"; echo "new: $NEWM"
chk "A12 OLD does not print the table count ($CNT) - the defect" "$(echo "$OLDM" | grep -c "tables=${CNT}-equal")" 0
chk "A12 NEW prints the table count" "$(echo "$NEWM" | grep -c "tables=${CNT} (= sik)")" 1

echo "## A3 a group leader that ignores TERM"
leader_ignoring_term() { # pidfile
  setsid bash -c 'trap "" TERM; echo $$ > "$0"; while :; do sleep 1; done' "$1" > /dev/null 2>&1 &
  for _ in 1 2 3 4 5 6 7 8 9 10; do [ -s "$1" ] && break; sleep 0.3; done; sleep 1
}
alive() { kill -0 "$(cat "$1")" 2>/dev/null && echo alive || echo dead; }
reap() { local p; p=$(cat "$1" 2>/dev/null); [ -n "$p" ] && { kill -KILL -- -"$p" 2>/dev/null; kill -KILL "$p" 2>/dev/null; }; rm -f "$1"; }
mkdir -p $RD
leader_ignoring_term $RD/harness_a.log.pid
bash -c ". $BAK/p15_lib.sh; p15_kill_run_harness $RR" 2>/dev/null; sleep 1
chk "A3 OLD: the leader that ignores TERM is still alive after the kill (the defect)" "$(alive $RD/harness_a.log.pid)" alive
reap $RD/harness_a.log.pid
leader_ignoring_term $RD/harness_a.log.pid
bash -c ". ./p15_lib.sh; p15_kill_run_harness $RR" 2>/dev/null; RC=$?
chk "A3 NEW: killed and confirmed (return code)" "$RC" 0
chk "A3 NEW: the leader is dead" "$(alive $RD/harness_a.log.pid)" dead
reap $RD/harness_a.log.pid

echo "## A4 a leader started 200 ms after its pid file"
plain_leader() { setsid bash -c 'echo $$ > "$0"; exec sleep 300' "$1" > /dev/null 2>&1 & for _ in 1 2 3 4 5 6 7 8 9 10; do [ -s "$1" ] && break; sleep 0.3; done; sleep 1; }
stamp_before_start() { # pidfile ms-before-start
  local pid st
  pid=$(cat "$1"); st=$(bash -c ". ./p15_lib.sh; p15_proc_start_ms $pid")
  touch -d "@$(awk -v m=$((st - $2)) 'BEGIN { printf "%.3f", m / 1000 }')" "$1"
}
plain_leader $RD/harness_b.log.pid; stamp_before_start $RD/harness_b.log.pid 200
bash -c ". $BAK/p15_lib.sh; p15_kill_run_harness $RR" 2>/dev/null; sleep 1
chk "A4 OLD signals it (whole-second slack, the defect)" "$(alive $RD/harness_b.log.pid)" dead
reap $RD/harness_b.log.pid
plain_leader $RD/harness_b.log.pid; stamp_before_start $RD/harness_b.log.pid 200
bash -c ". ./p15_lib.sh; p15_kill_run_harness $RR" 2>/dev/null; sleep 1
chk "A4 NEW does not signal it" "$(alive $RD/harness_b.log.pid)" alive
reap $RD/harness_b.log.pid
plain_leader $RD/harness_b.log.pid
bash -c ". ./p15_lib.sh; p15_kill_run_harness $RR" 2>/dev/null; sleep 1
chk "A4 NEW still kills a legitimate leader (pid file written after the start)" "$(alive $RD/harness_b.log.pid)" dead
reap $RD/harness_b.log.pid

echo "## A3d the real cleanup() of the P14 driver when the harness is not confirmed dead"
cl_test() { # driver-file -> "rc=<n> calls=<list>"
  local CL; CL=$(sed -n '/^cleanup() {/,/^}/p' "$1")
  : > $T/calls
  local rc
  bash -c "
res() { :; }
p17_dbxml() { echo \"dbxml \$1\" >> $T/calls; [ \"\$1\" = probe ] && echo '[dbxml] harness sik'; return 0; }
SQL() { echo \"SQL \$1\" | cut -c1-40 >> $T/calls; }
p15_kill_run_harness() { return 1; }
p15_grant_count() { echo 0; }
DBXML=p17_dbxml; RETARGETED=1; GRANTED=1; CREATED=1; KEEP=0; FX=sik_none; RIDS=r
$CL
cleanup" > /dev/null 2>&1; rc=$?
  echo "rc=$rc restore=$(grep -c 'dbxml restore' $T/calls) revoke=$(grep -c 'SQL REVOKE' $T/calls) drop=$(grep -c 'SQL DROP' $T/calls)"
}
O=$(cl_test $BAK/p14_edge_run.sh); N=$(cl_test p14_edge_run.sh); echo "old: $O"; echo "new: $N"
chk "A3d OLD goes on to restore, revoke and drop although the harness may be alive (the defect)" "$O" "rc=0 restore=1 revoke=1 drop=1"
chk "A3d NEW exits 3 and leaves xml, grant and clone as they are" "$N" "rc=3 restore=0 revoke=0 drop=0"

echo "## A1 the real tail of the P14 driver with a failing xml restore"
tail_test() { # driver-file restore-ok(yes|no)
  local TL; TL=$(sed -n '/^\$DBXML restore >> \/tmp\/p14e_dbxml.log/,$p' "$1")
  bash -c "
. ./p15_lib.sh
res() { :; }
p17_dbxml() { case \$1 in restore) [ '$2' = yes ] && return 0 || return 1;; probe) [ '$2' = yes ] && echo '[dbxml] harness sik' || echo '[dbxml] harness sik_p14e';; esac; }
DBXML=p17_dbxml; RETARGETED=1; FX=sik_none; OUT=/dev/null; KEEP=0; FIX_RC=4; REAL_RC=0
$TL" > /dev/null 2>&1; echo $?
}
chk "A1 OLD exits 0 although database.xml was not restored (the defect)" "$(tail_test $BAK/p14_edge_run.sh no)" 0
chk "A1 NEW exits 3" "$(tail_test p14_edge_run.sh no)" 3
chk "A1 NEW exits 0 when the restore succeeded" "$(tail_test p14_edge_run.sh yes)" 0
chk "A1 OLD exits 0 when the restore succeeded" "$(tail_test $BAK/p14_edge_run.sh yes)" 0

echo "## A2 p13_wide_sample.sh: CREATE DATABASE that fails on an existing database"
REALMYSQL=$(command -v mysql)
mkdir -p $T/shim
cat > $T/shim/mysql <<SHIM
#!/bin/bash
for a in "\$@"; do case "\$a" in *"SHOW DATABASES LIKE 'sik_p13w'"*) exit 0;; esac; done
exec $REALMYSQL "\$@"
SHIM
printf '#!/bin/bash\necho "CREATE TABLE p17_partial (a INT);"\nexit 2\n' > $T/shim/mysqldump
chmod +x $T/shim/mysql $T/shim/mysqldump
sentinel() { SQL "CREATE DATABASE sik_p13w; CREATE TABLE sik_p13w.p17_sentinel (x INT); INSERT INTO sik_p13w.p17_sentinel VALUES (9);"; }
sentinel_n() { SQL "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='sik_p13w' AND table_name='p17_sentinel'"; }
sentinel
PATH=$T/shim:$PATH bash $BAK/p13_wide_sample.sh A2OLD "$VIS" > $T/p13old.log 2>&1; RC=$?
echo "old exit=$RC sentinel=$(sentinel_n)"
chk "A2 OLD: its cleanup dropped a database it did not create (the defect)" "$(sentinel_n)" 0
SQL "DROP DATABASE IF EXISTS sik_p13w;"
sentinel
PATH=$T/shim:$PATH bash p13_wide_sample.sh A2NEW "$VIS" > $T/p13new.log 2>&1; RC=$?
grep -a "ABORT" $T/p13new.log | head -2
chk "A2 NEW: exit 3" "$RC" 3
chk "A2 NEW: the existing database survives" "$(sentinel_n)" 1
SQL "DROP DATABASE IF EXISTS sik_p13w;"

echo "## A5 the P15 safety helper with an existing sik_p13w"
sentinel
bash $BAK/p15_a_negctl.sh /nonexistent /nonexistent /nonexistent > $T/a5old.log 2>&1
chk "A5 OLD helper dropped an existing database (the defect)" "$(sentinel_n)" 0
sentinel
bash p15_a_negctl.sh /nonexistent /nonexistent /nonexistent > $T/a5new.log 2>&1; RC=$?
chk "A5 NEW helper refuses (exit 3)" "$RC" 3
chk "A5 NEW helper leaves the existing database" "$(sentinel_n)" 1
SQL "DROP DATABASE IF EXISTS sik_p13w;"

echo "## A7 snapshot binding block of p10_preservation_check.sh"
blk() { awk 'index($0,"python3 - \"$EV\" \"$PREOP\" \"$PRE\"")==1 {p=1} p {print} p && index($0,"snapshots not bound to this run")>0 {exit}' "$1"; }
bind_test() { # script sidecar-mode(none|other|ours)
  local EVN=$T/r5_p6_acceptance_20261026T000000Z.md
  echo "{}" > $T/preop.json; echo "{}" > $T/pre.json; touch $EVN $T/preop.json $T/pre.json
  rm -f $T/preop.json.run $T/pre.json.run
  case "$2" in other) echo "r5_p6_acceptance_20250101T000000Z.md" | tee $T/preop.json.run > $T/pre.json.run;; ours) basename $EVN | tee $T/preop.json.run > $T/pre.json.run;; esac
  local BL; BL=$(blk "$1")
  bash -c "EV=$EVN; PREOP=$T/preop.json; PRE=$T/pre.json; OUT=/dev/null
$BL
echo REACHED" 2>&1 | tr '\n' ' '
}
chk "A7 binding block extracted from both scripts" "$([ -n "$(blk $BAK/p10_preservation_check.sh)" ] && [ -n "$(blk p10_preservation_check.sh)" ] && echo yes || echo no)" yes
R=$(bind_test $BAK/p10_preservation_check.sh other); echo "old/other-run sidecar: $R"
chk "A7 OLD accepts snapshots of another run when the mtime is newer (the defect)" "$(echo "$R" | grep -c 'written by this run.*REACHED')" 1
R=$(bind_test p10_preservation_check.sh other); echo "new/other-run sidecar: $R"
chk "A7 NEW rejects a sidecar naming another run" "$(echo "$R" | grep -c 'SNAPSHOT-BINDING ERROR.*written by')" 1
chk "A7 NEW does not reach the next statement" "$(echo "$R" | grep -c REACHED)" 0
R=$(bind_test p10_preservation_check.sh none); chk "A7 NEW rejects snapshots without a sidecar" "$(echo "$R" | grep -c 'no sidecar')" 1
R=$(bind_test p10_preservation_check.sh ours); echo "new/our sidecar: $R"
chk "A7 NEW accepts snapshots whose sidecar names this run" "$(echo "$R" | grep -c 'written by this run.*REACHED')" 1

echo "## A6b a real restore failure (R5_FAULT_RESTORE_FAIL=1), A28' via the suite (P11_ONLY=28)"
eval "$(sed -n '/^nc_status_e() {/,/^}/p;/^ev_of() {/,/^}/p;/^teardown_fx() {/,/^}/p;/^ensure_fx() {/,/^}/p' p11_negative_controls.sh)"
FX=sik_p6f; PC=/opt/dr-benchmark/p-chain
run28() { # suite-copy
  teardown_fx; ensure_fx || { echo "ABORT: cannot build fixture"; exit 3; }
  env P11_ONLY=28 R5_FAULT_RESTORE_FAIL=1 bash "$1" > $T/run28.log 2>&1
  ev_of $T/run28.log
}
cp "$BAK16/p6_acceptance_suite.sh" $T/suite_p15.sh; cp p6_acceptance_suite.sh $T/suite_p17.sh
EVO=$(run28 $T/suite_p15.sh); grep -a "^A28" "$EVO" | cut -c1-140
chk "A6b OLD (P15 suite): A28' PASSES although the restore failed - masked by the unconditional compensation (the defect)" "$(nc_status_e "$EVO" 28)" PASS
chk "A6b OLD: the failure was injected" "$(grep -ac "A28' restore=restore-not-verified" "$EVO")" 1
EVN=$(run28 $T/suite_p17.sh); grep -a "^A28" "$EVN" | cut -c1-140
chk "A6b NEW: A28' FAILS" "$(nc_status_e "$EVN" 28)" FAIL
teardown_fx

echo "## A9 full driver run with an injected failure (NEW bytes only): R5_HARNESS_TIMEOUT_S=3"
R5_HARNESS_TIMEOUT_S=3 bash p14_edge_run.sh "$FXDIR" > $T/a9.log 2>&1; RC=$?
grep -aE "STOP RULE|FORM-INCOMPLETE|oracle\[|form\[|P15E|ABORT|cleanup" $T/a9.log | cut -c1-170
chk "A9 the driver exits 1" "$RC" 1
chk "A9 a STOP RULE or FORM-INCOMPLETE line" "$([ "$(grep -acE 'STOP RULE|FORM-INCOMPLETE' $T/a9.log)" -ge 1 ] && echo yes || echo no)" yes
chk "A9 database.xml back on sik" "$(XMLP)" "sik "
chk "A9 no grant left on the clone" "$(p15_grant_count sik_p14e)" 0
chk "A9 the clone is kept for inspection" "$(SQL "SHOW DATABASES LIKE 'sik_p14e'")" sik_p14e
cp $T/a9.log /opt/dr-benchmark/p17/chain/a9_driver.log 2>/dev/null
bash p14_drop_clone.sh sik_p14e > /dev/null 2>&1
chk "A9 clone dropped by p14_drop_clone.sh" "$(SQL "SHOW DATABASES LIKE 'sik_p14e'" | wc -l)" 0
chk "database.xml on sik at the end" "$(XMLP)" "sik "
echo "P17-A-NC: PASS=$P FAIL=$F"
[ "$F" = "0" ]
