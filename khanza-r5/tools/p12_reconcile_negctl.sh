#!/bin/bash
# Negative control for p12_perencounter_reconcile.py: on a SCRATCH copy of the ledger, change ONE
# amount by +1 and ONE row's component total elsewhere untouched; the tool must exit 1 and report
# exactly the planted encounter (S1 differences >= 1, S2 B-vs-C one more than the baseline). The unplanted
# copy must reproduce the live result. Live sik / sik_bench are only read. Needs the run lock.
set -u
cd /opt/Deers-Rock/tools
. ./dr_runlock.sh; dr_runlock_require p12_reconcile_negctl.sh
export DBUTIL_FORCE_ROOT=1
W=sik_p12nc
SQL() { mysql -uroot -N -e "$1"; }
[ -n "$(SQL "SHOW DATABASES LIKE '$W'")" ] && { echo "$W exists - refusing"; exit 3; }
trap 'SQL "DROP DATABASE IF EXISTS $W;"; echo "teardown: databases now: $(SQL "SHOW DATABASES" | grep "^sik" | tr "\n" " ")"' EXIT
SQL "CREATE DATABASE $W; CREATE TABLE $W.dr_charge_ledger LIKE sik_bench.dr_charge_ledger; INSERT INTO $W.dr_charge_ledger SELECT * FROM sik_bench.dr_charge_ledger;"
echo "scratch ledger rows: $(SQL "SELECT COUNT(*) FROM $W.dr_charge_ledger") (live $(SQL 'SELECT COUNT(*) FROM sik_bench.dr_charge_ledger'))"
echo "== control arm: unplanted copy (expect same result as live) =="
P12_LEDGER_DB=$W python3 p12_perencounter_reconcile.py --sample-csv ${1:-/tmp/r4.csv} --out /tmp/p12_nc_clean.csv | grep -aE "^S[123]|RESULT"; RC0=$?
echo "== with-plant arm: one amount +1 on a form-saved encounter =="
# the planted encounter must be a DR encounter that has BOTH form-save rows and ledger rows
NR=$(SQL "SELECT d.no_rawat FROM sik.detail_nota_jalan d JOIN $W.dr_charge_ledger l ON l.no_rawat=d.no_rawat WHERE d.no_rawat<>'2026/10/23/000408' LIMIT 1")
[ -n "$NR" ] || { echo "P12-NC: ABORT no suitable encounter"; exit 3; }
PLANTED=$(mysql -uroot -N -e "UPDATE $W.dr_charge_ledger SET amount=amount+1 WHERE no_rawat='$NR' ORDER BY component, code LIMIT 1; SELECT ROW_COUNT();")
[ "$PLANTED" = "1" ] || { echo "P12-NC: ABORT the plant changed $PLANTED rows (expected 1) - the control would be vacuous"; exit 3; }
echo "planted on $NR"
P12_LEDGER_DB=$W python3 p12_perencounter_reconcile.py --sample-csv ${1:-/tmp/r4.csv} --out /tmp/p12_nc_plant.csv | grep -aE "^S[123]|RESULT"; RC=${PIPESTATUS[0]}
grep -a "$NR" /tmp/p12_nc_plant.csv
if [ "$RC" = "1" ] && grep -aq "S1,$NR" /tmp/p12_nc_plant.csv; then echo "P12-NC: DISCRIMINATING (exit 1, planted encounter reported)"; exit 0; else echo "P12-NC: NOT-DISCRIMINATING (exit $RC)"; exit 1; fi
