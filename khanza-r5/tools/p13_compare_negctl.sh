#!/bin/bash
# P13 T3 negative control: on a scratch copy of the P13 clone, change one billing
# amount by +1 and one payment by +1; the comparator must exit 1 and name exactly
# those two encounters. Assert ROW_COUNT()=1 for each plant.
# The unplanted scratch copy must reproduce the clean result.
#
# Usage: DR_LOCK_SESSION=<id> bash p13_compare_negctl.sh <visits-file>
# (The clone sik_p13w must still exist from the stage run.)
set -u
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
FX=sik_p13w
VISITS=${1:?visits file}
W=sik_p13nc
SQL() { mysql -uroot -N -e "$1"; }

. ./dr_runlock.sh; dr_runlock_require p13_compare_negctl.sh
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT=/opt/dr-benchmark/p-chain/r5_p13_negctl_${TS}.md
res() { echo "$1" | tee -a "$OUT"; }

[ -n "$(SQL "SHOW DATABASES LIKE '$W'")" ] && { res "$W exists - refusing"; exit 3; }
{ echo "# P13 comparator negative control"; echo "Run $TS UTC · $(wc -l < "$VISITS") visits"; } > "$OUT"

# Build a scratch copy of the clone (fast: just the tables we need)
res "building scratch copy $W"
SQL "CREATE DATABASE $W CHARACTER SET $(SQL "SELECT default_character_set_name FROM information_schema.schemata WHERE schema_name='sik'") COLLATE $(SQL "SELECT default_collation_name FROM information_schema.schemata WHERE schema_name='sik'")"
mysqldump -uroot --single-transaction --quick --skip-lock-tables $FX | mysql -uroot $W || { res "ABORT: scratch copy failed"; exit 3; }
trap 'SQL "DROP DATABASE IF EXISTS $W;" 2>/dev/null; echo "teardown: $W dropped"' EXIT
res "scratch copy ready"

# Pick two encounters that have both billing rows and detail_nota_jalan rows
# from the clone (NOT from the scratch — we need them to be identical)
NR1=$(SQL "SELECT no_rawat FROM $FX.billing b JOIN $FX.detail_nota_jalan d ON d.no_rawat=b.no_rawat WHERE b.status NOT LIKE 'Ttl%%' AND (b.biaya>0 OR b.totalbiaya>0) LIMIT 1")
NR2=$(SQL "SELECT no_rawat FROM $FX.billing b JOIN $FX.detail_nota_jalan d ON d.no_rawat=b.no_rawat WHERE b.status NOT LIKE 'Ttl%%' AND (b.biaya>0 OR b.totalbiaya>0) AND b.no_rawat<>\"$NR1\" LIMIT 1")
if [ -z "$NR1" ] || [ -z "$NR2" ]; then
  res "ABORT: could not find two encounters with both billing and payment rows"
  exit 3
fi
res "plant targets: NR1=$NR1 NR2=$NR2"

# Plant +1 on one billing row in NR1
P1_RC=$(SQL "UPDATE $W.billing SET totalbiaya=totalbiaya+1 WHERE no_rawat='$NR1' AND status NOT LIKE 'Ttl%%' AND (biaya>0 OR totalbiaya>0) ORDER BY noindex LIMIT 1; SELECT ROW_COUNT();")
[ "$P1_RC" = "1" ] || { res "ABORT: billing plant changed $P1_RC rows (expected 1) - vacuous control"; exit 3; }
res "billing plant: $NR1 ROW_COUNT=$P1_RC"

# Plant +1 on one payment row in NR2
P2_RC=$(SQL "UPDATE $W.detail_nota_jalan SET besar_bayar=besar_bayar+1 WHERE no_rawat='$NR2' LIMIT 1; SELECT ROW_COUNT();")
[ "$P2_RC" = "1" ] || { res "ABORT: payment plant changed $P2_RC rows (expected 1) - vacuous control"; exit 3; }
res "payment plant: $NR2 ROW_COUNT=$P2_RC"

# Run the comparator against the PLANTED scratch copy
P13_CONSUMER_DB=$W python3 p13_sample_compare.py "$VISITS" --db $W --out /tmp/p13_nc_plant.csv | grep -aE "^P13|^RESULT"
RC=${PIPESTATUS[0]}
res "planted: comparator exit=$RC"

# Verify the comparator names exactly the two planted encounters
FOUND1=$(grep -ac "$NR1" /tmp/p13_nc_plant.csv)
FOUND2=$(grep -ac "$NR2" /tmp/p13_nc_plant.csv)
res "planted: NR1 in diffs=$FOUND1 NR2 in diffs=$FOUND2"

if [ "$RC" = "1" ] && [ "$FOUND1" -ge 1 ] && [ "$FOUND2" -ge 1 ]; then
  res "P13-NC: DISCRIMINATING (exit 1, both planted encounters named, ROW_COUNT()=1 each)"
  exit 0
else
  res "P13-NC: NOT-DISCRIMINATING (exit $RC, NR1=$FOUND1 NR2=$FOUND2)"
  exit 1
fi
