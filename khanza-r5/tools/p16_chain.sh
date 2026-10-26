#!/bin/bash
# P16 evidence chain (task doc s3 steps 3-7), one held lock, on the frozen P16 byte set.
#   0 frozen set + lsattr + live-state baseline
#   1 lib tests (A2/N8 included) and the P15 A1-A3 controls (old = .bak_p15)
#   2 P16 controls: p16_a_negctl.sh (A1/A3/E4), p16_e_negctl.sh (E1/E2/E3)
#   3 C4 rerun: p14_edge_run.sh fixture + the 300 real visits on a fresh clone; comparators
#     (P16 fresh-B rule, NULL payments), P13 comparator checks, line controls, B6; teardown
#   4 regression on the changed suite/preservation bytes: full fresh suite, preservation check,
#     recovery unit test, P11 negative controls
#   5 final live-state proof, frozen set and lsattr re-checked
# Usage: DR_LOCK_SESSION=<id> bash p16_chain.sh <bak-p15> <bak-p16> <p16-manifest>
set -u
cd /opt/Deers-Rock/tools
BAK15=${1:?bak p15 dir}; BAK16=${2:?bak p16 dir}; MAN=${3:?p16 manifest}
. ./dr_runlock.sh; dr_runlock_require p16_chain.sh
export DBUTIL_FORCE_ROOT=1
B=/opt/dr-benchmark/p16
FX=/opt/dr-benchmark/p14/fx_c
REAL=/opt/dr-benchmark/p15/p13_stage1_300_visits.txt
PIN="356355:a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7"
mkdir -p $B/chain
step() { echo; echo "=== $* ($(date -u +%H:%M:%SZ)) ==="; }
frozen() {
  echo "frozen P16: $(sha256sum -c "$MAN" 2>/dev/null | grep -c ': OK')/$(grep -c . "$MAN") OK"
  echo "lsattr i-flag: $(awk '{print $2}' "$MAN" | xargs lsattr 2>/dev/null | awk '{print $1}' | grep -c i)/$(grep -c . "$MAN")"
}
cp "$REAL" $B/chain/ 2>/dev/null

step "0 FROZEN + LIVE BASELINE"; frozen; awk '{print $2}' "$MAN" | xargs lsattr > $B/chain/lsattr_chain_start.txt; bash p14_live_state.sh p16-chain-baseline | tee $B/chain/live_state_baseline.txt
step "1a LIB TEST (A4-A7, A2/N8)"; bash p15_lib_test.sh "$PIN" > $B/chain/a_lib_test.txt 2>&1; L1=$?; tail -1 $B/chain/a_lib_test.txt; echo "lib exit=$L1"
step "1b P15 A1-A3 CONTROLS (old = .bak_p15)"; bash p15_a_negctl.sh "$BAK15" "$FX" "$REAL" > $B/chain/a_negctl.txt 2>&1; L2=$?; grep -a "^PASS\|^FAIL\|P15-A-NC" $B/chain/a_negctl.txt; echo "a-nc exit=$L2"
step "2a P16 A/E4 CONTROLS"; bash p16_a_negctl.sh "$BAK16" > $B/chain/p16_a_negctl.txt 2>&1; L3=$?; grep -a "^PASS\|^FAIL\|P16-A-NC" $B/chain/p16_a_negctl.txt; echo "p16-a-nc exit=$L3"
step "2b P16 E1/E2/E3 CONTROLS"; bash p16_e_negctl.sh "$BAK16" > $B/chain/p16_e_negctl.txt 2>&1; L4=$?; grep -a "^PASS\|^FAIL\|P16-E-NC" $B/chain/p16_e_negctl.txt; echo "p16-e-nc exit=$L4"

step "3 C4 FIXTURE + 300 REAL ON A FRESH CLONE"
bash p14_edge_run.sh "$FX" "$REAL" > $B/chain/c4_driver.log 2>&1; C4=$?
grep -aE "clone matches|REPRODUCES|DIFFERS|grant:|oracle\[|form\[|P15E|STOP|ABORT|cleanup" $B/chain/c4_driver.log
echo "driver exit=$C4"
FS=$(ls /opt/dr-benchmark/p15/runs/fixture_run_start_*.txt 2>/dev/null | sort | tail -1); RS=$(ls /opt/dr-benchmark/p15/runs/real_run_start_*.txt 2>/dev/null | sort | tail -1)
FSINCE=$(cat "$FS" 2>/dev/null); RSINCE=$(cat "$RS" 2>/dev/null)
echo "run starts: fixture=$FSINCE ($FS) real=$RSINCE ($RS)"

step "3a FIXTURE (expect mode, clone ledger)"
python3 p15_line_identity.py $FX/p14_edge_visits.txt --db sik_p14e --ledger-db sik_p14e --since "$FSINCE" \
  --expect $FX/p14_edge_manifest.json --out $B/chain/fixture_lines.csv > $B/chain/fixture_compare.txt 2>&1; C5=$?
tail -1 $B/chain/fixture_compare.txt; echo "fixture compare exit=$C5"
step "3b REAL 300 (equal mode, live-pinned ledger)"
python3 p15_line_identity.py $REAL --db sik_p14e --ledger-db sik_bench --since "$RSINCE" \
  --out $B/chain/real300_lines.csv > $B/chain/real300_compare.txt 2>&1; C6=$?
tail -1 $B/chain/real300_compare.txt; echo "real compare exit=$C6"
step "3c P13 COMPARATOR"
python3 p13_sample_compare.py $REAL --db sik_p14e --since "$RSINCE" --out $B/chain/p13cmp_pos.csv > $B/chain/p13cmp_pos.txt 2>&1; echo "positive (since=run start) exit=$? (0 expected)"; tail -2 $B/chain/p13cmp_pos.txt
python3 p13_sample_compare.py $REAL --db sik_p14e --since "2099-01-01 00:00:00" --out $B/chain/p13cmp_future.csv > $B/chain/p13cmp_future.txt 2>&1; echo "since in the future exit=$? (1 expected)"
{ head -3 $REAL; head -1 $REAL; } > /tmp/p16_dup.txt
python3 p13_sample_compare.py /tmp/p16_dup.txt --db sik_p14e --since "$RSINCE" > $B/chain/p13cmp_dup.txt 2>&1; echo "duplicate list exit=$? (2 expected)"
step "3d LINE CONTROLS (B1-B5d, B3, C2; old p15 comparator = .bak_p16)"
bash p15_line_negctl.sh "$FX" "$FSINCE" "$BAK16" > $B/chain/line_negctl.txt 2>&1; L5=$?; grep -a "^PASS\|^FAIL\|P15-LINE-NC" $B/chain/line_negctl.txt; echo "line-nc exit=$L5"
step "3e B6 CONTROL (old p12 = .bak_p15)"
bash p15_b6_negctl.sh "$BAK15" "$REAL" > $B/chain/b6_negctl.txt 2>&1; L6=$?; grep -a "^PASS\|^FAIL\|P15-B6" $B/chain/b6_negctl.txt; echo "b6 exit=$L6"
step "3f TEARDOWN"; bash p14_drop_clone.sh sik_p14e

step "4a FULL FRESH SUITE"; bash p6_run_suite_fresh.sh > $B/chain/e_suite.log 2>&1; S1=$?; grep -a "^PASS=\|^evidence:" $B/chain/e_suite.log | tail -2; echo "suite exit=$S1"
step "4b PRESERVATION CHECK"; bash p10_preservation_check.sh > $B/chain/e_preservation.log 2>&1; S2=$?; grep -a "SNAPSHOT-BINDING\|PRESERVATION-\|^evidence:" $B/chain/e_preservation.log | tail -5; echo "preservation exit=$S2"
step "4c RECOVERY UNIT TEST"; python3 p8_recovery_unit_test.py > $B/chain/e_unit.txt 2>&1; S3=$?; tail -1 $B/chain/e_unit.txt; echo "unit exit=$S3"
step "4d P11 NEGATIVE CONTROLS"; bash p11_negative_controls.sh > $B/chain/e_nc.log 2>&1; S4=$?; grep -a "^NC [0-9]:\|DISCRIMINATING=\|^evidence:" $B/chain/e_nc.log; echo "nc exit=$S4"
[ "$(mysql -uroot -N -e "SHOW DATABASES LIKE 'sik_p6f'")" = "sik_p6f" ] && echo "note: sik_p6f still present after the NC runner"

step "5 FINAL"; frozen; awk '{print $2}' "$MAN" | xargs lsattr > $B/chain/lsattr_chain_end.txt; bash p14_live_state.sh p16-chain-final | tee $B/chain/live_state_final.txt
echo
echo "=== P16 CHAIN DONE: lib=$L1 a-nc=$L2 p16-a=$L3 p16-e=$L4 c4=$C4 fixture=$C5 real=$C6 line-nc=$L5 b6=$L6 suite=$S1 preservation=$S2 unit=$S3 nc=$S4 ==="
