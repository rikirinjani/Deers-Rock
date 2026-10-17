#!/bin/bash
set -e
# Record JDK env change + relaunch orchestrator
python3 - <<'PY'
import sys
sys.path.insert(0, "/opt/Deers-Rock/tools")
from dbutil import decision
decision("openjdk-17-jdk-headless installed (javac for consumer recompile)",
         "fix_seed_leakage requires recompiling KhanzaBillingConsumer.java on-box; "
         "only openjdk-17-jre was installed (no javac). Installed openjdk-17-jdk-headless "
         "17.0.20.1 (same JVM line as the existing JRE; adds javac only). No Khanza "
         "source/jar, firewall, auth, or DB-permission changes.")
print("decision recorded")
PY
echo "=== stale dr-bench units ==="
systemctl list-units 'dr-bench*' --no-pager --no-legend 2>/dev/null || true
systemctl reset-failed dr-bench 2>/dev/null || true
echo "=== launch ==="
RUN="$(date -u +%Y%m%dT%H%M%SZ)"
systemd-run --unit=dr-bench -- bash /opt/dr-benchmark/run_all.sh --run-id "$RUN"
echo "launched run_id=$RUN"
