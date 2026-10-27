#!/bin/bash
# P19 safety controls (task doc s2 B2, B3). Run under the run lock on the box. OLD = the P18 bytes kept in <bak-p19>.
#   N3 (B2)  oracle_run of the P14 driver, extracted from the OLD and the NEW driver and run with the oracle replaced
#            by a shell function (a function shadows the external `env`): a log that shows a FAILED batch while every
#            visit logged sukses=true. OLD returns 4 (the value the driver treats as expected, then "P15E OK"), NEW
#            returns 10. A clean log returns 4 in both arms. The helper is also run on the real logs of P18.
#   N5 (B3)  p15_kill_run_harness / p15_group_alive with a shadowing `ps`:
#            (a) a live leader whose `ps -o pgid= -p` returns nothing, harness command line: OLD rc 0 and alive
#                ("not a leader"), NEW kills it;
#            (b) a dead leader with a live harness child and a `ps` that fails: OLD rc 0, child alive; NEW rc 1,
#                child alive (not confirmed);
#            (c) p15_group_alive with a failing `ps`: OLD 1 (dead), NEW 2 (unknown);
#            (d) the cases of P18 B2 are re-run unchanged by p18_a_negctl.sh (history).
# Usage: DR_LOCK_SESSION=<id> bash p19_a_negctl.sh <bak-p19 (P18 bytes)>
set -u
cd /opt/Deers-Rock/tools
BAK=${1:?bak p19 dir (P18 bytes)}
. ./dr_runlock.sh; dr_runlock_require p19_a_negctl.sh
. ./p15_lib.sh
export DBUTIL_FORCE_ROOT=1
SQL() { mysql -uroot -N -e "$1"; }
P=0; F=0
chk() { if [ "$2" = "$3" ]; then echo "PASS $1 (got $2)"; P=$((P+1)); else echo "FAIL $1 (got $2, want $3)"; F=$((F+1)); fi; }
T=$(mktemp -d)
RR=p19_kill_t; RD=/opt/dr-benchmark/results/$RR/B3
cleanup_all() { pkill -KILL -f 'BilingHarness_p19|other_p19' 2>/dev/null; rm -rf /opt/dr-benchmark/results/$RR /tmp/p15e_p19t.log; rm -rf "$T"; }
trap cleanup_all EXIT
XMLP() { python3 p6_dbxml.py probe 2>&1 | awk '{print $NF}' | sort -u | tr '\n' ' '; }
chk "precondition: database.xml on sik" "$(XMLP)" "sik "

echo "## N3 oracle_run: a FAILED batch with every visit sukses=true"
printf '2027/12/31/900001\n2027/12/31/900002\n2027/12/31/900003\n' > $T/vis3.txt
cat > $T/canned_failed.log <<'LOG'
[01:38:36] ALLOW-STRATA (B3): 9 provided visits OUT-OF-ENVELOPE (not eligible under the aligned cohort predicate)
[01:40:36] STAGE-RESTORE-ERROR r5_stage_B3_x_*: RuntimeError: mysql rc=1: ERROR 1644 (45000) at line 1: injected (NOT restored; stage tables kept for resume)
[01:40:36] date 2027-12-31: FAILED (sukses=false for 0/3 visits) - pre-reset state NOT restored (unverified/mismatch/error; stage tables kept), run stops (P5-2)
LOG
cat > $T/canned_clean.log <<'LOG'
[01:38:36] ALLOW-STRATA (B3): 9 provided visits OUT-OF-ENVELOPE (not eligible under the aligned cohort predicate)
[01:38:38] reset 27 visits (output cleared, status_bayar=Belum Bayar)
[01:40:40] date 2027-12-31: BILLED (restored)
LOG
od_test() { # driver-file canned-log -> "rc=<n>"
  local FN; FN=$(sed -n '/^oracle_run() {/,/^}/p' "$1")
  rm -f /tmp/p15e_p19t.log
  bash -c "
. ./p15_lib.sh
res() { :; }
env() { case \"\$*\" in *--freeze-only*) return 0;; *) cat '$2'; return 4;; esac; }
p15_count_sukses() { [ \"\$2\" = true ] && echo 3 || echo 0; }
SQL() { echo '2027-10-27 00:00:00.000000'; }
TS=p19; RUNDIR=$T/run; mkdir -p \$RUNDIR; OUT=/dev/null; RIDS=; FX=sik_none
$FN
oracle_run p19t $T/vis3.txt ''
echo RC=\$?" 2>/dev/null | tail -1
}
chk "N3 the oracle_run function is extracted from both drivers" "$([ -n "$(sed -n '/^oracle_run() {/,/^}/p' $BAK/p14_edge_run.sh)" ] && [ -n "$(sed -n '/^oracle_run() {/,/^}/p' p14_edge_run.sh)" ] && echo yes || echo no)" yes
O=$(od_test $BAK/p14_edge_run.sh $T/canned_failed.log); N=$(od_test p14_edge_run.sh $T/canned_failed.log); echo "failed log, all visits true: old: $O  new: $N"
chk "N3 OLD returns 4 for a FAILED batch with every visit sukses=true (the value treated as expected: the defect)" "$O" "RC=4"
chk "N3 NEW returns 10 (ORACLE-BATCH-FAILED)" "$N" "RC=10"
chk "N3 clean log: OLD returns 4" "$(od_test $BAK/p14_edge_run.sh $T/canned_clean.log)" "RC=4"
chk "N3 clean log: NEW returns 4" "$(od_test p14_edge_run.sh $T/canned_clean.log)" "RC=4"
chk "N3 the NEW driver prints the ORACLE-BATCH-FAILED line" "$(bash -c ". ./p15_lib.sh; res() { echo \"\$1\"; }; $(sed -n '/^oracle_run() {/,/^}/p' p14_edge_run.sh)
env() { case \"\$*\" in *--freeze-only*) return 0;; *) cat '$T/canned_failed.log'; return 4;; esac; }
p15_count_sukses() { [ \"\$2\" = true ] && echo 3 || echo 0; }
SQL() { echo x; }; TS=p19; RUNDIR=$T/run2; mkdir -p \$RUNDIR; OUT=/dev/null; RIDS=; FX=sik_none
oracle_run p19t $T/vis3.txt ''" 2>/dev/null | grep -c 'ORACLE-BATCH-FAILED\[p19t\]')" 1
echo "# the helper on the real P18 logs"
B4=/opt/dr-benchmark/p18/chain/b4_stop_rule_driver.log; C4=/opt/dr-benchmark/p18/chain/c4_driver.log
chk "N3 helper matches the real B4 log (a FAILED batch and a restore error)" "$(p15_oracle_batch_failed $B4 && echo match || echo none)" match
chk "N3 helper does not match the real clean C4 log" "$(p15_oracle_batch_failed $C4 && echo match || echo none)" none

echo "## N5 p15_kill_run_harness with a shadowing ps"
alive() { kill -0 "$(cat "$1")" 2>/dev/null && echo alive || echo dead; }
child_alive() { pgrep -f "$1" > /dev/null && echo alive || echo dead; }
reap() { local p; p=$(cat "$1" 2>/dev/null); [ -n "$p" ] && { kill -KILL -- -"$p" 2>/dev/null; kill -KILL "$p" 2>/dev/null; }; rm -f "$1"; pkill -KILL -f 'BilingHarness_p19|other_p19' 2>/dev/null; }
waitfile() { for _ in 1 2 3 4 5 6 7 8 9 10; do [ -s "$1" ] && break; sleep 0.3; done; sleep 1; }
harness_leader() { setsid bash -c 'echo $$ > "$0"; exec -a BilingHarness_p19 sleep 300' "$1" > /dev/null 2>&1 & waitfile "$1"; }
gone_with_child() { setsid bash -c 'echo $$ > "$0"; (exec -a "$1" sleep 300) & exit 0' "$1" "$2" > /dev/null 2>&1 & wait $!; waitfile "$1"; }
kill_rc() { # lib-dir shadow-definition -> rc of the kill function
  bash -c ". $1/p15_lib.sh; $2; p15_kill_run_harness $RR" 2>/dev/null; echo $?
}
mkpid() { mkdir -p $RD; rm -f $RD/*.pid; }
PSNOPG='ps() { case "$*" in *"-o pgid= -p"*) return 0;; *) command ps "$@";; esac; }'
PSFAIL='ps() { return 1; }'

echo "# N5a a live leader whose pgid cannot be read (it vanished between kill -0 and ps)"
mkpid; harness_leader $RD/harness_a.log.pid
RC=$(kill_rc "$BAK" "$PSNOPG"); sleep 1
chk "N5a OLD: 'not a leader', rc 0, the harness leader is still alive (the defect)" "$RC/$(alive $RD/harness_a.log.pid)" 0/alive
reap $RD/harness_a.log.pid
mkpid; harness_leader $RD/harness_a.log.pid
RC=$(kill_rc "." "$PSNOPG"); sleep 1
chk "N5a NEW: treated as gone, the harness group is signalled and confirmed dead (rc 0)" "$RC/$(alive $RD/harness_a.log.pid)" 0/dead
reap $RD/harness_a.log.pid

echo "# N5b ps itself fails while a harness child of a dead leader lives"
mkpid; gone_with_child $RD/harness_b.log.pid BilingHarness_p19
chk "N5b precondition: the leader is gone and the child lives" "$(alive $RD/harness_b.log.pid)/$(child_alive BilingHarness_p19)" dead/alive
RC=$(kill_rc "$BAK" "$PSFAIL"); sleep 1
chk "N5b OLD: rc 0, child alive (a failing ps reads as 'no live member': the defect)" "$RC/$(child_alive BilingHarness_p19)" 0/alive
reap $RD/harness_b.log.pid
mkpid; gone_with_child $RD/harness_b.log.pid BilingHarness_p19
RC=$(kill_rc "." "$PSFAIL"); sleep 1
chk "N5b NEW: rc 1 (not confirmed), the child is left alone" "$RC/$(child_alive BilingHarness_p19)" 1/alive
reap $RD/harness_b.log.pid

echo "# N5c p15_group_alive with a failing ps"
ga() { bash -c ". $1/p15_lib.sh; $PSFAIL; p15_group_alive 1; echo \$?" 2>/dev/null; }
chk "N5c OLD returns 1 ('dead') when ps fails (the defect)" "$(ga $BAK)" 1
chk "N5c NEW returns 2 (unknown) when ps fails" "$(ga .)" 2
gb() { bash -c ". ./p15_lib.sh; p15_group_alive $1; echo \$?" 2>/dev/null; }
chk "N5c NEW still returns 0 for a live group (pid 1's group)" "$(gb 1)" 0
chk "N5c NEW still returns 1 for a group that does not exist" "$(gb 999999)" 1
rm -rf /opt/dr-benchmark/results/$RR

chk "database.xml on sik at the end" "$(XMLP)" "sik "
echo "P19-A-NC: PASS=$P FAIL=$F"
[ "$F" = "0" ]
