#!/bin/bash
# P17 follow-up chain after fix 1 (the P16 wiring tests knew nothing of the P17 xml-restore probe, and the
# P16 E1 mutation count did not know of the second restore site added by A6). Re-runs the two fixed P16
# control scripts on the final frozen bytes (manifest b) and records the final live state. The first chain's
# other evidence names bytes that did not change between manifests a and b.
# Usage: DR_LOCK_SESSION=<id> bash p17_chain_b.sh <bak-p16> <p17-manifest-b>
set -u
cd /opt/Deers-Rock/tools
BAK16=${1:?bak p16 dir}; MAN=${2:?manifest}
. ./dr_runlock.sh; dr_runlock_require p17_chain_b.sh
export DBUTIL_FORCE_ROOT=1
B=/opt/dr-benchmark/p17; mkdir -p $B/chain_b
step() { echo; echo "=== $* ($(date -u +%H:%M:%SZ)) ==="; }
frozen() { echo "frozen P17 (b): $(sha256sum -c "$MAN" 2>/dev/null | grep -c ': OK')/$(grep -c . "$MAN") OK; lsattr i-flag: $(awk '{print $2}' "$MAN" | xargs lsattr 2>/dev/null | awk '{print $1}' | grep -c i)"; }
step "0 FROZEN"; frozen
step "1 P16 A/E4 CONTROLS (wiring tests with the probe stub, exit 3 asserted on the pin case)"
bash p16_a_negctl.sh "$BAK16" > $B/chain_b/p16_a_negctl.txt 2>&1; L1=$?; grep -a "^PASS A3\|^FAIL\|P16-A-NC" $B/chain_b/p16_a_negctl.txt; echo "p16-a-nc exit=$L1"
step "2 P16 E1-E3 CONTROLS"
bash p16_e_negctl.sh "$BAK16" > $B/chain_b/p16_e_negctl.txt 2>&1; L2=$?; grep -a "^FAIL\|P16-E-NC" $B/chain_b/p16_e_negctl.txt; echo "p16-e-nc exit=$L2"
step "3 FINAL"; frozen; bash p14_live_state.sh p17-chain-b-final | tee $B/chain_b/live_state_final.txt
echo; echo "=== P17 CHAIN-B DONE: p16-a=$L1 p16-e=$L2 ==="
