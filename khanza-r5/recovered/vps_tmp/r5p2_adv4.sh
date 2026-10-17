set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1 P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2
# clean tariff + ledger anchor
mysql -uroot sik_bench_p2 -e "TRUNCATE dr_tariff; INSERT INTO dr_tariff SELECT * FROM sik_bench.dr_tariff;"
mysql -uroot sik_bench_p2 -e "TRUNCATE dr_charge_ledger;"
env RUN_ID=r5p2_e0 python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/dev/null 2>&1
echo "baseline rc: $(env RUN_ID=r5p2_e0b python3 charge_delta_per_component_p2.py --stage A >/tmp/e0.log 2>&1; echo $?)"
grep -oE "gate \(all deltas == 0, other == 0\): (PASS|FAIL)" /tmp/e0.log | head -1

echo "=== (e) DELETE a drug ledger row for 000254 -> expect FAIL + UNEXPLAINED drug ==="
mysql -uroot sik_bench_p2 -e "DELETE FROM dr_charge_ledger WHERE no_rawat='2026/10/01/000254' AND component='drug';"
env RUN_ID=r5p2_e1 python3 charge_delta_per_component_p2.py --stage A >/tmp/e1.log 2>&1
echo "(e) rc=$?"
grep -oE "gate \(all deltas == 0, other == 0\): (PASS|FAIL)" /tmp/e1.log | head -1
grep -E "UNEXPLAINED 2026/10/01/000254" /tmp/e1.log | head -3

echo "=== (c) offsetting: delete a drug row AND add a fake drug row in ANOTHER visit -> partial mask ==="
mysql -uroot sik_bench_p2 -e "INSERT INTO dr_charge_ledger VALUES ('2026/10/02/800001','drug','B000001135',1,34584,34584,'legacy');"
env RUN_ID=r5p2_e2 python3 charge_delta_per_component_p2.py --stage A >/tmp/e2.log 2>&1
echo "(c) rc=$?"
grep -oE "gate \(all deltas == 0, other == 0\): (PASS|FAIL)" /tmp/e2.log | head -1
grep -E "UNEXPLAINED" /tmp/e2.log | head -4

echo "=== (f) three_count P2-OTHER-STATUS: inject an unknown-status billing row ==="
mysql -uroot sik_bench_p2 -e "TRUNCATE dr_charge_ledger;"
mysql -uroot sik_bench_p2 -e "INSERT IGNORE INTO dr_tariff SELECT * FROM sik_bench.dr_tariff;"
env RUN_ID=r5p2_e3 python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/dev/null 2>&1
mysql -uroot sik_p2 -e "INSERT INTO billing (no_rawat, status, nm_perawatan, biaya, jumlah, totalbiaya) SELECT no_rawat,'XX-UNKNOWN','Mystery',500,1,500 FROM reg_periksa WHERE no_rawat='2026/10/01/000254';"
env RUN_ID=r5p2_e4 python3 three_count_reconcile_p2.py --stage A >/tmp/e4.log 2>&1
echo "(f) three_count rc=$?"
grep -E "P2-OTHER-STATUS|verdict|P2-AC" /tmp/e4.log | head -4
