#!/bin/bash
# Check the deployed G1 tool
set +e
cd /opt/Deers-Rock/tools
echo "=== md5 ==="
md5sum oracle_diff_30_50.py
echo "=== strict_match present ==="
grep -c 'strict_match' oracle_diff_30_50.py
echo "=== syntax ==="
python3 -c "import ast; ast.parse(open('oracle_diff_30_50.py').read()); print('SYNTAX OK')"
