#!/bin/bash
set -e
cd /opt/Deers-Rock/tools
python3 -c 'import ast; ast.parse(open("oracle_diff_30_50.py").read()); print("SYNTAX OK")'
nohup bash -c 'cd /opt/Deers-Rock/tools && RUN_ID=g1test python3 oracle_diff_30_50.py --attempt 1 > /opt/dr-benchmark/results/g1test/g1_oracle.log 2>&1' &
echo "bg launched pid=$!"
