#!/usr/bin/env bash
set -euo pipefail
rm -f /tmp/phaseA.done /tmp/phaseA.fail /tmp/phaseA.out
nohup bash /tmp/phaseA.sh > /tmp/phaseA.out 2>&1 &
echo "phaseA launched pid=$!"
sleep 25
echo "--- phaseA.out after 25s ---"
tail -15 /tmp/phaseA.out
pgrep -af "sampled_real_form_diff" || echo "(sampled diff process not visible yet)"
