#!/bin/bash
# P18 predicate controls (task doc s2 B7, B8), on a verified scratch copy sik_p14n of the fixture rows of
# sik_p14e. Every plant asserts its affected-row count. OLD = the P17 bytes (<bak-p18>), except B3a and B4 whose
# fixes are P17 changes (OLD = the P16 bytes, <bak-p17>); OLD-P15 = <bak-p16>.
# This file carries the corrected versions of the P17 checks that the independent review found weak (M10):
# every NEW arm that expects an input error asserts the reason text, every OLD arm that expects "the defect"
# asserts exit 0 and the summary line (not just "exit != 2").
#   B7a  a billed procedure/drug key with no source row: OLD unit_src MATCH (the compare is skipped),
#        NEW UNCHECKED -> MISMATCH.  unit_keys_checked is counted and > 0 on the clean fixture.
#   B7b  a second payment row of 0 under --no-fresh-b: OLD MATCH, NEW MISMATCH.
#   B3a  a subset of the manifest's visits.   B4  p13_sample_compare.py without --since.
#   N4   NULL payment (OLD-P15 comparator vs NEW).   N7  the B6 judge (judge-level: the counts are injected).
# Usage: DR_LOCK_SESSION=<id> bash p18_b_negctl.sh <fixture-dir> <since> <bak-p18 (P17 bytes)> <bak-p17 (P16 bytes)> <bak-p16 (P15 bytes)>
set -u
set -o pipefail
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
FXDIR=${1:?fixture dir}; SINCE=${2:?run start}; BAK=${3:?bak p18 dir (P17 bytes)}; BAK17=${4:?bak p17 dir (P16 bytes)}; BAK16=${5:?bak p16 dir (P15 bytes)}
FX=sik_p14e; W=sik_p14n
. ./dr_runlock.sh; dr_runlock_require p18_b_negctl.sh
SQL() { mysql -uroot -N -e "$1"; }
[ -n "$(SQL "SHOW DATABASES LIKE '$FX'")" ] || { echo "ABORT: $FX missing"; exit 3; }
[ -n "$(SQL "SHOW DATABASES LIKE '$W'")" ] && { echo "ABORT: $W exists - refusing, nothing touched"; exit 3; }
trap 'SQL "DROP DATABASE IF EXISTS $W;"; echo "teardown: $W dropped"' EXIT
V=$FXDIR/p14_edge_visits.txt
M=$FXDIR/p14_edge_manifest.json
[ "$(sed -n 29p p15_line_negctl.sh | cut -c1-24)" = 'SQL "CREATE DATABASE $W ' ] || { echo "ABORT: scratch-setup lines moved in p15_line_negctl.sh"; exit 3; }
eval "$(sed -n '29,38p' p15_line_negctl.sh)"
P=0; F=0
chk() { if [ "$2" = "$3" ]; then echo "PASS $1 (got $2)"; P=$((P+1)); else echo "FAIL $1 (got $2, want $3)"; F=$((F+1)); fi; }
plant() { local rc; rc=$(SQL "$2; SELECT ROW_COUNT();"); chk "plant $1 ROW_COUNT" "$rc" "${3:-1}"; }
outcome() { python3 -c "import json,sys;r={e['no_rawat']:e for e in json.load(open(sys.argv[1]))};print(r[sys.argv[2]]['outcome'])" "$1" "$2"; }
field() { python3 -c "import json,sys;r={e['no_rawat']:e for e in json.load(open(sys.argv[1]))};print(r[sys.argv[2]].get(sys.argv[3],'-'))" "$1" "$2" "$3"; }
NEW=(python3 p15_line_identity.py "$V" --db "$W" --ledger-db "$W" --since "$SINCE" --expect "$M")
OLD=(env PYTHONPATH=/opt/Deers-Rock/tools python3 "$BAK/p15_line_identity.py" "$V" --db "$W" --ledger-db "$W" --since "$SINCE" --expect "$M")
NEWNF=(python3 p15_line_identity.py "$V" --db "$W" --ledger-db "$W" --no-fresh-b --expect "$M")
OLDNF=(env PYTHONPATH=/opt/Deers-Rock/tools python3 "$BAK/p15_line_identity.py" "$V" --db "$W" --ledger-db "$W" --no-fresh-b --expect "$M")

echo "## clean scratch: the stricter NEW rules must accept the unplanted fixture (27 visits), and count what they compared"
"${NEW[@]}" --out /tmp/p18b_clean.csv > /tmp/p18b_clean.txt; chk "NEW unplanted exit" "$?" 0
tail -1 /tmp/p18b_clean.txt | cut -c1-260
chk "NEW unplanted: all 27 outcomes MATCH" "$(python3 -c "import json;r=json.load(open('/tmp/p18b_clean_encounters.json'));print(sum(1 for e in r if e['outcome']=='MATCH'))")" 27
chk "NEW unplanted: unit_keys_checked > 0 (the unit compare did run)" "$(python3 -c "import json;print('yes' if json.load(open('/tmp/p18b_clean_summary.json'))['unit_keys_checked']>0 else 'no')")" yes
chk "NEW unplanted: unit_keys_unchecked = 0" "$(python3 -c "import json;print(json.load(open('/tmp/p18b_clean_summary.json'))['unit_keys_unchecked'])")" 0
"${NEWNF[@]}" --out /tmp/p18b_cleannf.csv > /dev/null; chk "NEW unplanted --no-fresh-b exit" "$?" 0
"${OLDNF[@]}" --out /tmp/p18b_cleannf_old.csv > /dev/null; chk "OLD unplanted --no-fresh-b exit" "$?" 0

echo "## B3a a subset of the manifest's visits (before any plant, so the OLD arm is not confounded by one): reason text asserted (M10)"
head -26 "$V" > /tmp/p18b_sub.txt
python3 p15_line_identity.py /tmp/p18b_sub.txt --db $W --ledger-db $W --since "$SINCE" --expect "$M" --out /tmp/p18b_sub.csv > /tmp/p18b_sub_new.txt 2>&1; chk "B3a NEW exit 2" "$?" 2
chk "B3a NEW names the reason (INPUT-ERROR, visit set)" "$(grep -c 'INPUT-ERROR: expect mode: the visit list (26 visits) is not the manifest' /tmp/p18b_sub_new.txt)" 1
env PYTHONPATH=/opt/Deers-Rock/tools python3 "$BAK17/p15_line_identity.py" /tmp/p18b_sub.txt --db $W --ledger-db $W --since "$SINCE" --expect "$M" --out /tmp/p18b_sub_old.csv > /tmp/p18b_sub_old.txt 2>&1; RC=$?
chk "B3a OLD-P16 exit 0 and a summary line (accepts the subset: the defect)" "$RC/$(grep -c '^P15-LINE-IDENTITY: {' /tmp/p18b_sub_old.txt)" "0/1"
chk "B3a OLD-P16 printed no input error" "$(grep -c INPUT-ERROR /tmp/p18b_sub_old.txt)" 0

echo "## B4 p13_sample_compare.py without --since"
python3 p13_sample_compare.py "$V" --db $W --out /tmp/p18b_p13new.csv > /tmp/p18b_p13new.txt 2>&1; chk "B4 NEW exit 2" "$?" 2
chk "B4 NEW names the reason (--since)" "$(grep -c -e '--since' /tmp/p18b_p13new.txt)" 1
env PYTHONPATH=/opt/Deers-Rock/tools python3 "$BAK17/p13_sample_compare.py" "$V" --db $W --out /tmp/p18b_p13old.csv > /tmp/p18b_p13old.txt 2>&1; RC=$?
tail -2 /tmp/p18b_p13old.txt | cut -c1-200
chk "B4 OLD-P16 does not reject the missing --since (exit 0 or 1, no input error)" "$([ $RC -le 1 ] && [ "$(grep -c -e 'INPUT-ERROR' /tmp/p18b_p13old.txt)" = 0 ] && echo yes || echo no)" yes

echo "## B7a a billed key with no source row (all source rows of one no-delta encounter deleted)"
B7NR=$(python3 - "$M" "$W" <<'PY'
import json, subprocess, sys
man = json.load(open(sys.argv[1]))["visits"]; W = sys.argv[2]
q = lambda s: subprocess.run(["mysql", "-uroot", "-N", "-e", s], capture_output=True, text=True).stdout.strip()
for nr in sorted(man):
    if man[nr]["expected_delta"] == {}:
        a = int(q("SELECT COUNT(*) FROM %s.rawat_jl_dr WHERE no_rawat='%s'" % (W, nr)) or 0)
        b = int(q("SELECT COUNT(*) FROM %s.detail_pemberian_obat WHERE no_rawat='%s'" % (W, nr)) or 0)
        if a + b > 0:
            print(nr, a, b); break
PY
)
read B7NR NP ND <<< "$B7NR"
echo "B7a encounter: $B7NR source procedure rows $NP, drug rows $ND"
chk "B7a encounter selected" "$([ -n "$B7NR" ] && echo yes || echo no)" yes
echo "$B7NR" > /tmp/p18b_b7a.txt
if [ "${NP:-0}" -gt 0 ]; then plant B7a-proc "DELETE FROM $W.rawat_jl_dr WHERE no_rawat='$B7NR'" "$NP"; fi
if [ "${ND:-0}" -gt 0 ]; then plant B7a-drug "DELETE FROM $W.detail_pemberian_obat WHERE no_rawat='$B7NR'" "$ND"; fi
"${NEW[@]}" --out /tmp/p18b_a_new.csv > /tmp/p18b_a_new.txt; RCN=$?
"${OLD[@]}" --out /tmp/p18b_a_old.csv > /tmp/p18b_a_old.txt; RCO=$?
echo "B7a NEW: unit_src=$(field /tmp/p18b_a_new_encounters.json $B7NR unit_src) outcome=$(outcome /tmp/p18b_a_new_encounters.json $B7NR) checked=$(field /tmp/p18b_a_new_encounters.json $B7NR unit_keys_checked) unchecked=$(field /tmp/p18b_a_new_encounters.json $B7NR unit_keys_unchecked)"
echo "B7a OLD: unit_src=$(field /tmp/p18b_a_old_encounters.json $B7NR unit_src) outcome=$(outcome /tmp/p18b_a_old_encounters.json $B7NR) verdict=$(field /tmp/p18b_a_old_encounters.json $B7NR verdict)"
chk "B7a NEW: unit_src UNCHECKED" "$(field /tmp/p18b_a_new_encounters.json $B7NR unit_src)" UNCHECKED
chk "B7a NEW: outcome MISMATCH" "$(outcome /tmp/p18b_a_new_encounters.json $B7NR)" MISMATCH
chk "B7a OLD: unit_src MATCH (the compare was skipped: the vacuous pass)" "$(field /tmp/p18b_a_old_encounters.json $B7NR unit_src)" MATCH
chk "B7a OLD: outcome MATCH (the false pass)" "$(outcome /tmp/p18b_a_old_encounters.json $B7NR)" MATCH
chk "B7a NEW: no other encounter fails" "$(python3 -c "import json;r=json.load(open('/tmp/p18b_a_new_encounters.json'));print(sum(1 for e in r if e['outcome']!='MATCH'))")" 1
chk "B7a OLD: no encounter fails" "$(python3 -c "import json;r=json.load(open('/tmp/p18b_a_old_encounters.json'));print(sum(1 for e in r if e['outcome']!='MATCH'))")" 0
chk "B7a exit codes NEW/OLD" "$RCN/$RCO" "1/0"

echo "## B7b a second payment row of 0 under --no-fresh-b (the rule used to live only inside fresh-B)"
plant B7b "INSERT INTO $W.detail_nota_jalan (no_rawat,nama_bayar,besarppn,besar_bayar) VALUES ('2027/12/31/900016','P18-EXTRA',0,0)"
"${NEWNF[@]}" --out /tmp/p18b_b_new.csv > /dev/null; RCN=$?
"${OLDNF[@]}" --out /tmp/p18b_b_old.csv > /dev/null; RCO=$?
chk "B7b NEW --no-fresh-b: a second payment row -> MISMATCH" "$(outcome /tmp/p18b_b_new_encounters.json 2027/12/31/900016)" MISMATCH
chk "B7b OLD --no-fresh-b: MATCH (the false pass)" "$(outcome /tmp/p18b_b_old_encounters.json 2027/12/31/900016)" MATCH

echo "## N4 a NULL payment: OLD-P15 comparator vs NEW (reason asserted)"
CT=$(SQL "SELECT column_type FROM information_schema.columns WHERE table_schema='$W' AND table_name='detail_nota_jalan' AND column_name='besar_bayar'")
SQL "ALTER TABLE $W.detail_nota_jalan MODIFY besar_bayar $CT NULL;"
plant N4 "UPDATE $W.detail_nota_jalan SET besar_bayar=NULL WHERE no_rawat='2027/12/31/900024' LIMIT 1"
printf '2027/12/31/900024\n' > /tmp/p18b_one.txt
python3 p15_line_identity.py /tmp/p18b_one.txt --db $W --ledger-db $W --no-fresh-b > /tmp/p18b_n4new.txt 2>&1; chk "N4 NEW exit 2" "$?" 2
chk "N4 NEW names the reason (NULL payment column)" "$(grep -c 'INPUT-ERROR: NULL payment column in detail_nota_jalan for 2027/12/31/900024' /tmp/p18b_n4new.txt)" 1
env PYTHONPATH=/opt/Deers-Rock/tools python3 "$BAK16/p15_line_identity.py" /tmp/p18b_one.txt --db $W --ledger-db $W --no-fresh-b > /tmp/p18b_n4old.txt 2>&1; RC=$?
tail -1 /tmp/p18b_n4old.txt | cut -c1-200
chk "N4 OLD-P15 comparator: no input error and a summary line (it does not reject the NULL: the defect)" "$(grep -c INPUT-ERROR /tmp/p18b_n4old.txt)/$(grep -c '^P15-LINE-IDENTITY: {' /tmp/p18b_n4old.txt)" "0/1"

echo "## N7 (judge-level: the counts RB/CB/RL/CL are injected, no plant runs) the B6 judge, OLD-P15 vs NEW"
for who in OLD NEW; do
  S=$([ $who = OLD ] && echo "$BAK16/p15_b6_negctl.sh" || echo "p15_b6_negctl.sh")
  for kind in billing ledger; do
    LN=$(grep -F 'chk "B6 plant removed' "$S" | grep -F "$kind" | head -1)
    R=$(RB=1 CB=18 RL=1 CL=5 bash -c 'chk() { echo "$2"; }; eval "$1"' _ "$LN")
    echo "$who $kind judge on (injected counts: 1 of $([ $kind = billing ] && echo 18 || echo 5) executed): $R"
    eval "J_${who}_${kind}=$R"
  done
done
chk "N7 OLD-P15 judge accepts the under-executed counts (billing)" "$J_OLD_billing" yes
chk "N7 NEW judge rejects them (billing)" "$J_NEW_billing" no
chk "N7 OLD-P15 judge accepts the under-executed counts (ledger)" "$J_OLD_ledger" yes
chk "N7 NEW judge rejects them (ledger)" "$J_NEW_ledger" no
echo "P18-B-NC: PASS=$P FAIL=$F"
[ "$F" = "0" ]
