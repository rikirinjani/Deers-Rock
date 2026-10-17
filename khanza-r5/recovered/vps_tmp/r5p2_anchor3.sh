set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1 P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2
# ensure fixture tariff is present
mysql -uroot sik_bench_p2 -e "INSERT IGNORE INTO dr_tariff SELECT * FROM sik_bench.dr_tariff;"
echo "p2 tariff rows: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_bench_p2.dr_tariff;")"
# clean rebuild with the per-occurrence-sum builder
mysql -uroot sik_bench_p2 -e "TRUNCATE dr_charge_ledger;"
echo "=== rebuild (fixed builder) ==="
env RUN_ID=r5p2_anchor3 python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/tmp/anchor3.log 2>&1; echo "builder rc=$?"
grep -E "registration rows|procedure rows|drug rows|tax rows|done|FALLBACK" /tmp/anchor3.log
echo "=== AC-7 on scratch anchor: charge_delta (expect delta 0 / PASS) ==="
env RUN_ID=r5p2_anchor3b python3 charge_delta_per_component_p2.py --stage A 2>&1 | grep -E "cohort visits|Khanza total|overall delta|gate|UNEXPLAINED" | head -6
