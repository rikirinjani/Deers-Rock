#!/bin/bash
# P14 post-run chain (after p14_edge_run.sh kept sik_p14e): T4 fixture comparator (--expect),
# T3 negative controls, T5 real-cohort line identity, teardown, final live-state proof, freeze.
# Usage: DR_LOCK_SESSION=<id> bash p14_post.sh <fixture-dir> <real-visits-file>
set -u
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
FXDIR=${1:?fixture dir}; REAL=${2:?real visits}
. ./dr_runlock.sh; dr_runlock_require p14_post.sh
B=/opt/dr-benchmark/p14
mkdir -p $B/compare
echo "=== P14 post $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
echo "## T4 fixture comparator (--expect, ledger = clone ledger)"
python3 p14_line_identity.py "$FXDIR/p14_edge_visits.txt" --db sik_p14e --ledger-db sik_p14e \
  --expect "$FXDIR/p14_edge_manifest.json" --out $B/compare/fixture_lines.csv; echo "fixture_compare_exit=$?"
echo "## T3 negative controls"
bash p14_line_negctl.sh; echo "negctl_exit=$?"
echo "## T5 real-cohort line identity (300, ledger = live-pinned sik_bench)"
python3 p14_line_identity.py "$REAL" --db sik_p14e --ledger-db sik_bench --out $B/compare/real300_lines.csv \
  | tail -40; echo "real_compare_exit=${PIPESTATUS[0]}"
echo "## teardown"
bash p14_drop_clone.sh sik_p14e
echo "## final live state"
bash p14_live_state.sh final | tee $B/live_state_final.txt
echo "=== P14 post done $(date -u +%H:%M:%S) ==="
