#!/bin/bash
# P17 predicate controls (task doc s2 B), on a verified scratch copy sik_p14n of the fixture rows of
# sik_p14e. Every plant asserts ROW_COUNT()=1. OLD = the P16 bytes (<bak-p17>); OLD-P15 = <bak-p16>.
#   B1  unit price changed with quantity and total unchanged, on a key with an expected delta:
#       OLD p15_line_identity.py MATCH (false pass), NEW MISMATCH (billed unit != the source row's unit).
#   B2  registration row written with jumlah 2 (the form writes 0): OLD MATCH, NEW MISMATCH.
#   B3a a subset of the manifest's visits: OLD exit 0, NEW exit 2.   B3b a second payment row of 0: OLD MATCH, NEW MISMATCH.
#   B4  p13_sample_compare.py without --since: OLD does not reject it, NEW exit 2.
#   N4  NULL payment: OLD-P15 comparator not exit 2, NEW exit 2.   N7 the B6 judge, OLD-P15 vs NEW (judge-level).
#   N8  the OLD-P15 kill function signals a reused pid, NEW does not.   N2 the unquoted-variable mechanism.
# Usage: DR_LOCK_SESSION=<id> bash p17_b_negctl.sh <fixture-dir> <since> <bak-p17> <bak-p16>
set -u
set -o pipefail
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
FXDIR=${1:?fixture dir}; SINCE=${2:?run start}; BAK=${3:?bak p17 dir}; BAK16=${4:?bak p16 dir}
FX=sik_p14e; W=sik_p14n
. ./dr_runlock.sh; dr_runlock_require p17_b_negctl.sh
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
plant() { local rc; rc=$(SQL "$2; SELECT ROW_COUNT();"); chk "plant $1 ROW_COUNT" "$rc" 1; }
outcome() { python3 -c "import json,sys;r={e['no_rawat']:e for e in json.load(open(sys.argv[1]))};print(r[sys.argv[2]]['outcome'])" "$1" "$2"; }
NEW=(python3 p15_line_identity.py "$V" --db "$W" --ledger-db "$W" --since "$SINCE" --expect "$M")
OLD=(env PYTHONPATH=/opt/Deers-Rock/tools python3 "$BAK/p15_line_identity.py" "$V" --db "$W" --ledger-db "$W" --since "$SINCE" --expect "$M")

echo "## clean scratch: the stricter NEW rules must accept the unplanted fixture (27 visits)"
"${NEW[@]}" --out /tmp/p17b_clean.csv | tail -1 | cut -c1-200; chk "NEW unplanted exit" "${PIPESTATUS[0]}" 0
chk "NEW unplanted: all 27 outcomes MATCH" "$(python3 -c "import json;r=json.load(open('/tmp/p17b_clean_encounters.json'));print(sum(1 for e in r if e['outcome']=='MATCH'))")" 27
"${OLD[@]}" --out /tmp/p17b_oldclean.csv > /dev/null; chk "OLD unplanted exit" "$?" 0

echo "## B3a a subset of the manifest's visits (clean scratch)"
head -26 "$V" > /tmp/p17b_sub.txt
python3 p15_line_identity.py /tmp/p17b_sub.txt --db $W --ledger-db $W --since "$SINCE" --expect "$M" --out /tmp/p17b_sub.csv > /tmp/p17b_sub_new.txt 2>&1; chk "B3a NEW rejects the subset (exit 2)" "$?" 2
env PYTHONPATH=/opt/Deers-Rock/tools python3 "$BAK/p15_line_identity.py" /tmp/p17b_sub.txt --db $W --ledger-db $W --since "$SINCE" --expect "$M" --out /tmp/p17b_sub_old.csv > /dev/null 2>&1; chk "B3a OLD accepts the subset (exit 0, the defect)" "$?" 0

echo "## B4 p13_sample_compare.py without --since (clean scratch)"
python3 p13_sample_compare.py "$V" --db $W --out /tmp/p17b_p13new.csv > /tmp/p17b_p13new.txt 2>&1; chk "B4 NEW exit 2" "$?" 2
env PYTHONPATH=/opt/Deers-Rock/tools python3 "$BAK/p13_sample_compare.py" "$V" --db $W --out /tmp/p17b_p13old.csv > /tmp/p17b_p13old.txt 2>&1; RC=$?
chk "B4 OLD does not reject the missing --since (exit != 2, the defect)" "$([ $RC -ne 2 ] && echo yes || echo no)" yes

echo "## plants B1, B2, B3b"
read B1NR B1IDX <<< "$(python3 - "$M" "$W" <<'PY'
import json, subprocess, sys
man = json.load(open(sys.argv[1]))["visits"]; W = sys.argv[2]
for nr in sorted(man):
    if man[nr]["expected_delta"]:
        out = subprocess.run(["mysql", "-uroot", "-N", "-e",
            "SELECT noindex FROM %s.billing WHERE no_rawat='%s' AND no='' AND pemisah=':' AND status IN ('Obat','Ralan Dokter') "
            "AND biaya>0 AND nm_perawatan NOT LIKE 'PPN%%' ORDER BY noindex LIMIT 1" % (W, nr)],
            capture_output=True, text=True).stdout.split()
        if out:
            print(nr, out[0]); break
PY
)"
echo "B1 encounter with an expected delta: $B1NR noindex $B1IDX"
chk "B1 encounter selected" "$([ -n "$B1NR" ] && [ -n "$B1IDX" ] && echo yes || echo no)" yes
plant B1 "UPDATE $W.billing SET biaya=biaya+1 WHERE no_rawat='$B1NR' AND noindex=$B1IDX"
plant B2 "UPDATE $W.billing SET jumlah=2 WHERE no_rawat='2027/12/31/900015' AND status='Registrasi'"
plant B3b "INSERT INTO $W.detail_nota_jalan (no_rawat,nama_bayar,besarppn,besar_bayar) VALUES ('2027/12/31/900016','P17-EXTRA',0,0)"
"${NEW[@]}" --out /tmp/p17b_new.csv > /dev/null; chk "planted NEW exit" "$?" 1
"${OLD[@]}" --out /tmp/p17b_old.csv > /dev/null; chk "planted OLD exit (it misses all three)" "$?" 0
chk "B1 NEW: unit price changed, quantity and total unchanged -> MISMATCH" "$(outcome /tmp/p17b_new_encounters.json $B1NR)" MISMATCH
chk "B1 OLD: MATCH (the false pass)" "$(outcome /tmp/p17b_old_encounters.json $B1NR)" MATCH
chk "B2 NEW: registration row jumlah 2 -> MISMATCH" "$(outcome /tmp/p17b_new_encounters.json 2027/12/31/900015)" MISMATCH
chk "B2 OLD: MATCH (the false pass)" "$(outcome /tmp/p17b_old_encounters.json 2027/12/31/900015)" MATCH
chk "B3b NEW: a second payment row -> MISMATCH" "$(outcome /tmp/p17b_new_encounters.json 2027/12/31/900016)" MISMATCH
chk "B3b OLD: MATCH (the false pass)" "$(outcome /tmp/p17b_old_encounters.json 2027/12/31/900016)" MATCH
chk "NEW: no other encounter fails" "$(python3 -c "import json;r=json.load(open('/tmp/p17b_new_encounters.json'));print(sum(1 for e in r if e['outcome']!='MATCH'))")" 3

echo "## N4 a NULL payment: OLD-P15 comparator vs NEW"
CT=$(SQL "SELECT column_type FROM information_schema.columns WHERE table_schema='$W' AND table_name='detail_nota_jalan' AND column_name='besar_bayar'")
SQL "ALTER TABLE $W.detail_nota_jalan MODIFY besar_bayar $CT NULL;"
plant N4 "UPDATE $W.detail_nota_jalan SET besar_bayar=NULL WHERE no_rawat='2027/12/31/900024' LIMIT 1"
printf '2027/12/31/900024\n' > /tmp/p17b_one.txt
python3 p15_line_identity.py /tmp/p17b_one.txt --db $W --ledger-db $W --no-fresh-b > /tmp/p17b_n4new.txt 2>&1; chk "N4 NEW exit 2" "$?" 2
env PYTHONPATH=/opt/Deers-Rock/tools python3 "$BAK16/p15_line_identity.py" /tmp/p17b_one.txt --db $W --ledger-db $W --no-fresh-b > /tmp/p17b_n4old.txt 2>&1; RC=$?
chk "N4 OLD-P15 comparator does not reject it (exit != 2, the defect)" "$([ $RC -ne 2 ] && echo yes || echo no)" yes

echo "## N7 the B6 judge, OLD-P15 vs NEW, with a plant that removed 1 of 18 billing rows and 1 of 5 ledger rows"
for who in OLD NEW; do
  S=$([ $who = OLD ] && echo "$BAK16/p15_b6_negctl.sh" || echo "p15_b6_negctl.sh")
  for kind in billing ledger; do
    LN=$(grep -F 'chk "B6 plant removed' "$S" | grep -F "$kind" | head -1)
    R=$(RB=1 CB=18 RL=1 CL=5 bash -c 'chk() { echo "$2"; }; eval "$1"' _ "$LN")
    echo "$who $kind judge on (deleted 1 of $([ $kind = billing ] && echo 18 || echo 5)): $R"
    eval "J_${who}_${kind}=$R"
  done
done
chk "N7 OLD-P15 judge accepts the under-executed plant (billing)" "$J_OLD_billing" yes
chk "N7 NEW judge rejects it (billing)" "$J_NEW_billing" no
chk "N7 OLD-P15 judge accepts the under-executed plant (ledger)" "$J_OLD_ledger" yes
chk "N7 NEW judge rejects it (ledger)" "$J_NEW_ledger" no

echo "## N8 a reused pid: OLD-P15 kill function vs NEW"
RR=p17_n8_t; RD=/opt/dr-benchmark/results/$RR/B3; rm -rf /opt/dr-benchmark/results/$RR; mkdir -p $RD
alive() { kill -0 "$(cat "$1")" 2>/dev/null && echo alive || echo dead; }
leader_old_file() { setsid bash -c 'echo $$ > "$0"; exec sleep 300' "$1" > /dev/null 2>&1 & for _ in 1 2 3 4 5 6 7 8 9 10; do [ -s "$1" ] && break; sleep 0.3; done; sleep 1; touch -d "10 minutes ago" "$1"; }
leader_old_file $RD/harness_x.log.pid
bash -c ". $BAK16/p15_lib.sh; p15_kill_run_harness $RR" 2>/dev/null; sleep 1
chk "N8 OLD-P15 signals a foreign leader whose pid file is older than it (the defect)" "$(alive $RD/harness_x.log.pid)" dead
leader_old_file $RD/harness_x.log.pid
bash -c ". ./p15_lib.sh; p15_kill_run_harness $RR" 2>/dev/null; sleep 1
chk "N8 NEW does not signal it" "$(alive $RD/harness_x.log.pid)" alive
kill -KILL -- -"$(cat $RD/harness_x.log.pid)" 2>/dev/null; kill -KILL "$(cat $RD/harness_x.log.pid)" 2>/dev/null
rm -rf /opt/dr-benchmark/results/$RR

echo "## N2 the mechanism: an unquoted variable holding a timestamp splits at the space"
nargs() { echo $#; }
S2="2026-10-26 14:06:49.371182"
chk "N2 unquoted: 3 arguments (the comparator got the date only)" "$(nargs --since $S2)" 3
chk "N2 quoted or array: 2 arguments" "$(nargs --since "$S2")" 2
echo "P17-B-NC: PASS=$P FAIL=$F"
[ "$F" = "0" ]
