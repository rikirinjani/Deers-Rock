set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
export P2_CONSUMER_DB=sik_p2
export P2_LEDGER_DB=sik_bench_p2
echo "=== AC-2 case A: empty p2 dr_tariff, NO fallback => expect FAIL-CLOSED rc=1 ==="
mysql -uroot sik_bench_p2 -e "DELETE FROM dr_tariff;"
env RUN_ID=r5p2_A python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/tmp/r5p2_A.log 2>&1; echo "caseA rc=$?"
grep -E "FAIL-CLOSED|EMPTY|refusing" /tmp/r5p2_A.log | head -3
echo "=== AC-2 case B: empty p2 dr_tariff, WITH --allow-legacy-fallback => expect build + FALLBACK-USED rc=0 ==="
env RUN_ID=r5p2_B python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr --allow-legacy-fallback >/tmp/r5p2_B.log 2>&1; echo "caseB rc=$?"
grep -E "FALLBACK-USED|legacy|done" /tmp/r5p2_B.log | head -3
echo "=== AC-2 case C: p2 dr_tariff POPULATED, no fallback => expect build rc=0 ==="
mysql -uroot sik_bench_p2 -e "INSERT INTO dr_tariff SELECT * FROM sik_bench.dr_tariff;"
echo "p2 dr_tariff rows now: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_bench_p2.dr_tariff;")"
env RUN_ID=r5p2_C python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/tmp/r5p2_C.log 2>&1; echo "caseC rc=$?"
grep -E "dr_tariff authority|done|FALLBACK" /tmp/r5p2_C.log | head -3
