#!/usr/bin/env bash
# pollA.sh — Phase A progress. Sleeps SLEEP_S then reports.
set -uo pipefail
S="${1:-240}"
sleep "$S"
echo "=== $(date -u +%H:%M:%S) poll ==="
if [ -f /tmp/phaseA.done ]; then echo "PHASEA: DONE"; fi
if [ -f /tmp/phaseA.fail ]; then echo "PHASEA: FAIL ($(cat /tmp/phaseA.fail))"; fi
ls /tmp/phaseA.done /tmp/phaseA.fail 2>/dev/null || echo "PHASEA: still running"
echo "--- phaseA.out tail 6 ---"
tail -6 /tmp/phaseA.out
echo "--- B3 oracle progress (last 3) ---"
tail -3 /opt/dr-benchmark/results/Bseries_20261012T045027Z/B3_oracle.log
echo "--- general log bytes: $(stat -c %s /tmp/general_log_B3.log 2>/dev/null) ---"
echo "--- mysql alive: $(mysql -uroot -N -B -e 'SELECT 1' 2>/dev/null || echo DOWN) ---"
pgrep -f sampled_real_form_diff >/dev/null || echo "(sampled diff process gone)"
