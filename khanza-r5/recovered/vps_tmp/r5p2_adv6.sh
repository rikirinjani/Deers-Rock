set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1 P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2
gate(){ env RUN_ID="$1" python3 charge_delta_per_component_p2.py --stage A >/tmp/$1.log 2>&1; echo "rc=$? $(grep -oE "gate \(all deltas == 0, other == 0\): (PASS|FAIL)" /tmp/$1.log | head -1)"; }
tcount(){ env RUN_ID="$1" python3 three_count_reconcile_p2.py --stage A >/tmp/$1.log 2>&1; echo "rc=$? $(grep -oE "verdict: (PASS|PARTIAL|FAIL)" /tmp/$1.log | head -1)"; }

# ---- rebuild clean anchor ----
mysql -uroot sik_bench_p2 -e "TRUNCATE dr_tariff; INSERT INTO dr_tariff SELECT * FROM sik_bench.dr_tariff;"
mysql -uroot sik_bench_p2 -e "TRUNCATE dr_charge_ledger;"
env RUN_ID=r5p2_z python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/dev/null 2>&1
echo "(0) clean anchor:"; gate g0

echo "-- (e) delete one drug ledger row (000254) -> expect FAIL + named UNEXPLAINED --"
mysql -uroot sik_bench_p2 -e "DELETE FROM dr_charge_ledger WHERE no_rawat=\"2026/10/01/000254\" AND component='drug';"
gate g_e
grep -E "UNEXPLAINED 2026/10/01/000254" /tmp/g_e.log | head -2
echo "   restore ledger, re-verify PASS:"
mysql -uroot sik_bench_p2 -e "TRUNCATE dr_charge_ledger;"
env RUN_ID=r5p2_e_r python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/dev/null 2>&1
gate g_er

echo "-- (b) wrong-code same-price: swap a drug code in the ledger for one visit --"
mysql -uroot sik_bench_p2 -e "UPDATE dr_charge_ledger SET code='WRONG-CODE' WHERE no_rawat=\"2026/10/01/000298\" AND component='drug';"
gate g_b
echo "-- (c) offsetting: -one visit drug row, +another visit drug row (amounts equal) -> per-visit still FAILs --"
mysql -uroot sik_bench_p2 -e "TRUNCATE dr_charge_ledger;"
env RUN_ID=r5p2_c_r python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/dev/null 2>&1
mysql -uroot sik_bench_p2 -e "DELETE FROM dr_charge_ledger WHERE no_rawat=\"2026/10/01/000332\" AND component='drug'; INSERT INTO dr_charge_ledger VALUES ('2026/10/02/800001','drug','B000001135',1,34584,34584,'legacy');"
gate g_c
grep -E "UNEXPLAINED" /tmp/g_c.log | head -3

echo "-- (f) unknown-status billing row -> three_count P2-OTHER-STATUS --"
mysql -uroot sik_p2 -e "INSERT INTO billing (no_rawat, status, nm_perawatan, biaya, jumlah, totalbiaya, noindex) SELECT no_rawat, 'XX-UNKNOWN', 'Mystery', 500, 1, 500, 1 FROM reg_periksa WHERE no_rawat='2026/10/01/000254';"
tcount t_f
grep -E "P2-OTHER-STATUS|verdict" /tmp/t_f.log | head -3
