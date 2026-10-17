#!/bin/bash
set -e
echo "=== syntax check ==="
python3 -c "import ast; ast.parse(open('/opt/Deers-Rock/tools/oracle_diff_30_50.py').read()); print('SYNTAX OK')"
echo "=== import dbutil check (dry) ==="
cd /opt/Deers-Rock/tools && python3 -c "import dbutil; print('dbutil imports:', hasattr(dbutil,'query'), hasattr(dbutil,'run_consumer'), hasattr(dbutil,'CONSUMER_CP'))"
