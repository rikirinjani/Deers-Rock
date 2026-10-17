#!/bin/bash
set -e
# Redact AES key material from ALREADY-PRODUCED gl artifacts (this + prior session),
# then verify counts survive.
python3 - <<'EOF'
import re, glob
rx = re.compile(r"AES_ENCRYPT\('[^']*'\s*,\s*'[^']*'\)")
files = (glob.glob("/opt/dr-benchmark/results/20261011T173055Z/**/*.log", recursive=True)
         + glob.glob("/opt/dr-benchmark/results/test/**/general_log*", recursive=True)
         + glob.glob("/opt/dr-benchmark/results/g1test/**/*.log", recursive=True))
for p in files:
    try:
        s = open(p, errors="ignore").read()
    except OSError:
        continue
    if "AES_ENCRYPT('" in s:
        open(p, "w").write(rx.sub("AES_ENCRYPT(<redacted>)", s))
        print("redacted:", p)
print("done")
EOF
echo "=== insert counts still intact in run 173055Z gl ==="
grep -c "insert into billing" /opt/dr-benchmark/results/20261011T173055Z/general_log_G1.log
echo "=== residual key check (should print nothing) ==="
grep -rn "AES_ENCRYPT('" /opt/dr-benchmark/results/20261011T173055Z/ /opt/dr-benchmark/results/test/ /opt/dr-benchmark/results/g1test/ 2>/dev/null | head -3
echo SCRUB-OK
