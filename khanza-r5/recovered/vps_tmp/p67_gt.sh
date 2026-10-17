#!/usr/bin/env bash
set -euo pipefail
R=/opt/dr-benchmark/results/Bseries_20261012T045027Z
echo "===== telemetry_B1.json (python dump keys) ====="
python3 - "$R/telemetry_B1.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
def walk(o,p="",depth=0):
    if depth>2: return
    if isinstance(o,dict):
        for k,v in o.items():
            print("%s%s: %s" % ("  "*depth, k, type(v).__name__), (str(v)[:100] if not isinstance(v,(dict,list)) else ""))
            walk(v,p+"/"+k,depth+1)
    elif isinstance(o,list) and o:
        print("%s[0]: %s" % ("  "*depth, str(o[0])[:120]))
walk(d)
PY
echo
echo "===== state.json ====="
cat /opt/dr-benchmark/state/state.json
echo
echo "===== run_manifest.json ====="
cat /opt/dr-benchmark/run_manifest.json
echo
echo "===== g1_validation.md head 30 (from 20261011T230938Z) ====="
head -30 /opt/dr-benchmark/results/20261011T230938Z/g1_validation.md
echo
echo "===== stageA_replay_A.log tail 15 ====="
tail -15 /opt/dr-benchmark/results/20261011T230938Z/stageA_replay_A.log
echo
echo "===== B2_sampled_form_diff.md head 12 ====="
head -12 "$R/B2_sampled_form_diff.md"
echo
echo "===== B2_oracle.log head 20 ====="
head -20 "$R/B2_oracle.log"
