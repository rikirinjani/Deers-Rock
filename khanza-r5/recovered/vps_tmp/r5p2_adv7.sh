set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1 P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2
run(){ env RUN_ID="$1" python3 charge_delta_per_component_p2.py --stage A >/tmp/$1.log 2>&1; echo "$1 rc=$? $(grep -oE \"gate \(all deltas == 0, other == 0\): (PASS|FAIL)\" /tmp/$1.log | head -1)"; }
# clean anchor
mysql -uroot sik_bench_p2 -e "TRUNCATE dr_tariff; INSERT INTO dr_tariff SELECT * FROM sik_bench.dr_tariff;"
mysql -uroot sik_bench_p2 -e "TRUNCATE dr_charge_ledger;"
env RUN_ID=r5p2_a0 python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/dev/null 2>&1
echo "AC-6 fault-injection matrix (clean anchor first, then each fault):"
run a0_clean
echo "(e) delete one drug ledger row:"
mysql -uroot sik_bench_p2 -e "DELETE FROM dr_charge_ledger WHERE no_rawat='2026/10/01/000254' AND component='drug';"
run a_e
grep -E "UNEXPLAINED 2026/10/01/000254" /tmp/a_e.log | head -1
echo "(b) wrong code, same price (swap code on a ledger row):"
mysql -uroot sik_bench_p2 -e "TRUNCATE dr_charge_ledger; INSERT INTO dr_charge_ledger SELECT * FROM (SELECT * FROM sik_bench_p2.dr_charge_ledger) t;" 2>/dev/null || true
mysql -uroot sik_bench_p2 -e "UPDATE dr_charge_ledger SET code='B000009999' WHERE no_rawat='2026/10/01/000254' AND component='drug';"
run a_b
echo "(c) offsetting: +drug on one visit, -same on another (net-zero total, per-visit nonzero):"
mysql -uroot sik_bench_p2 -e "DELETE FROM dr_charge_ledger WHERE no_rawat='2026/10/01/000298' AND component='drug';"
run a_c
grep -cE "UNEXPLAINED" /tmp/a_c.log | sed "s/^/unexplained_count=/"
echo "(d) missing tariff row: empty the p2 dr_tariff, rebuild without fallback => FAIL-CLOSED:"
mysql -uroot sik_bench_p2 -e "TRUNCATE dr_tariff; TRUNCATE dr_charge_ledger;"
env RUN_ID=r5p2_a_d python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/tmp/a_d_build.log 2>&1; echo "d(no-fallback) build rc=$? $(grep -oE 'FAIL-CLOSED' /tmp/a_d_build.log | head -1)"
mysql -uroot sik_bench_p2 -e "INSERT INTO dr_tariff SELECT * FROM sik_bench.dr_tariff;"
echo "(f) unknown-status ('other') billing row gated by charge_delta other==0:"
mysql -uroot sik_p2 -e "INSERT INTO billing (no_rawat, status, nm_perawatan, biaya, jumlah, totalbiaya, noindex) SELECT no_rawat,'XX-UNKNOWN','Mystery',1000,1,1000,99999 FROM reg_periksa WHERE no_rawat='2026/10/01/000254';"
run a_f
grep -E "P2-OTHER-STATUS|other-bucket|UNEXPLAINED 2026/10/01/000254" /tmp/a_f.log | head -3
echo "(a) non-October +Rp1000 drug error: three_count --window ALL must catch it"
mysql -uroot sik_p2 -e "INSERT INTO billing (no_rawat, status, nm_perawatan, biaya, jumlah, totalbiaya, noindex) SELECT no_rawat,'Obat','DRUG-FAKE',1000,1,1000,99999 FROM reg_periksa WHERE no_rawat='2026/11/01/800001';"
env RUN_ID=r5p2_a_a python3 three_count_reconcile_p2.py --stage A --window ALL >/tmp/a_a.log 2>&1
echo "a(three_count ALL) rc=$? $(grep -oE 'verdict: (PASS|PARTIAL|FAIL)' /tmp/a_a.log | head -1)"
grep -E "P2-AC-|GAP" /tmp/a_a.log | head -4
