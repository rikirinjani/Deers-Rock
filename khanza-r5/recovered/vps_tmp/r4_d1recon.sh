#!/bin/bash
# r4_d1recon: existing restore script + snapshot layout + naive-script location
echo "== snapshot dir =="
ls -la /opt/dr-benchmark/snapshots/d1_20261013T072755Z/ 2>/dev/null || echo no-snapshot-dir
echo "== counts.json =="
cat /opt/dr-benchmark/snapshots/d1_20261013T072755Z/counts.json 2>/dev/null || echo no-counts
echo "== existing restore scripts =="
find /opt/dr-benchmark /opt/Deers-Rock/tools -maxdepth 3 -name '*restore*' -o -name '*d1*' 2>/dev/null | grep -v snapshots | head -20
echo "== LATEST_D1 pointer =="
cat /opt/dr-benchmark/snapshots/LATEST_D1 2>/dev/null || echo no-pointer
echo D1RECON_DONE
