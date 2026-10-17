#!/bin/bash
# Clean the stale :99 display + relaunch the G1 test with the fixed tool
set +e
pkill -f 'Xvfb :99' 2>/dev/null
sleep 1
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99 2>/dev/null
# Ensure the tool is the fixed version
cd /opt/Deers-Rock/tools
python3 -c 'import ast; ast.parse(open("oracle_diff_30_50.py").read()); print("SYNTAX OK")'
# Launch in background
nohup bash -c 'cd /opt/Deers-Rock/tools && RUN_ID=g1test python3 oracle_diff_30_50.py --attempt 1 > /opt/dr-benchmark/results/g1test/g1_oracle.log 2>&1' &
echo "relaunched G1 test pid=$!"
