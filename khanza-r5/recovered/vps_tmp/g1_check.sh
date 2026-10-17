#!/bin/bash
# Syntax check the deployed tool + confirm the reset_to_unpaid fix is present
set +e
cd /opt/Deers-Rock/tools
echo "=== md5 ==="
md5sum oracle_diff_30_50.py
echo "=== syntax ==="
python3 -c "import ast; ast.parse(open('oracle_diff_30_50.py').read()); print('SYNTAX OK')"
echo "=== fix markers ==="
echo "reset_to_unpaid count: $(grep -c 'reset_to_unpaid' oracle_diff_30_50.py)"
echo "sukses_true count: $(grep -c 'sukses_true' oracle_diff_30_50.py)"
