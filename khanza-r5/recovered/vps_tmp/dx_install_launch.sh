#!/usr/bin/env bash
set -euo pipefail
TOOLS=/opt/Deers-Rock/tools
# 1. backup + patch + compile
[ -f "$TOOLS/generate_scale_encounters.py.bak-dx" ] || cp -a "$TOOLS/generate_scale_encounters.py" "$TOOLS/generate_scale_encounters.py.bak-dx"
python3 /tmp/dx_patch.py "$TOOLS/generate_scale_encounters.py"
python3 -W error::SyntaxWarning -m py_compile "$TOOLS/generate_scale_encounters.py" && echo "generator py_compile OK"
install -m 0755 /tmp/write_diagnosa.py "$TOOLS/write_diagnosa.py"
sed -i 's/\r$//' "$TOOLS/write_diagnosa.py" "$TOOLS/generate_scale_encounters.py"
python3 -m py_compile "$TOOLS/write_diagnosa.py" && echo "write_diagnosa py_compile OK"
ls -la "$TOOLS/generate_scale_encounters.py" "$TOOLS/generate_scale_encounters.py.bak-dx" "$TOOLS/write_diagnosa.py"
# 2. launch validation detached
rm -f /tmp/dxv.done /tmp/dxv.out
nohup bash /tmp/dx_validate.sh > /tmp/dxv.out 2>&1 &
echo "dx_validate launched pid=$!"
sleep 30
echo "--- progress after 30s ---"
tail -6 /opt/dr-benchmark/p-chain/p5dx_validate.log 2>/dev/null || tail -6 /tmp/dxv.out
