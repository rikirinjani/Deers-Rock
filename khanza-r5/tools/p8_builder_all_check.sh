# P8-B3/B5 (AC-3): the P8 builder (exact Decimal half-up irup, delete scope = insert
# scope) rebuilt into an EMPTY scratch ledger from live sik (read-only) must reproduce
# the live sik_bench ledger byte-for-byte. Same procedure as p7_integer_builder_all_check.sh.
set -u
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
W=sik_p8int
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
P2_LEDGER_DB=$W P2_CONSUMER_DB=sik RUN_ID=p8_int_all python3 build_dr_charge_ledger_p2.py --window ALL > /tmp/p8_int_all.log 2>&1; BRC=$?
echo "P8 builder (Decimal irup + cohort-scoped DELETE) --window ALL into empty scratch: exit=$BRC"
grep -aE "tax rows|SINGLE" /tmp/p8_int_all.log | cut -c1-140
# test hook (inert unless set): plant one wrong amount in the SCRATCH ledger to prove the
# check fails on a difference
if [ -n "${P9_PLANT_MISMATCH:-}" ]; then
  mysql -uroot -e "UPDATE $W.dr_charge_ledger SET amount=amount+1 ORDER BY no_rawat, component, code LIMIT 1;"
  echo "P9_PLANT_MISMATCH: one scratch amount changed by +1"
fi
L=$(lh sik_bench); S=$(lh $W)
echo "live   $L"; echo "scratch $S"
mysql -uroot -e "DROP DATABASE $W;"; echo "dbs: $(mysql -uroot -N -e 'SHOW DATABASES' | grep '^sik' | tr '\n' ' ')"
# P9-A6: exit 1 unless the build succeeded, both hashes were actually computed
# ("rows:sha256") and they are equal (before P9 this printed DIFFERS and exited 0)
HASHRE='^[0-9]+:[0-9a-f]{64}$'
if [ "$BRC" = "0" ] && [[ "$L" =~ $HASHRE ]] && [[ "$S" =~ $HASHRE ]] && [ "$L" = "$S" ]; then
  echo "INTEGER-BUILDER-REPRODUCES-LIVE-LEDGER (byte-identical)"; exit 0
fi
echo "DIFFERS (or the build failed / a hash could not be computed) - FAIL"; exit 1
