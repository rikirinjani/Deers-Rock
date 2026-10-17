set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1 P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2
# Restore the scratch ledger to the clean anchor state so injections are isolated.
mysql -uroot sik_bench_p2 -e "INSERT IGNORE INTO dr_tariff SELECT * FROM sik_bench.dr_tariff;"
mysql -uroot sik_bench_p2 -e "TRUNCATE dr_charge_ledger;"
env RUN_ID=r5p2_pre python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/dev/null 2>&1
echo "=== clean anchor baseline (gate should PASS on charge_delta) ==="
env RUN_ID=r5p2_base env P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2 python3 charge_delta_per_component_p2.py --stage A >/tmp/g_base.log 2>&1
echo "baseline rc=$? $(grep -oE "gate \(all deltas == 0, other == 0\): (PASS|FAIL)" /tmp/g_base.log | head -1)"

echo ""
echo "=== AC-6: (d) missing tariff row -> gate/ledger must be detectable ==="
mysql -uroot sik_bench_p2 -e "DELETE FROM dr_tariff WHERE kind='drug' AND code=(SELECT kode_brng FROM sik_p2.detail_pemberian_obat WHERE no_rawat='2026/10/01/000254' LIMIT 1);"
echo "  charge_delta after removing a tariff row (ledger rebuilt with fallback):"
mysql -uroot sik_bench_p2 -e "TRUNCATE dr_charge_ledger;"
env RUN_ID=r5p2_d1 python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr --allow-legacy-fallback >/dev/null 2>&1
env RUN_ID=r5p2_d1b python3 charge_delta_per_component_p2.py --stage A >/tmp/g_d1.log 2>&1
echo "  rc=$? $(grep -oE "gate \(all deltas == 0, other == 0\): (PASS|FAIL)" /tmp/g_d1.log | head -1)"

echo ""
echo "=== AC-6: (e) delete a drug ledger row -> unexplained delta appears ==="
mysql -uroot sik_bench_p2 -e "INSERT INTO dr_tariff SELECT * FROM sik_bench.dr_tariff;"
mysql -uroot sik_bench_p2 -e "TRUNCATE dr_charge_ledger;"
env RUN_ID=r5p2_d2 python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/dev/null 2>&1
mysql -uroot sik_bench_p2 -e "DELETE FROM dr_charge_ledger WHERE no_rawat='2026/10/01/000254' AND component='drug';"
env RUN_ID=r5p2_d2b python3 charge_delta_per_component_p2.py --stage A >/tmp/g_d2.log 2>&1
echo "  rc=$? $(grep -oE "gate \(all deltas == 0, other == 0\): (PASS|FAIL)" /tmp/g_d2.log | head -1)"
grep -E "UNEXPLAINED" /tmp/g_d2.log | head -3

echo ""
echo "=== AC-6: (b) wrong code same price -> per-visit delta on that code ==="
mysql -uroot sik_bench_p2 -e "INSERT INTO dr_tariff SELECT * FROM sik_bench.dr_tariff;"
mysql -uroot sik_bench_p2 -e "TRUNCATE dr_charge_ledger;"
env RUN_ID=r5p2_d3 python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/dev/null 2>&1
env RUN_ID=r5p2_d3b python3 charge_delta_per_component_p2.py --stage A >/tmp/g_d3.log 2>&1
echo "  rc=$? $(grep -oE "gate \(all deltas == 0, other == 0\): (PASS|FAIL)" /tmp/g_d3.log | head -1)"
