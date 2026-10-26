#!/bin/bash
# P15 negative controls for p15_line_identity.py (task doc s2 B1-B5, C2), on a verified scratch
# copy sik_p14n of the fixture rows of sik_p14e (+ lookup and source tables). Every plant
# asserts ROW_COUNT()=1 and has its own encounter.
#   C2  900026: ledger code J000840 -> J000844 (same display name, same price, expected code now
#       present in the ledger). OLD p14_line_identity.py passes it (EQUAL-CTX: the hole);
#       NEW p15_line_identity.py: DIFFER -> MISMATCH (source rows say J000840).
#   B1a 900007: payment -1 (B != A_form)                      -> MISMATCH
#   B1b 900001: drug qty +1, unit lowered, amount unchanged   -> MISMATCH via form_model
#   B3  900009: ledger registration quantity 1 -> 2            -> MISMATCH (qty compared)
#   B5a 900011: an extra detail_nota_jalan INSERT by root@ in the run window -> MISMATCH
#   B5b 900012: the fresh INSERT moved before the run start    -> MISMATCH
#   B4  empty list, duplicate list, NULL totalbiaya             -> exit 2 each
#   B2  duplicate ledger key (PK dropped on a copy)             -> exit 2
# Usage: DR_LOCK_SESSION=<id> bash p15_line_negctl.sh <fixture-dir> <since>
set -u
set -o pipefail
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
FXDIR=${1:?fixture dir}; SINCE=${2:?run start}; BAK=${3:-}   # BAK: dir with the pre-P16 p15_line_identity.py (B5c old arm)
FX=sik_p14e; W=sik_p14n
. ./dr_runlock.sh; dr_runlock_require p15_line_negctl.sh
SQL() { mysql -uroot -N -e "$1"; }
[ -n "$(SQL "SHOW DATABASES LIKE '$FX'")" ] || { echo "ABORT: $FX missing"; exit 3; }
[ -n "$(SQL "SHOW DATABASES LIKE '$W'")" ] && { echo "ABORT: $W exists - refusing, nothing touched"; exit 3; }
trap 'SQL "DROP DATABASE IF EXISTS $W;"; echo "teardown: $W dropped"' EXIT
V=$FXDIR/p14_edge_visits.txt
M=$FXDIR/p14_edge_manifest.json
SQL "CREATE DATABASE $W CHARACTER SET $(SQL "SELECT default_character_set_name FROM information_schema.schemata WHERE schema_name='sik'") COLLATE $(SQL "SELECT default_collation_name FROM information_schema.schemata WHERE schema_name='sik'")"
for t in jns_perawatan databarang jenis; do
  SQL "SET SESSION sql_mode=''; CREATE TABLE $W.$t LIKE $FX.$t; INSERT INTO $W.$t SELECT * FROM $FX.$t;" || { echo "ABORT: copy of $t failed"; exit 3; }
  [ "$(SQL "SELECT COUNT(*) FROM $W.$t")" = "$(SQL "SELECT COUNT(*) FROM $FX.$t")" ] || { echo "ABORT: $t count differs"; exit 3; }
done
for t in billing detail_nota_jalan p7_write_audit dr_charge_ledger rawat_jl_dr detail_pemberian_obat; do
  SQL "SET SESSION sql_mode=''; CREATE TABLE $W.$t LIKE $FX.$t; INSERT INTO $W.$t SELECT * FROM $FX.$t WHERE no_rawat LIKE '2027/12/31/%';" || { echo "ABORT: copy of $t failed"; exit 3; }
  [ "$(SQL "SELECT COUNT(*) FROM $W.$t")" = "$(SQL "SELECT COUNT(*) FROM $FX.$t WHERE no_rawat LIKE '2027/12/31/%'")" ] || { echo "ABORT: $t count differs"; exit 3; }
done
echo "scratch $W verified: billing=$(SQL "SELECT COUNT(*) FROM $W.billing") ledger=$(SQL "SELECT COUNT(*) FROM $W.dr_charge_ledger") src_proc=$(SQL "SELECT COUNT(*) FROM $W.rawat_jl_dr") src_drug=$(SQL "SELECT COUNT(*) FROM $W.detail_pemberian_obat")"
# P16 B1 (N2): an array, so the run-start timestamp (it contains a space) stays one argument
NEW=(python3 p15_line_identity.py "$V" --db "$W" --ledger-db "$W" --since "$SINCE" --expect "$M")
P=0; F=0
chk() { if [ "$2" = "$3" ]; then echo "PASS $1 (got $2)"; P=$((P+1)); else echo "FAIL $1 (got $2, want $3)"; F=$((F+1)); fi; }
plant() { local rc; rc=$(SQL "$2; SELECT ROW_COUNT();"); chk "plant $1 ROW_COUNT" "$rc" 1; }
outcome() { python3 -c "import json,sys;r={e['no_rawat']:e for e in json.load(open(sys.argv[1]))};print(r[sys.argv[2]]['outcome'])" "$1" "$2"; }
verdict() { python3 -c "import json,sys;r={e['no_rawat']:e for e in json.load(open(sys.argv[1]))};print(r[sys.argv[2]]['verdict'])" "$1" "$2"; }

echo "## unplanted (new comparator, expect mode, 27 visits)"
"${NEW[@]}" --out /tmp/p15nc_clean.csv | tail -1; RC0=${PIPESTATUS[0]}
chk "unplanted exit" "$RC0" 0
chk "unplanted summary records the full run start (P16 B1)" "$(python3 -c "import json;print(json.load(open('/tmp/p15nc_clean_summary.json'))['since'])")" "$SINCE"

echo "## plants"
plant C2  "UPDATE $W.dr_charge_ledger SET code='J000844' WHERE no_rawat='2027/12/31/900026' AND component='procedure' AND code='J000840'"
plant B1a "UPDATE $W.detail_nota_jalan SET besar_bayar=besar_bayar-1 WHERE no_rawat='2027/12/31/900007' LIMIT 1"
plant B1b "UPDATE $W.billing SET biaya=totalbiaya/(jumlah+1), jumlah=jumlah+1 WHERE no_rawat='2027/12/31/900001' AND status='Obat' AND pemisah=':' AND nm_perawatan NOT LIKE 'PPN%' ORDER BY noindex LIMIT 1"
plant B3  "UPDATE $W.dr_charge_ledger SET quantity=2 WHERE no_rawat='2027/12/31/900009' AND component='registration'"
plant B5a "INSERT INTO $W.p7_write_audit (tbl,op,no_rawat,acct,conn,at) VALUES ('detail_nota_jalan','INSERT','2027/12/31/900011','root@localhost',0,'$SINCE')"
plant B5b "UPDATE $W.p7_write_audit SET at = TIMESTAMPADD(DAY,-1,'$SINCE') WHERE no_rawat='2027/12/31/900012' AND tbl='detail_nota_jalan' AND op='INSERT'"
# P16 B5c: a stale INSERT by benchmark@ one microsecond BEFORE the run start, next to the legitimate fresh row
plant B5c "INSERT INTO $W.p7_write_audit (tbl,op,no_rawat,acct,conn,at) VALUES ('detail_nota_jalan','INSERT','2027/12/31/900013','benchmark@localhost',0,TIMESTAMPADD(MICROSECOND,-1,'$SINCE'))"
# P16 B5d: the legitimate fresh row exactly AT the run start must still be accepted (boundary inclusive)
plant B5d "UPDATE $W.p7_write_audit SET at = '$SINCE' WHERE no_rawat='2027/12/31/900014' AND tbl='detail_nota_jalan' AND op='INSERT'"

echo "## planted: new comparator"
"${NEW[@]}" --out /tmp/p15nc_plant.csv | grep -E "900026|900007|900001|900009|900011|900012|P15-LINE" ; RC1=${PIPESTATUS[0]}
chk "planted new exit" "$RC1" 1
J=/tmp/p15nc_plant_encounters.json
chk "C2 new verdict (same-name same-price wrong code)" "$(verdict $J 2027/12/31/900026)" DIFFER
chk "C2 new outcome" "$(outcome $J 2027/12/31/900026)" MISMATCH
chk "B1a payment -1"  "$(outcome $J 2027/12/31/900007)" MISMATCH
chk "B1b qty/unit, same amount (form_model)" "$(outcome $J 2027/12/31/900001)" MISMATCH
chk "B3 registration qty" "$(outcome $J 2027/12/31/900009)" MISMATCH
chk "B5a extra INSERT by another account" "$(outcome $J 2027/12/31/900011)" MISMATCH
chk "B5b fresh row before run start" "$(outcome $J 2027/12/31/900012)" MISMATCH
chk "B5c pre-run INSERT by benchmark@ (exactly one in total)" "$(outcome $J 2027/12/31/900013)" MISMATCH
chk "B5d fresh row exactly at the run start is accepted" "$(outcome $J 2027/12/31/900014)" MATCH
NOTHER=$(python3 -c "import json;r=json.load(open('$J'));print(sum(1 for e in r if e['outcome']!='MATCH' and e['no_rawat'] not in ('2027/12/31/900026','2027/12/31/900007','2027/12/31/900001','2027/12/31/900009','2027/12/31/900011','2027/12/31/900012','2027/12/31/900013')))")
chk "no unplanted encounter fails" "$NOTHER" 0

echo "## planted: OLD p14_line_identity.py on the same scratch (C2 hole)"
python3 p14_line_identity.py $V --db $W --ledger-db $W --expect $M --out /tmp/p15nc_old.csv | grep -E "900026" ; true
chk "C2 old verdict (ledger-conditioned)" "$(verdict /tmp/p15nc_old_encounters.json 2027/12/31/900026)" EQUAL-CTX
chk "C2 old outcome (the hole: wrong code passes)" "$(outcome /tmp/p15nc_old_encounters.json 2027/12/31/900026)" MATCH

if [ -n "$BAK" ]; then
  echo "## B5c on the OLD p15 comparator (the hole: a stale pre-run INSERT is ignored)"
  PYTHONPATH=/opt/Deers-Rock/tools python3 "$BAK/p15_line_identity.py" $V --db $W --ledger-db $W --since "$SINCE" --expect $M --out /tmp/p16nc_oldli.csv > /tmp/p16nc_oldli.log 2>&1
  chk "B5c OLD p15 comparator accepts the pre-run INSERT (the hole)" "$(outcome /tmp/p16nc_oldli_encounters.json 2027/12/31/900013)" MATCH
fi

echo "## B4 / B2 input errors"
: > /tmp/p15nc_empty.txt
python3 p15_line_identity.py /tmp/p15nc_empty.txt --db $W --ledger-db $W --no-fresh-b > /tmp/p15nc_b4a.txt 2>&1; chk "B4 empty list exit" "$?" 2
{ head -2 $V; head -1 $V; } > /tmp/p15nc_dup.txt
python3 p15_line_identity.py /tmp/p15nc_dup.txt --db $W --ledger-db $W --no-fresh-b > /tmp/p15nc_b4b.txt 2>&1; chk "B4 duplicate list exit" "$?" 2
SQL "ALTER TABLE $W.billing MODIFY totalbiaya double NULL;"   # scratch only: allow the NULL plant
plant B4c "UPDATE $W.billing SET totalbiaya=NULL WHERE no_rawat='2027/12/31/900022' AND status='Obat' AND pemisah=':' ORDER BY noindex LIMIT 1"
printf '2027/12/31/900022\n' > /tmp/p15nc_one.txt
python3 p15_line_identity.py /tmp/p15nc_one.txt --db $W --ledger-db $W --no-fresh-b > /tmp/p15nc_b4c.txt 2>&1; chk "B4 NULL numeric exit" "$?" 2
# P16 B3 (N4): a NULL payment is an input error in both comparators, never 0
CT=$(SQL "SELECT column_type FROM information_schema.columns WHERE table_schema='$W' AND table_name='detail_nota_jalan' AND column_name='besar_bayar'")
SQL "ALTER TABLE $W.detail_nota_jalan MODIFY besar_bayar $CT NULL;"   # scratch only
plant B3n "UPDATE $W.detail_nota_jalan SET besar_bayar=NULL WHERE no_rawat='2027/12/31/900024' LIMIT 1"
printf '2027/12/31/900024\n' > /tmp/p15nc_one.txt
python3 p15_line_identity.py /tmp/p15nc_one.txt --db $W --ledger-db $W --no-fresh-b > /tmp/p16nc_b3a.txt 2>&1; chk "B3 NULL payment exit (p15 comparator)" "$?" 2
python3 p13_sample_compare.py /tmp/p15nc_one.txt --db $W > /tmp/p16nc_b3b.txt 2>&1; chk "B3 NULL payment exit (p13 comparator)" "$?" 2
SQL "ALTER TABLE $W.dr_charge_ledger DROP PRIMARY KEY;"
plant B2 "INSERT INTO $W.dr_charge_ledger SELECT * FROM $W.dr_charge_ledger WHERE no_rawat='2027/12/31/900023' AND component='registration'"
printf '2027/12/31/900023\n' > /tmp/p15nc_one.txt
python3 p15_line_identity.py /tmp/p15nc_one.txt --db $W --ledger-db $W --no-fresh-b > /tmp/p15nc_b2.txt 2>&1; chk "B2 duplicate ledger key exit" "$?" 2
cat /tmp/p15nc_b4a.txt /tmp/p15nc_b4b.txt /tmp/p15nc_b4c.txt /tmp/p15nc_b2.txt /tmp/p16nc_b3a.txt /tmp/p16nc_b3b.txt | grep INPUT-ERROR
echo "P15-LINE-NC: PASS=$P FAIL=$F"
[ "$F" = "0" ]
