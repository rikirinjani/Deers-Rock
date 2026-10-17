#!/usr/bin/env bash
# recon_fix1_vps.sh — read-only: is the fix-1 dx work committed in the VPS DR repo?
set -uo pipefail
echo "=== /opt/Deers-Rock git state ==="
git -C /opt/Deers-Rock log --oneline -5 2>&1
echo "--- status (tools dir) ---"
git -C /opt/Deers-Rock status --porcelain 2>&1 | head -15
echo "--- diff HEAD~1 --stat (if >1 commit) ---"
git -C /opt/Deers-Rock diff HEAD~1 --stat 2>&1 | head -20
echo
echo "=== fix-1 artifacts on-box ==="
ls -la /opt/Deers-Rock/tools/generate_scale_encounters.py \
       /opt/Deers-Rock/tools/generate_scale_encounters.py.bak-dx \
       /opt/Deers-Rock/tools/write_diagnosa.py 2>&1
sha256sum /opt/Deers-Rock/tools/generate_scale_encounters.py \
          /opt/Deers-Rock/tools/write_diagnosa.py
echo
echo "=== dx code markers (function names) ==="
grep -n "def build_dx_pools\|def dx_template_set\|def dx_visit_codes\|dx=False\|args.dx" /opt/Deers-Rock/tools/generate_scale_encounters.py
grep -n "def main\|DELETE FROM diagnosa_pasien\|INSERT INTO diagnosa_pasien\|prioritas" /opt/Deers-Rock/tools/write_diagnosa.py | head -8
echo
echo "=== validation evidence (p5_validation.md verdicts) ==="
grep -E "verdict|PASS|MATCH|violations|top-5|A01.0|rows" /opt/dr-benchmark/p-chain/p5_validation.md 2>/dev/null | head -20
echo
echo "=== scratch run dirs ==="
ls -d /opt/dr-benchmark/results/p5dx_B1 /opt/dr-benchmark/results/p5dx_B1b /opt/dr-benchmark/results/p5ndx_B1 2>&1
