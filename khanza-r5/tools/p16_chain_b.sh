#!/bin/bash
# P16 follow-up chain after fix 1 (p15_line_negctl.sh: my patch glued ': > /tmp/p15nc_empty.txt' onto the
# echo line, so the B4 empty-list control fed a non-empty file; the first chain's line controls were
# 32/33 for that reason only). Re-runs, on the final frozen bytes (manifest b), the steps that need the
# fixture clone: fixture-only C4 driver run, the line controls, teardown, final live state.
# The first chain's other evidence names bytes that did not change between manifests a and b.
# Usage: DR_LOCK_SESSION=<id> bash p16_chain_b.sh <bak-p16> <p16-manifest-b>
set -u
cd /opt/Deers-Rock/tools
BAK16=${1:?bak p16 dir}; MAN=${2:?manifest}
. ./dr_runlock.sh; dr_runlock_require p16_chain_b.sh
export DBUTIL_FORCE_ROOT=1
B=/opt/dr-benchmark/p16
FX=/opt/dr-benchmark/p14/fx_c
mkdir -p $B/chain_b
step() { echo; echo "=== $* ($(date -u +%H:%M:%SZ)) ==="; }
frozen() { echo "frozen P16 (b): $(sha256sum -c "$MAN" 2>/dev/null | grep -c ': OK')/$(grep -c . "$MAN") OK; lsattr i-flag: $(awk '{print $2}' "$MAN" | xargs lsattr 2>/dev/null | awk '{print $1}' | grep -c i)"; }
step "0 FROZEN"; frozen
step "1 FIXTURE-ONLY C4 DRIVER"
bash p14_edge_run.sh "$FX" > $B/chain_b/c4_fixture_driver.log 2>&1; D=$?
grep -aE "clone matches|REPRODUCES|DIFFERS|oracle\[|form\[|P15E|ABORT" $B/chain_b/c4_fixture_driver.log; echo "driver exit=$D"
FS=$(ls /opt/dr-benchmark/p15/runs/fixture_run_start_*.txt | sort | tail -1); FSINCE=$(cat "$FS"); echo "run start: $FSINCE ($FS)"
step "2 LINE CONTROLS"
bash p15_line_negctl.sh "$FX" "$FSINCE" "$BAK16" > $B/chain_b/line_negctl.txt 2>&1; L=$?; grep -a "^PASS\|^FAIL\|P15-LINE-NC" $B/chain_b/line_negctl.txt; echo "line-nc exit=$L"
step "3 TEARDOWN"; bash p14_drop_clone.sh sik_p14e
step "4 FINAL"; frozen; bash p14_live_state.sh p16-chain-b-final | tee $B/chain_b/live_state_final.txt
echo; echo "=== P16 CHAIN-B DONE: driver=$D line-nc=$L ==="
