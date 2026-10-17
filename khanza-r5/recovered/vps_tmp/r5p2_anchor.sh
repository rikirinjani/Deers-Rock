set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1 P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2
# 1. restore the fixture tariff (685 rows) so the builder is not fail-closed
mysql -uroot sik_bench_p2 -e "INSERT IGNORE INTO dr_tariff SELECT * FROM sik_bench.dr_tariff;"
echo "p2 tariff rows: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_bench_p2.dr_tariff;")"
# 2. start from an EMPTY p2 ledger so the rebuild is clean and cohort-consistent
mysql -uroot sik_bench_p2 -e "TRUNCATE dr_charge_ledger;"
# 3. rebuild the p2 ledger for 2026-10 DR cohort (now with the cohort-scoped tax fix)
env RUN_ID=r5p2_anchor python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/tmp/anchor.log 2>&1; echo "builder rc=$?"
grep -E "registration rows|procedure rows|drug rows|tax rows|done|FALLBACK" /tmp/anchor.log | head
echo "=== AC-7 on the scratch anchor: charge_delta should now PASS ==="
env RUN_ID=r5p2_anchor env P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2 \
  python3 charge_delta_per_component_p2.py --stage A 2>&1 | grep -E "cohort visits|Khanza total|overall delta|gate"
