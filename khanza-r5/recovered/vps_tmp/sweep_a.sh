#!/usr/bin/env bash
# Part A: read-only sweep for unintended side-effects from aborted dispatches
echo "=== A1: run_all.sh + all backups ==="
ls -la /opt/dr-benchmark/run_all.sh /opt/dr-benchmark/run_all.sh.bak* 2>/dev/null
echo
echo "=== A2: tools dir modified AFTER the DONE marker (unexpected changes) ==="
DONE=/opt/dr-benchmark/results/Bseries_20261012T045027Z/DONE
find /opt/Deers-Rock/tools -newer "$DONE" -type f 2>/dev/null
echo "(none-if-empty)"
echo
echo "=== A3: run dir files modified AFTER DONE (should be none) ==="
find /opt/dr-benchmark/results/Bseries_20261012T045027Z -newer "$DONE" -type f 2>/dev/null
echo "(none-if-empty)"
echo
echo "=== A4: rung_complete markers in run_all.sh ==="
grep -n "rung_complete" /opt/dr-benchmark/run_all.sh
echo
echo "=== A5: /tmp scratch dirs (aborted dispatches) ==="
ls -d /tmp/*/ 2>/dev/null | head -30
echo
echo "=== A6: scratch copies of results dirs in /tmp ==="
ls -d /tmp/*results* /tmp/*Bseries* /tmp/*copy* /tmp/*scratch* 2>/dev/null
echo "(none-if-empty)"
echo
echo "=== A7: dr-bench unit state + any stray run_all/consumer procs ==="
systemctl is-active dr-bench
ps aux | grep -E "run_all|KhanzaBillingConsumer|sampled_real_form|build_benchmark" | grep -v grep
echo "(none-if-empty)"
echo
echo "=== A8: reports-branch count (expect 1) ==="
grep -c "reports) phase6_reports" /opt/dr-benchmark/run_all.sh
echo
echo "=== A9: DONE marker ==="
cat "$DONE"
