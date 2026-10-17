#!/usr/bin/env bash
# Fix B1 rung failure: ensure results dir exists on resume paths (tee -a + pipefail).
set -euo pipefail
F=/opt/dr-benchmark/run_all.sh
echo "=== arg parser check ==="
grep -n 'run-id\|resume' "$F" | head -20
echo "=== apply patch ==="
if grep -q 'fix 2026-10-12: resume paths skip phase0 mkdir' "$F"; then
  echo ALREADY_PATCHED
else
  cp -a "$F" "$F.bak-$(date -u +%Y%m%dT%H%M%SZ)"
  python3 - "$F" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
anchor = "export RUN_ID"
i = s.find(anchor)
assert i >= 0, "anchor missing"
j = i + len(anchor)
ins = '\nmkdir -p "$RESULTS/$RUN_ID"   # fix 2026-10-12: resume paths skip phase0 mkdir; tee -a must not fail on missing dir (pipefail)'
s = s[:j] + ins + s[j:]
open(p, "w").write(s)
print("patched")
PY
fi
bash -n "$F" && echo SYNTAX_OK
grep -n 'mkdir -p "\$RESULTS/\$RUN_ID"' "$F" | head
