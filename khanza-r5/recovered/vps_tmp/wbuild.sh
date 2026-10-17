set -u
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
W=sik_wtest
[ -n "$(mysql -uroot -N -e "SHOW DATABASES LIKE '$W'")" ] && { echo "$W exists - refusing"; exit 1; }
lh() { python3 - "$1" <<'PY'
import sys, hashlib
sys.path.insert(0,'/opt/Deers-Rock/tools'); import dbutil
rows = dbutil.query(sys.argv[1], "SELECT * FROM dr_charge_ledger ORDER BY no_rawat, component, code")
h = hashlib.sha256()
for r in rows: h.update(("|".join(str(c) for c in r) + "\n").encode())
print("%d:%s" % (len(rows), h.hexdigest()[:24]))
PY
}
mysql -uroot -e "CREATE DATABASE $W; CREATE TABLE $W.dr_charge_ledger LIKE sik_bench.dr_charge_ledger; INSERT INTO $W.dr_charge_ledger SELECT * FROM sik_bench.dr_charge_ledger; CREATE TABLE $W.dr_tariff LIKE sik_bench.dr_tariff; INSERT INTO $W.dr_tariff SELECT * FROM sik_bench.dr_tariff;"
LIVE=$(lh sik_bench); echo "live sik_bench ledger:        $LIVE"
# poison the scratch copy: a stale Stage-A-window key and a stale generated key — an ALL rebuild must remove both
mysql -uroot -e "INSERT INTO $W.dr_charge_ledger VALUES ('2026/10/01/000254','drug','ZZSTALE',1,1,1,'stale'),('2026/03/14/899999','drug','ZZSTALE',1,1,1,'stale');"
echo "scratch before ALL rebuild:   $(lh $W)"
T0=$(date +%s)
P2_LEDGER_DB=$W P2_CONSUMER_DB=sik RUN_ID=wbuild_all timeout 1800 python3 build_dr_charge_ledger_p2.py --window ALL > /tmp/wbuild_all.log 2>&1; echo "builder --window ALL exit=$? wall=$(( $(date +%s)-T0 ))s"
grep -aE "rows:|SINGLE|FAIL-CLOSED|Traceback" /tmp/wbuild_all.log | head -6 | cut -c1-160
A=$(lh $W); echo "scratch after ALL rebuild:    $A  $([ "$A" = "$LIVE" ] && echo BYTE-IDENTICAL-TO-LIVE || echo DIFFERS)"
P2_LEDGER_DB=$W P2_CONSUMER_DB=sik RUN_ID=wbuild_oct timeout 900 python3 build_dr_charge_ledger_p2.py --window 2026-10 > /tmp/wbuild_oct.log 2>&1; echo "builder --window 2026-10 exit=$?"
B=$(lh $W); echo "scratch after Oct rebuild:    $B  $([ "$B" = "$LIVE" ] && echo BYTE-IDENTICAL-TO-LIVE || echo DIFFERS)"
echo "live sik_bench after:         $(lh sik_bench)"
