#!/bin/bash
# P20 predicate coverage (task doc s2 B3, O4), on a verified scratch copy sik_p14n of the fixture rows of sik_p14e.
# The comparator bytes are unchanged since P19, so this is NEW COVERAGE ON THE SAME BYTES, not an OLD/NEW pair:
# an encounter whose billed procedure name maps to two codes that both have source rows is AMBIGUOUS; the unit count
# leaves such keys out (tools/p15_line_identity.py: AMBIGUOUS:/UNMAPPED: keys are not counted as unchecked), and the
# encounter must still fail, in expect mode and in equal mode, by its verdict.
# Usage: DR_LOCK_SESSION=<id> bash p20_b_negctl.sh <fixture-dir> <since>
set -u
set -o pipefail
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
FXDIR=${1:?fixture dir}; SINCE=${2:?run start}
FX=sik_p14e; W=sik_p14n
. ./dr_runlock.sh; dr_runlock_require p20_b_negctl.sh
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
field() { python3 -c "import json,sys;r={e['no_rawat']:e for e in json.load(open(sys.argv[1]))};print(r[sys.argv[2]].get(sys.argv[3],'-'))" "$1" "$2" "$3"; }
nfail() { python3 -c "import json,sys;print(sum(1 for e in json.load(open(sys.argv[1])) if not e['pass']))" "$1"; }
NEW=(python3 p15_line_identity.py "$V" --db "$W" --ledger-db "$W" --since "$SINCE" --expect "$M")
python3 - "$M" > /tmp/p20b_eq_visits.txt <<'PY'
import json, sys
man = json.load(open(sys.argv[1]))["visits"]
for nr in sorted(man):
    if man[nr]["expected_delta"] == {}:
        print(nr)
PY
EQN=(python3 p15_line_identity.py /tmp/p20b_eq_visits.txt --db "$W" --ledger-db "$W" --no-fresh-b)

echo "## clean scratch: both modes accept"
"${NEW[@]}" --out /tmp/p20b_c_exp.csv > /tmp/p20b_c_exp.txt; chk "clean expect mode exit" "$?" 0
"${EQN[@]}" --out /tmp/p20b_c_eq.csv > /tmp/p20b_c_eq.txt; chk "clean equal mode exit" "$?" 0

echo "## O4 an AMBIGUOUS encounter: a duplicate jns_perawatan row (same name, new code) and a source row under the new code"
read ANR AKD <<< "$(python3 - "$W" <<'PY'
import subprocess, sys
W = sys.argv[1]
q = lambda s: subprocess.run(["mysql", "-uroot", "-N", "-e", s], capture_output=True, text=True).stdout.split()
for nr in [l.strip() for l in open("/tmp/p20b_eq_visits.txt") if l.strip()]:
    r = q("SELECT kd_jenis_prw FROM %s.rawat_jl_dr WHERE no_rawat='%s' LIMIT 1" % (W, nr))
    if r:
        print(nr, r[0]); break
PY
)"
echo "O4 encounter: $ANR, procedure code $AKD"
chk "O4 an encounter with a procedure source row selected" "$([ -n "$ANR" ] && [ -n "$AKD" ] && echo yes || echo no)" yes
plant O4-master "CREATE TEMPORARY TABLE $W.tmpj AS SELECT * FROM $W.jns_perawatan WHERE kd_jenis_prw='$AKD'; UPDATE $W.tmpj SET kd_jenis_prw='ZZAMB1'; INSERT INTO $W.jns_perawatan SELECT * FROM $W.tmpj" 1
plant O4-source "CREATE TEMPORARY TABLE $W.tmpr AS SELECT * FROM $W.rawat_jl_dr WHERE no_rawat='$ANR' AND kd_jenis_prw='$AKD' LIMIT 1; UPDATE $W.tmpr SET kd_jenis_prw='ZZAMB1'; INSERT INTO $W.rawat_jl_dr SELECT * FROM $W.tmpr" 1
"${NEW[@]}" --out /tmp/p20b_a_exp.csv > /tmp/p20b_a_exp.txt; RCX=$?
"${EQN[@]}" --out /tmp/p20b_a_eq.csv > /tmp/p20b_a_eq.txt; RCE=$?
echo "expect: verdict=$(field /tmp/p20b_a_exp_encounters.json $ANR verdict) outcome=$(field /tmp/p20b_a_exp_encounters.json $ANR outcome) unit_src=$(field /tmp/p20b_a_exp_encounters.json $ANR unit_src) unchecked=$(field /tmp/p20b_a_exp_encounters.json $ANR unit_keys_unchecked)"
echo "equal : verdict=$(field /tmp/p20b_a_eq_encounters.json $ANR verdict) pass=$(field /tmp/p20b_a_eq_encounters.json $ANR pass) unit_src=$(field /tmp/p20b_a_eq_encounters.json $ANR unit_src) unchecked=$(field /tmp/p20b_a_eq_encounters.json $ANR unit_keys_unchecked)"
chk "O4 expect mode: verdict AMBIGUOUS, outcome MISMATCH" "$(field /tmp/p20b_a_exp_encounters.json $ANR verdict)/$(field /tmp/p20b_a_exp_encounters.json $ANR outcome)" AMBIGUOUS/MISMATCH
chk "O4 equal mode: verdict AMBIGUOUS, pass False" "$(field /tmp/p20b_a_eq_encounters.json $ANR verdict)/$(field /tmp/p20b_a_eq_encounters.json $ANR pass)" AMBIGUOUS/False
chk "O4 the AMBIGUOUS key is not counted as unchecked (the stated exclusion) in either mode" "$(field /tmp/p20b_a_exp_encounters.json $ANR unit_keys_unchecked)/$(field /tmp/p20b_a_eq_encounters.json $ANR unit_keys_unchecked)" 0/0
chk "O4 exactly this encounter fails in each mode" "$(python3 -c "import json;print(sum(1 for e in json.load(open('/tmp/p20b_a_exp_encounters.json')) if e['outcome']!='MATCH'))")/$(nfail /tmp/p20b_a_eq_encounters.json)" 1/1
chk "O4 exit codes expect/equal" "$RCX/$RCE" "1/1"
echo "P20-B-NC: PASS=$P FAIL=$F"
[ "$F" = "0" ]
