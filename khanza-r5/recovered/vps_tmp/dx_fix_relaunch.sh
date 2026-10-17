#!/usr/bin/env bash
set -euo pipefail
TOOLS=/opt/Deers-Rock/tools
python3 - "$TOOLS/generate_scale_encounters.py" <<'PY'
import sys
p = sys.argv[1]; s = open(p, encoding="utf-8").read()
old = "    tier_b = rng.sample(all_b, min(2000, len(all_b))) if all_b else []"
new = ("    n_b = min(2000, len(all_b))\n"
       "    idx = set()\n"
       "    while len(idx) < n_b:\n"
       "        idx.add(rng.randrange(len(all_b)))\n"
       "    tier_b = [all_b[i] for i in sorted(idx)] if all_b else []")
if new in s:
    print("already fixed")
elif old in s:
    open(p, "w", encoding="utf-8", newline="\n").write(s.replace(old, new, 1))
    print("tier_b sampler fixed")
else:
    raise SystemExit("anchor not found")
PY
python3 -W error::SyntaxWarning -m py_compile "$TOOLS/generate_scale_encounters.py" && echo "py_compile OK"
rm -f /tmp/dxv.done /tmp/dxv.out
nohup bash /tmp/dx_validate.sh > /tmp/dxv.out 2>&1 &
echo "dx_validate relaunched pid=$!"
sleep 45
echo "--- progress after 45s ---"
tail -8 /opt/dr-benchmark/p-chain/p5dx_validate.log 2>/dev/null
