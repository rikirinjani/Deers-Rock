set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1 P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2
# clean anchor
mysql -uroot sik_bench_p2 -e "TRUNCATE dr_tariff; INSERT INTO dr_tariff SELECT * FROM sik_bench.dr_tariff;"
mysql -uroot sik_bench_p2 -e "TRUNCATE dr_charge_ledger;"
env RUN_ID=r5p2_b0 python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/dev/null 2>&1
env RUN_ID=r5p2_b0g python3 charge_delta_per_component_p2.py --stage A >/tmp/b0.log 2>&1
echo "(0) clean anchor rc=$? gate=$(grep -oE 'gate \(all deltas == 0, other == 0\): (PASS|FAIL)' /tmp/b0.log | head -1)"
# (e) delete a drug ledger row
mysql -uroot sik_bench_p2 -e "DELETE FROM dr_charge_ledger WHERE no_rawat='2026/10/01/000254' AND component='drug';"
env RUN_ID=r5p2_be python3 charge_delta_per_component_p2.py --stage A >/tmp/be.log 2>&1
echo "(e) delete-row rc=$? gate=$(grep -oE 'gate \(all deltas == 0, other == 0\): (PASS|FAIL)' /tmp/be.log | head -1) delta=$(grep -E 'UNEXPLAINED 2026/10/01/000254' /tmp/be.log | head -1)"
# restore ledger
mysql -uroot sik_bench_p2 -e "TRUNCATE dr_charge_ledger;"
env RUN_ID=r5p2_br python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/dev/null 2>&1
# (b) wrong code same price
mysql -uroot sik_bench_p2 -e "UPDATE dr_charge_ledger SET code='B000009999' WHERE no_rawat='2026/10/01/000254' AND component='drug';"
env RUN_ID=r5p2_bb python3 charge_delta_per_component_p2.py --stage A >/tmp/bb.log 2>&1
echo "(b) wrong-code rc=$? gate=$(grep -oE 'gate \(all deltas == 0, other == 0\): (PASS|FAIL)' /tmp/bb.log | head -1) (code diff is per-visit; gate total may still match if amount same)"
# (c) offsetting: delete one visit drug row, add equal on another
mysql -uroot sik_bench_p2 -e "TRUNCATE dr_charge_ledger;"
env RUN_ID=r5p2_bc0 python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/dev/null 2>&1
mysql -uroot sik_bench_p2 -e "DELETE FROM dr_charge_ledger WHERE no_rawat='2026/10/01/000298' AND component='drug'; INSERT INTO dr_charge_ledger VALUES ('2026/10/01/000332','drug','B000001135',1,34584,34584,'legacy');"
env RUN_ID=r5p2_bc python3 charge_delta_per_component_p2.py --stage A >/tmp/bc.log 2>&1
echo "(c) offsetting rc=$? gate=$(grep -oE 'gate \(all deltas == 0, other == 0\): (PASS|FAIL)' /tmp/bc.log | head -1) unexplained=$(grep -cE 'UNEXPLAINED' /tmp/bc.log)"
grep -E "UNEXPLAINED 2026/10/01/000298|UNEXPLAINED 2026/10/01/000332" /tmp/bc.log | head -2
