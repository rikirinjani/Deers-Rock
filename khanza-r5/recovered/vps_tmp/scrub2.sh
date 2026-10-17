#!/bin/bash
python3 - <<'EOF'
import re, glob
rx = re.compile(r"AES_ENCRYPT\('[^']*'\s*,\s*'[^']*'\)")
files = glob.glob('/opt/dr-benchmark/results/20261011T173055Z/**/general_log_G1.*', recursive=True)
files += glob.glob('/opt/dr-benchmark/results/g1test/**/general_log_G1.*', recursive=True)
n = 0
for p in files:
    s = open(p, errors='ignore').read()
    if "AES_ENCRYPT('" in s:
        open(p, 'w').write(rx.sub('AES_ENCRYPT(<redacted>)', s))
        n += 1
print('redacted', n, 'files')
EOF
echo "=== residual check across ALL results (should print nothing) ==="
grep -rn "AES_ENCRYPT('" /opt/dr-benchmark/results/ 2>/dev/null | head -3
echo RESIDUAL-CHECK-DONE
echo "=== insert counts still intact ==="
grep -c "insert into billing" /opt/dr-benchmark/results/20261011T173055Z/general_log_G1.log /opt/dr-benchmark/results/20261011T173055Z/g1_attempt1/general_log_G1.log
