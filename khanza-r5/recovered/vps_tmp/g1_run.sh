#!/bin/bash
set -e
cd /opt/Deers-Rock/tools
# Re-upload not needed if the file is already on-box; but ensure latest version:
# (orchestrator will scp; here just run the existing on-box copy after a fix re-upload)
RUN_ID=g1test timeout 300 python3 oracle_diff_30_50.py --attempt 1 2>&1 | tail -45
echo "rc=$?"
