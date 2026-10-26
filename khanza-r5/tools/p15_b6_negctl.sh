#!/bin/bash
# P15 B6 negative control for p12_perencounter_reconcile.py: a DR encounter with NO billing and NO
# ledger rows agreed as {} == {} before P15. On a scratch schema holding 20 real DR encounters
# (reg_periksa, billing, detail_nota_jalan copied from live sik read-only; their ledger rows
# from sik_bench read-only): unplanted -> exit 0; then one encounter's billing and ledger rows
# are deleted: the OLD bytes still pass, the NEW bytes list it and exit 1.
# Usage: DR_LOCK_SESSION=<id> bash p15_b6_negctl.sh <bak-dir> <visits-file>
set -u
cd /opt/Deers-Rock/tools
BAK=${1:?bak dir}; VIS=${2:?visits file}
. ./dr_runlock.sh; dr_runlock_require p15_b6_negctl.sh
export DBUTIL_FORCE_ROOT=1
W=p15_b6
SQL() { mysql -uroot -N -e "$1"; }
P=0; F=0
chk() { if [ "$2" = "$3" ]; then echo "PASS $1 (got $2)"; P=$((P+1)); else echo "FAIL $1 (got $2, want $3)"; F=$((F+1)); fi; }
[ -n "$(SQL "SHOW DATABASES LIKE '$W'")" ] && { echo "ABORT: $W exists - refusing"; exit 3; }
trap 'SQL "DROP DATABASE IF EXISTS $W;"; echo "teardown: $W dropped"' EXIT
SQL "CREATE DATABASE $W CHARACTER SET $(SQL "SELECT default_character_set_name FROM information_schema.schemata WHERE schema_name='sik'") COLLATE $(SQL "SELECT default_collation_name FROM information_schema.schemata WHERE schema_name='sik'")"
INL=$(head -20 "$VIS" | sed "s/.*/'&'/" | paste -sd,)
for t in reg_periksa billing detail_nota_jalan; do
  SQL "SET SESSION sql_mode=''; CREATE TABLE $W.$t LIKE sik.$t; INSERT INTO $W.$t SELECT * FROM sik.$t WHERE no_rawat IN ($INL);"
done
SQL "CREATE TABLE $W.dr_charge_ledger LIKE sik_bench.dr_charge_ledger; INSERT INTO $W.dr_charge_ledger SELECT * FROM sik_bench.dr_charge_ledger WHERE no_rawat IN ($INL);"
echo "scratch: reg=$(SQL "SELECT COUNT(*) FROM $W.reg_periksa") billing=$(SQL "SELECT COUNT(*) FROM $W.billing") ledger=$(SQL "SELECT COUNT(*) FROM $W.dr_charge_ledger")"
# PYTHONPATH: the old bytes live in the .bak dir, which holds only the changed files; their
# imports (dbutil, three_count_reconcile_p2) resolve from the tools dir (P15 fix 2: the first
# run died on ImportError, exit 1 for the wrong reason). Each arm keeps its own log.
run() { PYTHONPATH=/opt/Deers-Rock/tools P12_CONSUMER_DB=$W P12_LEDGER_DB=$W python3 "$1" --out /tmp/p15_b6.csv > /tmp/p15_b6_$2.log 2>&1; echo $?; }
chk "B6 unplanted, new bytes" "$(run p12_perencounter_reconcile.py clean)" 0
NR=$(head -1 "$VIS")
RB=$(SQL "DELETE FROM $W.billing WHERE no_rawat='$NR'; SELECT ROW_COUNT();")
RL=$(SQL "DELETE FROM $W.dr_charge_ledger WHERE no_rawat='$NR'; SELECT ROW_COUNT();")
echo "plant: $NR billing rows deleted $RB, ledger rows deleted $RL"
chk "B6 plant removed billing rows" "$([ "$RB" -ge 1 ] && echo yes || echo no)" yes
chk "B6 plant removed ledger rows" "$([ "$RL" -ge 1 ] && echo yes || echo no)" yes
chk "B6 OLD bytes pass the uncovered encounter ({} == {}, the defect)" "$(run $BAK/p12_perencounter_reconcile.py old)" 0
chk "B6 NEW bytes fail it" "$(run p12_perencounter_reconcile.py new)" 1
chk "B6 NEW bytes list it" "$(grep -c "S1-COVERAGE,$NR" /tmp/p15_b6.csv)" 2
grep -a "Traceback\|Error\|RESULT\|coverage" /tmp/p15_b6_old.log /tmp/p15_b6_new.log
echo "P15-B6-NC: PASS=$P FAIL=$F"
[ "$F" = "0" ]
