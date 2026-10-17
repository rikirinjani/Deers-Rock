set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1 P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2
# restore the fixture tariff so a clean build matches the canonical ledger
echo "=== restore p2 dr_tariff from live (685 rows) ==="
mysql -uroot sik_bench_p2 -e "INSERT IGNORE INTO dr_tariff SELECT * FROM sik_bench.dr_tariff;"
echo "p2 tariff now: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_bench_p2.dr_tariff;")"
# snapshot the canonical p2 ledger BEFORE adversarial injection (so AC-6 faults are reversible)
cp /dev/null /tmp/p2_ledger_pre.sql
mysql -uroot sik_bench_p2 -e "SELECT * FROM dr_charge_ledger" > /tmp/p2_ledger_pre.tsv
echo "pre-injection p2 ledger rows: $(wc -l < /tmp/p2_ledger_pre.tsv)"
echo "=== clean baseline: rebuild p2 ledger, then gate should PASS ==="
env RUN_ID=r5p2_clean python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/tmp/clean.log 2>&1; echo "builder rc=$?"
grep -E "registration rows|procedure rows|drug rows|tax rows|done" /tmp/clean.log | head
env RUN_ID=r5p2_clean env P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2 \
  python3 charge_delta_per_component_p2.py --stage A 2>&1 | grep -E "cohort visits|Khanza total|overall delta|gate" | head
