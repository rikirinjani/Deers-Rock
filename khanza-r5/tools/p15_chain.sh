#!/bin/bash
# P15 evidence chain (task doc s3), one held lock, on the frozen P15 byte set.
#   0 frozen sets (P12 15 / P13 6 / P14 12 / P15 manifest) + live-state baseline
#   1 A: p15_lib_test.sh (A4-A7) and p15_a_negctl.sh (A1-A3, old vs new bytes)
#   2 C4: p14_edge_run.sh fixture + the 300 P13 stage-1 visits on a fresh clone
#   3 B/C: p15_line_identity.py on the fixture (--expect) and on the 300 (vs live-pinned ledger);
#          P13 comparator B4/B5 checks; p15_line_negctl.sh (B1-B5, C2 old vs new); p15_b6_negctl.sh
#   4 teardown of the clone
#   5 E: full fresh suite, preservation check, recovery unit test, P11 negative controls 5/5
#   6 final live-state proof; frozen sets re-checked
# Usage: DR_LOCK_SESSION=<id> bash p15_chain.sh <bak-dir> <p15-manifest>
set -u
cd /opt/Deers-Rock/tools
BAK=${1:?bak dir}; MAN=${2:?p15 manifest}
. ./dr_runlock.sh; dr_runlock_require p15_chain.sh
export DBUTIL_FORCE_ROOT=1
B=/opt/dr-benchmark/p15
FX=/opt/dr-benchmark/p14/fx_c
REAL=$B/p13_stage1_300_visits.txt
PIN="356355:a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7"
mkdir -p $B/chain
step() { echo; echo "=== $* ($(date -u +%H:%M:%SZ)) ==="; }
frozen() {
  echo "frozen P12: $(sha256sum -c p11_frozen_20261024c.sha256 2>/dev/null | grep -c ': OK')/15 OK (P15 replaces some of these bytes; see the P15 manifest)"
  echo "frozen P15: $(sha256sum -c "$MAN" 2>/dev/null | grep -c ': OK')/$(grep -c . "$MAN") OK"
}
cp "$REAL" $B/chain/ 2>/dev/null

step "0 FROZEN + LIVE BASELINE"; frozen; bash p14_live_state.sh p15-chain-baseline | tee $B/chain/live_state_baseline.txt
step "1a A4-A7 LIB TEST"; bash p15_lib_test.sh "$PIN" > $B/chain/a_lib_test.txt 2>&1; A1RC=$?; tail -1 $B/chain/a_lib_test.txt; echo "lib exit=$A1RC"
step "1b A1-A3 NEGATIVE CONTROLS"; bash p15_a_negctl.sh "$BAK" "$FX" "$REAL" > $B/chain/a_negctl.txt 2>&1; A2RC=$?; grep -a "^PASS\|^FAIL\|P15-A-NC" $B/chain/a_negctl.txt; echo "a-nc exit=$A2RC"

step "2 C4 FIXTURE + 300 REAL ON A FRESH CLONE"
bash p14_edge_run.sh "$FX" "$REAL" > $B/chain/c4_driver.log 2>&1; C4RC=$?
grep -aE "clone matches|REPRODUCES|DIFFERS|grant:|oracle\[|form\[|P15E|STOP|ABORT|cleanup" $B/chain/c4_driver.log
echo "driver exit=$C4RC"
FS=$(ls $B/runs/fixture_run_start_*.txt 2>/dev/null | sort | tail -1); RS=$(ls $B/runs/real_run_start_*.txt 2>/dev/null | sort | tail -1)
FSINCE=$(cat "$FS" 2>/dev/null); RSINCE=$(cat "$RS" 2>/dev/null)
echo "run starts: fixture=$FSINCE real=$RSINCE"

step "3a C1/B1-B5 FIXTURE (expect mode, clone ledger)"
python3 p15_line_identity.py $FX/p14_edge_visits.txt --db sik_p14e --ledger-db sik_p14e --since "$FSINCE" \
  --expect $FX/p14_edge_manifest.json --out $B/chain/fixture_lines.csv > $B/chain/fixture_compare.txt 2>&1; FXRC=$?
tail -1 $B/chain/fixture_compare.txt; echo "fixture compare exit=$FXRC"
step "3b C1/B3-B5 REAL 300 (equal mode, live-pinned ledger)"
python3 p15_line_identity.py $REAL --db sik_p14e --ledger-db sik_bench --since "$RSINCE" \
  --out $B/chain/real300_lines.csv > $B/chain/real300_compare.txt 2>&1; RLRC=$?
tail -1 $B/chain/real300_compare.txt; echo "real compare exit=$RLRC"
step "3c P13 COMPARATOR B4/B5"
python3 p13_sample_compare.py $REAL --db sik_p14e --since "$RSINCE" --out $B/chain/p13cmp_pos.csv > $B/chain/p13cmp_pos.txt 2>&1; echo "positive (since=run start) exit=$? (0 expected)"; tail -2 $B/chain/p13cmp_pos.txt
python3 p13_sample_compare.py $REAL --db sik_p14e --since "2099-01-01 00:00:00" --out $B/chain/p13cmp_future.csv > $B/chain/p13cmp_future.txt 2>&1; echo "since in the future exit=$? (1 expected: no fresh-B row in the window)"
{ head -3 $REAL; head -1 $REAL; } > /tmp/p15_dup.txt
python3 p13_sample_compare.py /tmp/p15_dup.txt --db sik_p14e --since "$RSINCE" > $B/chain/p13cmp_dup.txt 2>&1; echo "duplicate list exit=$? (2 expected)"
step "3d B1-B5 + C2 NEGATIVE CONTROLS"
bash p15_line_negctl.sh "$FX" "$FSINCE" > $B/chain/line_negctl.txt 2>&1; LNRC=$?; grep -a "^PASS\|^FAIL\|P15-LINE-NC" $B/chain/line_negctl.txt; echo "line-nc exit=$LNRC"
step "3e B6 NEGATIVE CONTROL"
bash p15_b6_negctl.sh "$BAK" "$REAL" > $B/chain/b6_negctl.txt 2>&1; B6RC=$?; grep -a "^PASS\|^FAIL\|P15-B6" $B/chain/b6_negctl.txt; echo "b6 exit=$B6RC"

step "4 TEARDOWN"; bash p14_drop_clone.sh sik_p14e

step "5a E FULL FRESH SUITE"; bash p6_run_suite_fresh.sh > $B/chain/e_suite.log 2>&1; SRC=$?; grep -a "^PASS=\|^evidence:" $B/chain/e_suite.log | tail -2; echo "suite exit=$SRC"
step "5b E PRESERVATION CHECK"; bash p10_preservation_check.sh > $B/chain/e_preservation.log 2>&1; PRC=$?; grep -a "SNAPSHOT-BINDING\|PRESERVATION-\|^evidence:" $B/chain/e_preservation.log | tail -5; echo "preservation exit=$PRC"
step "5c E RECOVERY UNIT TEST"; python3 p8_recovery_unit_test.py > $B/chain/e_unit.txt 2>&1; URC=$?; grep -a "^FAIL\|E5 \|E6 \|cases" $B/chain/e_unit.txt | tail -16; echo "unit exit=$URC"
step "5d E NEGATIVE CONTROLS (repaired runner)"; bash p11_negative_controls.sh > $B/chain/e_nc.log 2>&1; NRC=$?; grep -a "^NC [0-9]:\|DISCRIMINATING=\|^evidence:" $B/chain/e_nc.log; echo "nc exit=$NRC"
[ "$(mysql -uroot -N -e "SHOW DATABASES LIKE 'sik_p6f'")" = "sik_p6f" ] && echo "note: sik_p6f still present after the NC runner"

step "6 FINAL"; frozen; bash p14_live_state.sh p15-chain-final | tee $B/chain/live_state_final.txt
echo
echo "=== P15 CHAIN DONE: lib=$A1RC a-nc=$A2RC c4=$C4RC fixture=$FXRC real=$RLRC line-nc=$LNRC b6=$B6RC suite=$SRC preservation=$PRC unit=$URC nc=$NRC ==="
