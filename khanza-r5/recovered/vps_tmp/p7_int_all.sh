set -u
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
W=sik_p7int
[ -n "$(mysql -uroot -N -e "SHOW DATABASES LIKE '$W'")" ] && { echo "$W exists"; exit 3; }
lh() { python3 - "$1" <<'PY'
import sys, hashlib
sys.path.insert(0,'/opt/Deers-Rock/tools'); import dbutil
rows = dbutil.query(sys.argv[1], "SELECT * FROM dr_charge_ledger ORDER BY no_rawat, component, code", force_root=True)
h = hashlib.sha256()
for r in rows: h.update(("|".join(str(c) for c in r) + "\n").encode())
print("%d:%s" % (len(rows), h.hexdigest()))
PY
}
mysql -uroot -e "CREATE DATABASE $W; CREATE TABLE $W.dr_charge_ledger LIKE sik_bench.dr_charge_ledger; CREATE TABLE $W.dr_tariff LIKE sik_bench.dr_tariff; INSERT INTO $W.dr_tariff SELECT * FROM sik_bench.dr_tariff;"
echo "builder sha: $(sha256sum build_dr_charge_ledger_p2.py | cut -c1-16)"
P2_LEDGER_DB=$W P2_CONSUMER_DB=sik RUN_ID=p7_int_all python3 build_dr_charge_ledger_p2.py --window ALL > /tmp/p7_int_all.log 2>&1; echo "integer builder --window ALL into empty scratch: exit=$?"
grep -aE "tax rows|SINGLE" /tmp/p7_int_all.log | cut -c1-140
L=$(lh sik_bench); S=$(lh $W)
echo "live   $L"; echo "scratch $S"; [ "$L" = "$S" ] && echo "INTEGER-BUILDER-REPRODUCES-LIVE-LEDGER (byte-identical)" || echo "DIFFERS"
mysql -uroot -e "DROP DATABASE $W;"; echo "dbs: $(mysql -uroot -N -e 'SHOW DATABASES' | grep '^sik' | tr '\n' ' ')"
