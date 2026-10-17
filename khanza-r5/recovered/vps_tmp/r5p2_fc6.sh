set -e
cd /opt/Deers-Rock/tools
echo "=== AC-2 re-run (explicit rc capture) ==="
echo "--- case A: empty p2 dr_tariff, no fallback ---"
env RUN_ID=r5p2_fc4 DBUTIL_FORCE_ROOT=1 P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2 \
  python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/tmp/fc4.log 2>&1
echo "rc(no-fallback,empty)=$?"
grep -E "FAIL-CLOSED|EMPTY|done" /tmp/fc4.log | head
echo "--- case B: empty p2 dr_tariff, WITH --allow-legacy-fallback ---"
env RUN_ID=r5p2_fc5 DBUTIL_FORCE_ROOT=1 P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2 \
  python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr --allow-legacy-fallback >/tmp/fc5.log 2>&1
echo "rc(fallback,empty)=$?"
grep -E "FALLBACK-USED|EMPTY|done" /tmp/fc5.log | head
echo "--- case C: restore p2 dr_tariff from live, no fallback => should now BUILD (tariff ok) ---"
mysql -uroot sik_bench_p2 -e "INSERT INTO dr_tariff SELECT * FROM sik_bench.dr_tariff;"
mysql -uroot -N -e "SELECT \"p2 tariff\", COUNT(*) FROM sik_bench_p2.dr_tariff;"
env RUN_ID=r5p2_fc6 DBUTIL_FORCE_ROOT=1 P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2 \
  python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/tmp/fc6.log 2>&1
echo "rc(tariff-restored,no-fallback)=$?"
grep -E "dr_tariff authority|done" /tmp/fc6.log | head
