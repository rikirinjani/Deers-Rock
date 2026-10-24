#!/bin/bash
# Negative control for the VPS run lock (dr_runlock.sh).
# Proves, on the disposable sik_p6f fixture only, that:
#   L1  no lock held           -> p6_run_suite_fresh.sh and p11_negative_controls.sh exit 3, touch nothing
#   L2  lock held by session A -> a run as session B, a run with no session, a second acquire: all exit 3
#   L3  holder A runs a selective suite (P11_ONLY=31) on a fresh fixture; WHILE it runs, session B's
#       attempt exits 3 and leaves A's fixture and grant intact; A's own run then exits 0 (lock holder
#       passes through) and the fixture is dropped
#   L4  release by a non-owner is refused; release by the owner frees the lock
#   L5  live sik / sik_bench unchanged across the whole experiment (databases, row counts, ledger
#       content count, benchmark grants outside sik_p6f, database.xml hash)
# Exits 0 only if every control behaves as stated. Run as root on the VPS: bash runlock_negctl.sh
# Refuses to start if a lock or a fixture already exists (it would not be the sole operator).
set -u
cd /opt/Deers-Rock/tools
SQL() { mysql -uroot -N -e "$1"; }
LOCK=/opt/dr-benchmark/LOCK
PC=/opt/dr-benchmark/p-chain
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT=$PC/r5_runlock_negctl_${TS}.md
LOGD=$(mktemp -d /tmp/runlock_nc.XXXXXX)
SA=NCTEST-A-$TS; SB=NCTEST-B-$TS
[ -e "$LOCK" ] && { echo "ABORT: a lock is already held:"; cat "$LOCK"; exit 3; }
[ -n "$(SQL "SHOW DATABASES LIKE 'sik_p6f'")" ] && { echo "ABORT: sik_p6f already exists"; exit 3; }
ACQ=0
cleanup() { [ "$ACQ" = "1" ] && bash dr_runlock.sh release --force >/dev/null 2>&1; }
trap cleanup EXIT
P=0; F=0
say() { echo "$*" | tee -a "$OUT"; }
expect() { # label expected-rc actual-rc
  if [ "$2" = "$3" ]; then say "PASS  $1 (exit $3)"; P=$((P+1)); else say "FAIL  $1 (expected exit $2, got $3)"; F=$((F+1)); fi
}
live_state() {
  echo "databases: $(SQL 'SHOW DATABASES' | grep '^sik' | tr '\n' ' ')"
  echo "sik.reg_periksa=$(SQL 'SELECT COUNT(*) FROM sik.reg_periksa') sik.billing=$(SQL 'SELECT COUNT(*) FROM sik.billing')"
  echo "ledger_rows=$(SQL 'SELECT COUNT(*) FROM sik_bench.dr_charge_ledger') sik_bench_tables=$(SQL "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='sik_bench'") sik_tables=$(SQL "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='sik'")"
  echo "benchmark grants (non-fixture): $(mysql -uroot -N -e "SHOW GRANTS FOR 'benchmark'@'localhost'" | grep -v sik_p6f | md5sum | cut -c1-12)"
  echo "database.xml: $(find /opt -name database.xml -path '*setting*' 2>/dev/null | sort | xargs md5sum | cut -c1-12 | tr '\n' ' ')"
}
{
echo "# Run-lock negative control - $TS (UTC)"
echo "Tools: $(sha256sum dr_runlock.sh p6_run_suite_fresh.sh p11_negative_controls.sh | awk '{print substr($1,1,12)" "$2}' | tr '\n' ';')"
echo ""; echo "## live state BEFORE"
} > "$OUT"
live_state | tee -a "$OUT" > "$LOGD/before.txt"
NCDIR_MT=$(stat -c %Y $PC/p11_nc 2>/dev/null || echo none)

say ""; say "## L1 no lock held"
bash p6_run_suite_fresh.sh > $LOGD/l1a.log 2>&1; expect "L1a wrapper without a lock" 3 $?
grep -a RUNLOCK $LOGD/l1a.log | head -1 | tee -a "$OUT"
bash p11_negative_controls.sh > $LOGD/l1b.log 2>&1; expect "L1b NC driver without a lock" 3 $?
grep -a RUNLOCK $LOGD/l1b.log | head -1 | tee -a "$OUT"
[ -z "$(SQL "SHOW DATABASES LIKE 'sik_p6f'")" ] && say "PASS  L1 no fixture created" || { say "FAIL  L1 fixture created"; F=$((F+1)); }
[ "$(stat -c %Y $PC/p11_nc 2>/dev/null || echo none)" = "$NCDIR_MT" ] && say "PASS  L1 NC log dir untouched" || { say "FAIL  L1 NC log dir changed"; F=$((F+1)); }

say ""; say "## L2 lock held by A"
bash dr_runlock.sh acquire $SA "runlock negative control" | tee -a "$OUT"; ACQ=1
DR_LOCK_SESSION=$SB bash p6_run_suite_fresh.sh > $LOGD/l2a.log 2>&1; expect "L2a wrapper as session B" 3 $?
grep -a RUNLOCK $LOGD/l2a.log | head -1 | tee -a "$OUT"
bash p6_run_suite_fresh.sh > $LOGD/l2b.log 2>&1; expect "L2b wrapper with no session id" 3 $?
DR_LOCK_SESSION=$SB bash p11_negative_controls.sh > $LOGD/l2c.log 2>&1; expect "L2c NC driver as session B" 3 $?
grep -a RUNLOCK $LOGD/l2c.log | head -1 | tee -a "$OUT"
bash dr_runlock.sh acquire $SB > $LOGD/l2d.log 2>&1; expect "L2d second acquire while locked" 3 $?
[ -z "$(SQL "SHOW DATABASES LIKE 'sik_p6f'")" ] && say "PASS  L2 no fixture created" || { say "FAIL  L2 fixture created"; F=$((F+1)); }
[ "$(stat -c %Y $PC/p11_nc 2>/dev/null || echo none)" = "$NCDIR_MT" ] && say "PASS  L2 NC log dir untouched" || { say "FAIL  L2 NC log dir changed"; F=$((F+1)); }

say ""; say "## L3 holder A runs a selective suite; B is refused while it runs"
( DR_LOCK_SESSION=$SA P11_ONLY=31 bash p6_run_suite_fresh.sh > $LOGD/l3a.log 2>&1; echo $? > $LOGD/l3a.rc ) &
for i in $(seq 1 120); do grep -aq "^fixture sik_p6f" $LOGD/l3a.log 2>/dev/null && break; sleep 5; done
sleep 3
say "holder log so far: $(grep -a '^fixture sik_p6f' $LOGD/l3a.log | head -1)"
GR_BEFORE=$(mysql -uroot -N -e "SHOW GRANTS FOR 'benchmark'@'localhost'" | grep -c sik_p6f)
DR_LOCK_SESSION=$SB bash p6_run_suite_fresh.sh > $LOGD/l3b.log 2>&1; expect "L3b session B while A is running" 3 $?
grep -a RUNLOCK $LOGD/l3b.log | head -1 | tee -a "$OUT"
GR_AFTER=$(mysql -uroot -N -e "SHOW GRANTS FOR 'benchmark'@'localhost'" | grep -c sik_p6f)
{ [ -n "$(SQL "SHOW DATABASES LIKE 'sik_p6f'")" ] && [ "$GR_BEFORE" = "1" ] && [ "$GR_AFTER" = "1" ]; } \
  && say "PASS  L3 A's fixture and grant survived B's refused attempt (grant lines $GR_BEFORE -> $GR_AFTER)" \
  || { say "FAIL  L3 fixture/grant disturbed (fixture present=$([ -n "$(SQL "SHOW DATABASES LIKE 'sik_p6f'")" ] && echo yes || echo no), grant lines $GR_BEFORE -> $GR_AFTER)"; F=$((F+1)); }
wait
expect "L3a holder A's own run" 0 "$(cat $LOGD/l3a.rc 2>/dev/null || echo missing)"
grep -a "^suite exit\|^teardown:" $LOGD/l3a.log | tee -a "$OUT"
[ -z "$(SQL "SHOW DATABASES LIKE 'sik_p6f'")" ] && say "PASS  L3 fixture dropped after A's run" || { say "FAIL  L3 fixture left behind"; F=$((F+1)); }

say ""; say "## L4 release"
bash dr_runlock.sh release $SB > $LOGD/l4a.log 2>&1; expect "L4a release by non-owner" 3 $?
[ -e "$LOCK" ] && say "PASS  L4 lock still held" || { say "FAIL  L4 lock vanished"; F=$((F+1)); }
bash dr_runlock.sh release $SA | tee -a "$OUT"; ACQ=0
[ ! -e "$LOCK" ] && say "PASS  L4 owner release freed the lock" || { say "FAIL  L4 lock still present"; F=$((F+1)); }

say ""; say "## L5 live state AFTER"
live_state > $LOGD/after.txt; cat $LOGD/after.txt | tee -a "$OUT"
cmp -s $LOGD/before.txt $LOGD/after.txt && say "PASS  L5 live state identical before/after" || { say "FAIL  L5 live state differs"; diff $LOGD/before.txt $LOGD/after.txt | tee -a "$OUT"; F=$((F+1)); }

say ""; say "=== RUNLOCK NEGATIVE CONTROL: PASS=$P FAIL=$F ==="
say "evidence: $OUT   logs: $LOGD"
[ "$F" = "0" ] && exit 0 || exit 1
