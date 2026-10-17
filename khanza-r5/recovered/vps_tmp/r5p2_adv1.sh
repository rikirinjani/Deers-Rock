set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1 P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2
echo "=== AC-7 on fixture: clean charge_delta (expect 3113533580 / delta 0 / PASS) ==="
env RUN_ID=r5p2_clean2 python3 charge_delta_per_component_p2.py --stage A 2>&1 | grep -E "cohort visits|Khanza total|overall delta|gate"
echo "=== AC-6 adversarial: each fault must FAIL a gate with a named reason ==="
run_gate(){ env RUN_ID="$1" python3 charge_delta_per_component_p2.py --stage A 2>&1 | grep -E "gate|UNEXPLAINED|P2-OTHER" | head -4; }
echo "(baseline rc check)"
env RUN_ID=r5p2_g0 python3 charge_delta_per_component_p2.py --stage A >/dev/null 2>&1; echo "baseline gate rc=$?"
V="2026/10/01/000254"
echo "-- (a) +Rp1000 drug error in NON-October visit; run --window ALL should now detect it --"
NV=$(mysql -uroot -N -e "SELECT no_rawat FROM sik_p2.reg_periksa WHERE no_rawat LIKE '2026/11/%' AND no_rkm_medis LIKE 'DR%' ORDER BY no_rawat LIMIT 1;")
echo "non-Oct target: $NV"
mysql -uroot sik_p2 -e "INSERT INTO billing (no_rawat, status, nm_perawatan, biaya, jumlah, totalbiaya) SELECT no_rawat, 'Obat','DRUG-FAKE', 1000, 1, 1000 FROM reg_periksa WHERE no_rawat='$NV';"
echo "  charge_delta --window 2026-10 (should still PASS ? fault is outside Oct):"
env RUN_ID=r5p2_a1 python3 charge_delta_per_component_p2.py --stage A >/dev/null 2>&1; echo "   rc(Oct)=$?"
echo "  three_count --window ALL (should FAIL ? non-Oct drug row):"
env RUN_ID=r5p2_a2 python3 three_count_reconcile_p2.py --stage A --window ALL 2>&1 | grep -E "verdict|GAP|P2-" | head -5
