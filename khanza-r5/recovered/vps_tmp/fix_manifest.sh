#!/usr/bin/env bash
# Part C: fix manifest pipeline in run_all.sh + regenerate manifest.sha256 for the current run.
set -euo pipefail
F=/opt/dr-benchmark/run_all.sh
cp -a "$F" "$F.bak-manifestfix-$(date -u +%H%M%S)"

# C1: show the current broken manifest line
echo "=== current manifest line ==="
grep -n "manifest.sha256" "$F"

# C2: fix it — compute sha256 properly per-file (no xargs two-column bug)
python3 - "$F" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
old = '    find "$RUN_ID" -type f -printf \'%P %s\\n\' | sort | xargs -I{} sha256sum "$RUN_ID/{}" 2>/dev/null > "$RUN_ID/manifest.sha256"'
new = '''    ( cd "$RUN_ID" && find . -type f -print0 | sort -z | xargs -0 sha256sum > manifest.sha256 )'''
if old in s:
    s = s.replace(old, new, 1)
    open(p, "w").write(s)
    print("FIXED manifest pipeline")
else:
    print("old manifest line not found verbatim — dumping the tarball/manifest block for inspection:")
    import re
    m = re.search(r'\( cd "\$RESULTS".*?\)', s, re.S)
    print(m.group(0) if m else "(block not found)")
    sys.exit(1)
PY
bash -n "$F" && echo SYNTAX_OK

# C3: regenerate manifest.sha256 for the current run (standalone, no orchestrator)
R=/opt/dr-benchmark/results/Bseries_20261012T045027Z
echo "=== regenerating manifest.sha256 (was 0 bytes) ==="
( cd "$R" && find . -type f -not -name manifest.sha256 -print0 | sort -z | xargs -0 sha256sum > manifest.sha256 )
echo "manifest.sha256 lines: $(wc -l < "$R/manifest.sha256")"
head -3 "$R/manifest.sha256"
echo "..."
tail -2 "$R/manifest.sha256"
