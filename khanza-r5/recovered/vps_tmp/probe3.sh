#!/bin/bash
echo "=== tools dir ==="
ls -la /opt/Deers-Rock/tools/ 2>/dev/null
echo "=== g1test validation ==="
cat /opt/dr-benchmark/results/g1test/g1_validation.md 2>/dev/null
echo "=== g1test oracle log tail ==="
tail -40 /opt/dr-benchmark/results/g1test/g1_oracle.log 2>/dev/null
