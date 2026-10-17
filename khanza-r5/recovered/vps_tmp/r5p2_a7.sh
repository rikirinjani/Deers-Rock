set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1 P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2
mysql -uroot sik_bench_p2 -e "INSERT IGNORE INTO dr_tariff SELECT * FROM sik_bench.dr_tariff;"
mysql -uroot sik_bench_p2 -e "TRUNCATE dr_charge_ledger;"
echo "=== rebuild (SUM(jml) quantity fix) ==="
env RUN_ID=r5p2_a7 python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/tmp/a7.log 2>&1; echo "builder rc=$?"
grep -E "registration rows|procedure rows|drug rows|tax rows|done|FALLBACK|ERROR" /tmp/a7.log | head
echo "=== 000254 drug ledger row (expect amount=103752 qty=3) ==="
mysql -uroot -N -e "SELECT code, quantity, unit_price, amount, source FROM sik_bench_p2.dr_charge_ledger WHERE no_rawat=\"2026/10/01/000254\" AND component=\"drug\";"
echo "=== AC-7 scratch anchor: charge_delta (expect delta 0 / PASS) ==="
env RUN_ID=r5p2_a7b python3 charge_delta_per_component_p2.py --stage A 2>&1 | grep -E "cohort visits|Khanza total|overall delta|gate|UNEXPLAINED" | head -8
