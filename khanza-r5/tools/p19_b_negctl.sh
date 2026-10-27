#!/bin/bash
# P19 predicate controls (task doc s2 B1, B6), on a verified scratch copy sik_p14n of the fixture rows of sik_p14e.
# Every plant asserts ROW_COUNT. OLD = the P18 bytes (<bak-p19>); OLD-P16 = <bak-p17> (for the B4 summary check).
#   N1  mixed plant (expect mode): a no-delta encounter with a procedure key and a drug key; the source rows of the
#       drug are deleted, the procedure's stay. OLD (UNCHECKED only when no key was checked) MATCH, NEW MISMATCH
#       with unit_keys_checked >= 1 and unit_keys_unchecked >= 1.
#   AC-5 equal mode: (b) a source unit price changed by +1 (the form still bills the old price): OLD passes, NEW fails
#       unit_src DIFF; (c) all source rows of an encounter deleted: OLD passes, NEW UNCHECKED -> fails; (d) the clean
#       scratch passes in both arms with unit_keys_unchecked 0.
#   N2  B4 comparator (P16 p13_sample_compare.py without --since): the OLD arm asserts exit 0 or 1 AND the summary line.
# Usage: DR_LOCK_SESSION=<id> bash p19_b_negctl.sh <fixture-dir> <since> <bak-p19 (P18 bytes)> <bak-p17 (P16 bytes)>
set -u
set -o pipefail
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
FXDIR=${1:?fixture dir}; SINCE=${2:?run start}; BAK=${3:?bak p19 dir (P18 bytes)}; BAK17=${4:?bak p17 dir (P16 bytes)}
FX=sik_p14e; W=sik_p14n
. ./dr_runlock.sh; dr_runlock_require p19_b_negctl.sh
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
summ() { python3 -c "import json,sys;print(json.load(open(sys.argv[1]))[sys.argv[2]])" "$1" "$2"; }
NEW=(python3 p15_line_identity.py "$V" --db "$W" --ledger-db "$W" --since "$SINCE" --expect "$M")
OLD=(env PYTHONPATH=/opt/Deers-Rock/tools python3 "$BAK/p15_line_identity.py" "$V" --db "$W" --ledger-db "$W" --since "$SINCE" --expect "$M")

echo "## clean scratch, expect mode: the P19 rules accept the unplanted fixture"
"${NEW[@]}" --out /tmp/p19b_clean.csv > /tmp/p19b_clean.txt; chk "NEW unplanted exit" "$?" 0
tail -1 /tmp/p19b_clean.txt | cut -c1-300
chk "NEW unplanted: 27 MATCH" "$(python3 -c "import json;print(sum(1 for e in json.load(open('/tmp/p19b_clean_encounters.json')) if e['outcome']=='MATCH'))")" 27
chk "NEW unplanted: unit_keys_checked > 0" "$([ "$(summ /tmp/p19b_clean_summary.json unit_keys_checked)" -gt 0 ] && echo yes || echo no)" yes
chk "NEW unplanted: unit_keys_unchecked = 0" "$(summ /tmp/p19b_clean_summary.json unit_keys_unchecked)" 0

echo "## equal mode on the no-delta visits of the clean scratch"
python3 - "$M" > /tmp/p19b_eq_visits.txt <<'PY'
import json, sys
man = json.load(open(sys.argv[1]))["visits"]
for nr in sorted(man):
    if man[nr]["expected_delta"] == {}:
        print(nr)
PY
chk "equal-mode visit list has the no-delta visits" "$([ "$(wc -l < /tmp/p19b_eq_visits.txt)" -ge 10 ] && echo yes || echo no)" yes
EQN=(python3 p15_line_identity.py /tmp/p19b_eq_visits.txt --db "$W" --ledger-db "$W" --no-fresh-b)
EQO=(env PYTHONPATH=/opt/Deers-Rock/tools python3 "$BAK/p15_line_identity.py" /tmp/p19b_eq_visits.txt --db "$W" --ledger-db "$W" --no-fresh-b)
"${EQN[@]}" --out /tmp/p19b_eqc_new.csv > /tmp/p19b_eqc_new.txt; RCN=$?
"${EQO[@]}" --out /tmp/p19b_eqc_old.csv > /tmp/p19b_eqc_old.txt; RCO=$?
tail -1 /tmp/p19b_eqc_new.txt | cut -c1-300
chk "AC-5 d: clean scratch, equal mode: exit NEW/OLD" "$RCN/$RCO" "0/0"
chk "AC-5 d: NEW clean equal mode: unit_keys_checked > 0, unit_keys_unchecked 0" "$([ "$(summ /tmp/p19b_eqc_new_summary.json unit_keys_checked)" -gt 0 ] && echo yes || echo no)/$(summ /tmp/p19b_eqc_new_summary.json unit_keys_unchecked)" yes/0
chk "AC-5 d: OLD clean equal mode counted nothing (no gate)" "$(summ /tmp/p19b_eqc_old_summary.json unit_keys_checked)" 0

echo "## N1 the mixed plant (expect mode): one key's source rows deleted, another key's kept"
read N1NR N1TBL N1CNT <<< "$(python3 - "$M" "$W" <<'PY'
import json, subprocess, sys
man = json.load(open(sys.argv[1]))["visits"]; W = sys.argv[2]
q = lambda s: subprocess.run(["mysql", "-uroot", "-N", "-e", s], capture_output=True, text=True).stdout.strip()
for nr in sorted(man):
    if man[nr]["expected_delta"] != {}:
        continue
    a = int(q("SELECT COUNT(*) FROM %s.rawat_jl_dr WHERE no_rawat='%s'" % (W, nr)) or 0)
    b = int(q("SELECT COUNT(*) FROM %s.detail_pemberian_obat WHERE no_rawat='%s'" % (W, nr)) or 0)
    if a > 0 and b > 0:
        print(nr, "detail_pemberian_obat", b); break
PY
)"
echo "N1 encounter: $N1NR (delete $N1CNT drug source rows, keep the procedure rows)"
chk "N1 a mixed encounter (procedure and drug) selected" "$([ -n "$N1NR" ] && echo yes || echo no)" yes
plant N1 "DELETE FROM $W.detail_pemberian_obat WHERE no_rawat='$N1NR'" "$N1CNT"
"${NEW[@]}" --out /tmp/p19b_n1_new.csv > /tmp/p19b_n1_new.txt; RCN=$?
"${OLD[@]}" --out /tmp/p19b_n1_old.csv > /tmp/p19b_n1_old.txt; RCO=$?
echo "N1 NEW: unit_src=$(field /tmp/p19b_n1_new_encounters.json $N1NR unit_src) outcome=$(outcome /tmp/p19b_n1_new_encounters.json $N1NR) checked=$(field /tmp/p19b_n1_new_encounters.json $N1NR unit_keys_checked) unchecked=$(field /tmp/p19b_n1_new_encounters.json $N1NR unit_keys_unchecked)"
echo "N1 OLD: unit_src=$(field /tmp/p19b_n1_old_encounters.json $N1NR unit_src) outcome=$(outcome /tmp/p19b_n1_old_encounters.json $N1NR) checked=$(field /tmp/p19b_n1_old_encounters.json $N1NR unit_keys_checked) unchecked=$(field /tmp/p19b_n1_old_encounters.json $N1NR unit_keys_unchecked)"
chk "N1 NEW: unit_src UNCHECKED, outcome MISMATCH" "$(field /tmp/p19b_n1_new_encounters.json $N1NR unit_src)/$(outcome /tmp/p19b_n1_new_encounters.json $N1NR)" UNCHECKED/MISMATCH
chk "N1 NEW: at least one key checked and at least one not (the mixed shape)" "$([ "$(field /tmp/p19b_n1_new_encounters.json $N1NR unit_keys_checked)" -ge 1 ] && [ "$(field /tmp/p19b_n1_new_encounters.json $N1NR unit_keys_unchecked)" -ge 1 ] && echo yes || echo no)" yes
chk "N1 OLD: unit_src MATCH and outcome MATCH (the false pass of a mixed encounter)" "$(field /tmp/p19b_n1_old_encounters.json $N1NR unit_src)/$(outcome /tmp/p19b_n1_old_encounters.json $N1NR)" MATCH/MATCH
chk "N1 NEW: no other encounter fails" "$(python3 -c "import json;print(sum(1 for e in json.load(open('/tmp/p19b_n1_new_encounters.json')) if e['outcome']!='MATCH'))")" 1
chk "N1 exit codes NEW/OLD" "$RCN/$RCO" "1/0"

echo "## AC-5 equal mode plants: b) a source unit price changed, c) all source rows of an encounter deleted"
read EQBNR <<< "$(python3 - "$W" "$N1NR" <<'PY'
import subprocess, sys
W, skip = sys.argv[1], sys.argv[2]
q = lambda s: subprocess.run(["mysql", "-uroot", "-N", "-e", s], capture_output=True, text=True).stdout.split()
vis = [l.strip() for l in open("/tmp/p19b_eq_visits.txt") if l.strip() and l.strip() != skip]
for nr in vis:
    r = q("SELECT COUNT(*) FROM %s.rawat_jl_dr WHERE no_rawat='%s'" % (W, nr))
    if r and int(r[0]) >= 1:
        print(nr); break
PY
)"
read EQCNR EQCP EQCD <<< "$(python3 - "$W" "$N1NR" "$EQBNR" <<'PY'
import subprocess, sys
W, s1, s2 = sys.argv[1], sys.argv[2], sys.argv[3]
q = lambda s: subprocess.run(["mysql", "-uroot", "-N", "-e", s], capture_output=True, text=True).stdout.split()
vis = [l.strip() for l in open("/tmp/p19b_eq_visits.txt") if l.strip() and l.strip() not in (s1, s2)]
for nr in vis:
    a = int(q("SELECT COUNT(*) FROM %s.rawat_jl_dr WHERE no_rawat='%s'" % (W, nr))[0])
    b = int(q("SELECT COUNT(*) FROM %s.detail_pemberian_obat WHERE no_rawat='%s'" % (W, nr))[0])
    if a + b >= 1:
        print(nr, a, b); break
PY
)"
echo "AC-5 b encounter: $EQBNR; c encounter: $EQCNR (procedure rows $EQCP, drug rows $EQCD)"
chk "AC-5 two distinct encounters selected" "$([ -n "$EQBNR" ] && [ -n "$EQCNR" ] && [ "$EQBNR" != "$EQCNR" ] && echo yes || echo no)" yes
plant AC5b "UPDATE $W.rawat_jl_dr SET biaya_rawat=biaya_rawat+1 WHERE no_rawat='$EQBNR' LIMIT 1"
[ "${EQCP:-0}" -gt 0 ] && plant AC5c-proc "DELETE FROM $W.rawat_jl_dr WHERE no_rawat='$EQCNR'" "$EQCP"
[ "${EQCD:-0}" -gt 0 ] && plant AC5c-drug "DELETE FROM $W.detail_pemberian_obat WHERE no_rawat='$EQCNR'" "$EQCD"
# the N1 encounter is left in the list on purpose: it fails in NEW for the N1 reason in equal mode as well
"${EQN[@]}" --out /tmp/p19b_eq_new.csv > /tmp/p19b_eq_new.txt; RCN=$?
"${EQO[@]}" --out /tmp/p19b_eq_old.csv > /tmp/p19b_eq_old.txt; RCO=$?
passed() { python3 -c "import json,sys;r={e['no_rawat']:e for e in json.load(open(sys.argv[1]))};print(r[sys.argv[2]]['pass'])" "$1" "$2"; }
echo "b NEW: unit_src=$(field /tmp/p19b_eq_new_encounters.json $EQBNR unit_src) pass=$(passed /tmp/p19b_eq_new_encounters.json $EQBNR)   OLD: pass=$(passed /tmp/p19b_eq_old_encounters.json $EQBNR)"
echo "c NEW: unit_src=$(field /tmp/p19b_eq_new_encounters.json $EQCNR unit_src) pass=$(passed /tmp/p19b_eq_new_encounters.json $EQCNR)   OLD: pass=$(passed /tmp/p19b_eq_old_encounters.json $EQCNR)"
chk "AC-5 b NEW: the changed source unit price -> unit_src DIFF, pass False" "$(field /tmp/p19b_eq_new_encounters.json $EQBNR unit_src)/$(passed /tmp/p19b_eq_new_encounters.json $EQBNR)" DIFF/False
chk "AC-5 b OLD: pass True (the equal mode did not look at the source unit: the defect)" "$(passed /tmp/p19b_eq_old_encounters.json $EQBNR)" True
chk "AC-5 c NEW: all source rows gone -> UNCHECKED, pass False" "$(field /tmp/p19b_eq_new_encounters.json $EQCNR unit_src)/$(passed /tmp/p19b_eq_new_encounters.json $EQCNR)" UNCHECKED/False
chk "AC-5 c OLD: pass True" "$(passed /tmp/p19b_eq_old_encounters.json $EQCNR)" True
chk "AC-5 N1 encounter in equal mode: NEW fails, OLD passes" "$(passed /tmp/p19b_eq_new_encounters.json $N1NR)/$(passed /tmp/p19b_eq_old_encounters.json $N1NR)" False/True
chk "AC-5 NEW: exactly the three planted encounters fail" "$(python3 -c "import json;print(sum(1 for e in json.load(open('/tmp/p19b_eq_new_encounters.json')) if not e['pass']))")" 3
chk "AC-5 OLD: no encounter fails" "$(python3 -c "import json;print(sum(1 for e in json.load(open('/tmp/p19b_eq_old_encounters.json')) if not e['pass']))")" 0
chk "AC-5 exit codes NEW/OLD" "$RCN/$RCO" "1/0"

echo "## N2 B4 comparator: the OLD arm asserts its summary line, not just 'exit <= 1'"
env PYTHONPATH=/opt/Deers-Rock/tools python3 "$BAK17/p13_sample_compare.py" "$V" --db $W --out /tmp/p19b_p13old.csv > /tmp/p19b_p13old.txt 2>&1; RC=$?
tail -2 /tmp/p19b_p13old.txt | cut -c1-200
chk "N2 B4 OLD-P16 (no --since): exit 0 or 1, the 'P13 compare:' summary line is there, no input error" "$([ $RC -le 1 ] && echo ok)/$(grep -c '^P13 compare:' /tmp/p19b_p13old.txt)/$(grep -c INPUT-ERROR /tmp/p19b_p13old.txt)" ok/1/0
python3 p13_sample_compare.py "$V" --db $W --out /tmp/p19b_p13new.csv > /tmp/p19b_p13new.txt 2>&1; RC=$?
chk "N2 B4 NEW: exit 2 and the reason (--since) is named" "$RC/$(grep -c -e '--since' /tmp/p19b_p13new.txt)" 2/1
echo "P19-B-NC: PASS=$P FAIL=$F"
[ "$F" = "0" ]
