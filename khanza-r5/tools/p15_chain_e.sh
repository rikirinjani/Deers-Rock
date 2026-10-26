#!/bin/bash
# P15 follow-up chain after fix 2 (suite hash_p11 placement, B6 old-arm imports): re-runs, on the
# final frozen bytes (manifest b), the steps whose bytes changed: B6 NC, full fresh suite,
# preservation check, recovery unit test, the P11 negative controls; then the final live state.
# The A/B/C evidence of p15_chain.sh stands: none of its files changed between manifests a and b.
# Usage: DR_LOCK_SESSION=<id> bash p15_chain_e.sh <bak-dir> <p15-manifest-b>
set -u
cd /opt/Deers-Rock/tools
BAK=${1:?bak dir}; MAN=${2:?manifest}
. ./dr_runlock.sh; dr_runlock_require p15_chain_e.sh
export DBUTIL_FORCE_ROOT=1
B=/opt/dr-benchmark/p15
REAL=$B/p13_stage1_300_visits.txt
mkdir -p $B/chain_e
step() { echo; echo "=== $* ($(date -u +%H:%M:%SZ)) ==="; }
step "0 FROZEN"; echo "frozen P15 (b): $(sha256sum -c "$MAN" 2>/dev/null | grep -c ': OK')/$(grep -c . "$MAN") OK"
step "3e B6 NEGATIVE CONTROL"; bash p15_b6_negctl.sh "$BAK" "$REAL" > $B/chain_e/b6_negctl.txt 2>&1; B6RC=$?; grep -a "^PASS\|^FAIL\|P15-B6\|RESULT\|Error" $B/chain_e/b6_negctl.txt; echo "b6 exit=$B6RC"
step "5a E FULL FRESH SUITE"; bash p6_run_suite_fresh.sh > $B/chain_e/e_suite.log 2>&1; SRC=$?; grep -a "^PASS=\|^evidence:" $B/chain_e/e_suite.log | tail -2; echo "suite exit=$SRC"
step "5b E PRESERVATION CHECK"; bash p10_preservation_check.sh > $B/chain_e/e_preservation.log 2>&1; PRC=$?; grep -a "SNAPSHOT-BINDING\|PRESERVATION-\|^evidence:" $B/chain_e/e_preservation.log | tail -5; echo "preservation exit=$PRC"
step "5c E RECOVERY UNIT TEST"; python3 p8_recovery_unit_test.py > $B/chain_e/e_unit.txt 2>&1; URC=$?; tail -1 $B/chain_e/e_unit.txt; echo "unit exit=$URC"
step "5d E NEGATIVE CONTROLS (repaired runner)"; bash p11_negative_controls.sh > $B/chain_e/e_nc.log 2>&1; NRC=$?; grep -a "^NC [0-9]:\|DISCRIMINATING=\|^evidence:" $B/chain_e/e_nc.log; echo "nc exit=$NRC"
step "6 FINAL"; echo "frozen P15 (b): $(sha256sum -c "$MAN" 2>/dev/null | grep -c ': OK')/$(grep -c . "$MAN") OK"; bash p14_live_state.sh p15-final | tee $B/chain_e/live_state_final.txt
echo
echo "=== P15 CHAIN-E DONE: b6=$B6RC suite=$SRC preservation=$PRC unit=$URC nc=$NRC ==="
