#!/bin/bash
# P15 A4/A5/A6/A7 unit tests for p15_lib.sh (no live writes; A6 uses a scratch schema p15_pin_t).
# Usage: DR_LOCK_SESSION=<id> bash p15_lib_test.sh <pin>
set -u
cd /opt/Deers-Rock/tools
. ./dr_runlock.sh; dr_runlock_require p15_lib_test.sh
. ./p15_lib.sh
PIN=${1:?pin}
P=0; F=0
t() { if [ "$2" = "$3" ]; then echo "PASS $1 (got $2)"; P=$((P+1)); else echo "FAIL $1 (got $2, want $3)"; F=$((F+1)); fi; }
r() { "$@" >/dev/null 2>&1 && echo yes || echo no; }

t "A4 2/100 does not stop"   "$(r p15_stop_rule_fires 2 100)" no
t "A4 3/100 stops"           "$(r p15_stop_rule_fires 3 100)" yes
t "A4 7/300 stops (2.33 %, old integer rule: 2 -> no stop)" "$(r p15_stop_rule_fires 7 300)" yes
t "A4 6/300 does not stop (2.00 %)" "$(r p15_stop_rule_fires 6 300)" no
t "A4 old rule on 7/300 (shows the defect)" "$( [ $(( 7 * 100 / 300 )) -gt 2 ] && echo yes || echo no)" no

D=$(mktemp -d)
printf '[2027/12/31/900001] sukses=true after 1 ms\n=== VISIT 2027/12/31/900001 DONE sukses=true ms=1 ===\n[2027/12/31/900002] sukses=false after 1 ms\n=== VISIT 2027/12/31/900002 DONE sukses=false ms=1 ===\n' > $D/harness_x.log
t "A5 count true (2 lines per visit counted once)" "$(p15_count_sukses $D true)" 1
t "A5 count false" "$(p15_count_sukses $D false)" 1
rm -rf "$D"
t "A5 decide fixture 4, no real -> ok"   "$(r p15_decide_exit 4 '')" yes
t "A5 decide fixture 1 -> fail"          "$(r p15_decide_exit 1 '')" no
t "A5 decide fixture 10 (stop rule) -> fail" "$(r p15_decide_exit 10 '')" no
t "A5 decide fixture 4, real 0 -> ok"    "$(r p15_decide_exit 4 0)" yes
t "A5 decide fixture 4, real 4 -> fail"  "$(r p15_decide_exit 4 4)" no

# A7 grant probe: positive and negative case on a scratch schema
mysql -uroot -e "DROP DATABASE IF EXISTS p15_pin_t; CREATE DATABASE p15_pin_t;"
t "A7 probe before grant" "$(p15_grant_count p15_pin_t)" 0
mysql -uroot -e "GRANT SELECT ON p15_pin_t.* TO 'benchmark'@'localhost';"
t "A7 probe sees the grant (positive case)" "$(p15_grant_count p15_pin_t)" 1
OLD=$(mysql -uroot -N -e "SELECT COUNT(*) FROM information_schema.schema_privileges WHERE grantee='\"benchmark\"@\"localhost\"' AND table_schema='p15_pin_t'")
t "A7 old P13 probe on the same grant (shows the defect)" "$OLD" 0
mysql -uroot -e "REVOKE SELECT ON p15_pin_t.* FROM 'benchmark'@'localhost';"
t "A7 probe after revoke" "$(p15_grant_count p15_pin_t)" 0

# A6 ledger pin: copy the live ledger into the scratch schema (read-only on sik_bench), check, alter one row, check
mysql -uroot -e "CREATE TABLE p15_pin_t.dr_charge_ledger LIKE sik_bench.dr_charge_ledger; INSERT INTO p15_pin_t.dr_charge_ledger SELECT * FROM sik_bench.dr_charge_ledger;"
t "A6 untouched copy reproduces the pin" "$(r p15_ledger_pin_check p15_pin_t "$PIN")" yes
RC=$(mysql -uroot -N -e "UPDATE p15_pin_t.dr_charge_ledger SET amount=amount+1 WHERE no_rawat NOT LIKE '2027/12/31/%' ORDER BY no_rawat LIMIT 1; SELECT ROW_COUNT();")
t "A6 plant ROW_COUNT" "$RC" 1
t "A6 altered copy fails the pin check" "$(r p15_ledger_pin_check p15_pin_t "$PIN")" no
mysql -uroot -e "DROP DATABASE p15_pin_t;"
# P16 A2 (N8): run-scoped kill. A group leader is killed; a non-leader and a reused pid are not.
RR=p16_kill_t; RD=/opt/dr-benchmark/results/$RR/B3; rm -rf /opt/dr-benchmark/results/$RR; mkdir -p $RD
spawn() { # pidfile leader(yes|no)
  if [ "$2" = yes ]; then setsid bash -c 'echo $$ > "$0"; exec sleep 300' "$1" > /dev/null 2>&1 &
  else bash -c 'echo $$ > "$0"; exec sleep 300' "$1" > /dev/null 2>&1 & fi
  for _ in 1 2 3 4 5 6 7 8 9 10; do [ -s "$1" ] && break; sleep 0.3; done; sleep 1
}
alive() { kill -0 "$(cat "$1")" 2>/dev/null && echo alive || echo dead; }
spawn $RD/harness_lead.log.pid yes
t "A2 leader alive before" "$(alive $RD/harness_lead.log.pid)" alive
p15_kill_run_harness $RR 2>/dev/null; sleep 1
t "A2 leader killed (positive case)" "$(alive $RD/harness_lead.log.pid)" dead
rm -f $RD/*.pid
spawn $RD/harness_nonlead.log.pid no
p15_kill_run_harness $RR 2>/dev/null; sleep 1
t "A2 non-leader pid not signalled" "$(alive $RD/harness_nonlead.log.pid)" alive
kill "$(cat $RD/harness_nonlead.log.pid)" 2>/dev/null; rm -f $RD/*.pid
spawn $RD/harness_reused.log.pid yes
touch -d "10 minutes ago" $RD/harness_reused.log.pid
p15_kill_run_harness $RR 2>/dev/null; sleep 1
t "A2 pid that started after its pid file (reused) not signalled" "$(alive $RD/harness_reused.log.pid)" alive
kill -- -"$(cat $RD/harness_reused.log.pid)" 2>/dev/null; kill "$(cat $RD/harness_reused.log.pid)" 2>/dev/null
rm -rf /opt/dr-benchmark/results/$RR
echo "P15-LIB-TEST: PASS=$P FAIL=$F"
[ "$F" = "0" ]
