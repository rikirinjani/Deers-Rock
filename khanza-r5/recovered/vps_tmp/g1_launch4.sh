#!/bin/bash
# Re-launch G1 test with the reset_to_unpaid fix in place.
set +e
pkill -f 'Xvfb :99' 2>/dev/null; sleep 1
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99 2>/dev/null
# Clean up any stale /tmp gl files from prior runs
rm -rf /tmp/g1test 2>/dev/null
cd /opt/Deers-Rock/tools
python3 -c "import ast; ast.parse(open('oracle_diff_30_50.py').read()); print('SYNTAX OK')"
nohup bash -c 'cd /opt/Deers-Rock/tools && RUN_ID=g1test python3 oracle_diff_30_50.py --attempt 1 > /opt/dr-benchmark/results/g1test/g1_oracle.log 2>&1' &
echo "relaunched G1 test pid=$!"
