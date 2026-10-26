#!/bin/bash
# P14: live-state proof (SELECT-only). Run at the start (baseline) and at the end (final).
# Usage: bash p14_live_state.sh <label>
set -u
cd /opt/Deers-Rock/tools
LABEL=${1:-state}
SQL() { mysql -uroot -N -e "$1"; }
echo "# P14 live state: $LABEL $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "databases: $(SQL 'SHOW DATABASES' | grep '^sik' | tr '\n' ' ')"
echo "database.xml: $(python3 p6_dbxml.py probe 2>&1 | grep '^\[dbxml\]' | awk '{print $NF}' | sort -u | tr '\n' ' ')"
echo "writer markers: $(ls /opt/dr-benchmark/results/.writer_exclusion_* 2>/dev/null | wc -l)"
echo "benchmark grants on sik/sik_bench: $(SQL "SELECT CONCAT(table_schema,':',privilege_type) FROM information_schema.schema_privileges WHERE grantee LIKE '%benchmark%' AND table_schema IN ('sik','sik_bench')" | tr '\n' ' ')"
echo "benchmark grants on P14 clones: $(SQL "SELECT CONCAT(table_schema,':',privilege_type) FROM information_schema.schema_privileges WHERE grantee LIKE '%benchmark%' AND table_schema LIKE 'sik_p14%'" | tr '\n' ' ')"
python3 - <<'PY'
import sys, hashlib
sys.path.insert(0, '/opt/Deers-Rock/tools'); import dbutil
rows = dbutil.query("sik_bench", "SELECT * FROM dr_charge_ledger ORDER BY no_rawat, component, code", force_root=True)
h = hashlib.sha256()
for r in rows: h.update(("|".join(str(c) for c in r) + "\n").encode())
print("live ledger: %d:%s" % (len(rows), h.hexdigest()))
PY
echo "fixture rows in live (reserved 2027/12/31/%): $(SQL "SELECT CONCAT((SELECT COUNT(*) FROM sik.reg_periksa WHERE no_rawat LIKE '2027/12/31/%'),'/',(SELECT COUNT(*) FROM sik.rawat_jl_dr WHERE no_rawat LIKE '2027/12/31/%'),'/',(SELECT COUNT(*) FROM sik.detail_pemberian_obat WHERE no_rawat LIKE '2027/12/31/%'),'/',(SELECT COUNT(*) FROM sik.billing WHERE no_rawat LIKE '2027/12/31/%'),'/',(SELECT COUNT(*) FROM sik_bench.dr_charge_ledger WHERE no_rawat LIKE '2027/12/31/%'))") (reg/proc/dpo/billing/ledger)"
echo "live sik counts: $(SQL "SELECT CONCAT((SELECT COUNT(*) FROM sik.reg_periksa),' reg, ',(SELECT COUNT(*) FROM sik.billing),' billing, ',(SELECT COUNT(*) FROM sik.nota_jalan),' nota, ',(SELECT COUNT(*) FROM sik.detail_nota_jalan),' dnota')")"
echo "frozen P12: $(sha256sum -c p11_frozen_20261024c.sha256 2>/dev/null | grep -c ': OK')/15 OK"
echo "frozen P13: $(sha256sum -c /opt/dr-benchmark/evidence/p13/r5_p13_frozen_manifest_20261025.sha256 2>/dev/null | grep -c ': OK')/6 OK"
echo "lock: $(bash dr_runlock.sh status 2>/dev/null | head -1)"
echo "disk: $(df -h / | tail -1)"
