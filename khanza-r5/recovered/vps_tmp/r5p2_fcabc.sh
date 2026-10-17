set -e
cd /opt/Deers-Rock/tools
echo "--- case A rc + log ---"
echo "rc(no-fallback,empty) A:"; env RUN_ID=r5p2_fcA DBUTIL_FORCE_ROOT=1 P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2 python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/tmp/fa.log 2>&1; echo "rc=$?"
grep -E "FAIL-CLOSED|EMPTY|done" /tmp/fa.log | head
echo "--- case B: empty p2 tariff (delete first), WITH fallback ---"
mysql -uroot sik_bench_p2 -e "DELETE FROM dr_tariff;"
env RUN_ID=r5p2_fcB DBUTIL_FORCE_ROOT=1 P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2 python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr --allow-legacy-fallback >/tmp/fb.log 2>&1; echo "rc=$?"
grep -E "FALLBACK-USED|EMPTY|done" /tmp/fb.log | head
echo "--- case C: restore p2 tariff, no fallback => BUILD ---"
mysql -uroot sik_bench_p2 -e "INSERT INTO dr_tariff SELECT * FROM sik_bench.dr_tariff;"
echo "p2 tariff rows: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_bench_p2.dr_tariff;")"
env RUN_ID=r5p2_fcC DBUTIL_FORCE_ROOT=1 P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2 python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/tmp/fc.log 2>&1; echo "rc=$?"
grep -E "dr_tariff authority|done" /tmp/fc.log | head
