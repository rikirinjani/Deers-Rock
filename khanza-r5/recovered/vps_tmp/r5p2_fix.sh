echo "=== all hard-qualified sik_bench. / sik. literals in the P2 builder ==="
grep -nE "sik_bench\.|sik\." /opt/Deers-Rock/tools/build_dr_charge_ledger_p2.py
echo "=== confirm: query LEDGER_DB.dr_tariff resolves to real sik_bench (685) when P2_LEDGER_DB=sik_bench_p2? ==="
cd /opt/Deers-Rock/tools
env DBUTIL_FORCE_ROOT=1 P2_LEDGER_DB=sik_bench_p2 python3 -c "
import os, sys; sys.path.insert(0,\"/opt/Deers-Rock/tools\"); import dbutil
LEDGER_DB = os.environ.get(\"P2_LEDGER_DB\",\"sik_bench\")
print(\"LEDGER_DB target =\", LEDGER_DB)
print(\"rows via dbutil.query(\\\"SELECT kind,code,dr_price FROM dr_tariff\\\") against\", LEDGER_DB)
try:
    r = dbutil.query(LEDGER_DB, \"SELECT COUNT(*) c FROM dr_tariff\")
    print(\"count =\", r)
except Exception as e:
    print(\"ERR\", type(e).__name__, str(e)[:200])
"
