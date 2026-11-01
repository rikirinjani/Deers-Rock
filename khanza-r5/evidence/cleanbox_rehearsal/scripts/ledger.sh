mysql -uroot -N -e "select table_schema,count(*) from information_schema.tables where table_schema like 'sik%' group by 1; select count(*) from sik_bench.dr_charge_ledger"
cd /opt/Deers-Rock/tools; python3 - <<'PY'
import sys, hashlib
sys.path.insert(0, '/opt/Deers-Rock/tools'); import dbutil
rows = dbutil.query("sik_bench", "SELECT * FROM dr_charge_ledger ORDER BY no_rawat, component, code", force_root=True)
h = hashlib.sha256()
for r in rows: h.update(("|".join(str(c) for c in r) + "\n").encode())
print("live ledger: %d:%s" % (len(rows), h.hexdigest()))
PY
ls /opt/dr-benchmark/evidence/p13/ 2>&1 | head -3
