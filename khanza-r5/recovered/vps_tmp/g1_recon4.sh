#!/bin/bash
set -e
echo "=== dbutil._mysql: how query rows are shaped ==="
sed -n '1,48p' /opt/Deers-Rock/tools/dbutil.py
echo "=== confirm query() returns list-of-lists ==="
grep -nA8 'def query' /opt/Deers-Rock/tools/dbutil.py
echo "=== dbutil Tool.run_id from argv[1] — check it won't grab --attempt ==="
grep -nA4 'self.run_id' /opt/Deers-Rock/tools/dbutil.py
