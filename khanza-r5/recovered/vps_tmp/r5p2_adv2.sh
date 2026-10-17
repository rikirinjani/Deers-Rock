set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1 P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2
echo "=== AC-7 scratch anchor baseline: charge_delta must PASS (delta 0) ==="
env RUN_ID=r5p2_base6 python3 charge_delta_per_component_p2.py --stage A 2>&1 | grep -E "cohort visits|Khanza total|overall delta|gate"
echo ""
echo "=== AC-6 adversarial: each fault must make a gate FAIL with a named reason ==="
# helper: run a gate, print verdict + first GAP/UNEXPLAINED
delta(){ env RUN_ID="$1" python3 charge_delta_per_component_p2.py --stage A "$2" 2>&1 | grep -E "overall delta|gate|UNEXPLAINED" | head -4; }
echo "-- baseline delta (no fault) --"
delta base0 ""
echo "-- (a) +Rp1000 drug row in a NON-Oct visit; three_count --window ALL must FAIL --"
NV=$(mysql -uroot -N -e "SELECT no_rawat FROM sik_p2.reg_periksa WHERE no_rawat LIKE \"2026/11/%\" AND no_rkm_medis LIKE \"DR%\" ORDER BY no_rawat LIMIT 1;")
mysql -uroot sik_p2 -e "INSERT INTO billing (no_rawat, status, nm_perawatan, biaya, jumlah, totalbiaya, noindex) SELECT \"$NV\", \"Obat\", \"DRUG-FAKE\", 1000, 1, 1000, 99999 FROM (SELECT 1) t;"
echo "non-Oct target: $NV"
env RUN_ID=r5p2_fa1 python3 three_count_reconcile_p2.py --stage A --window ALL 2>&1 | grep -E "verdict|GAP|P2-" | head -4
echo "   (three_count --window 2026-10 should still PASS ? fault outside Oct)"
env RUN_ID=r5p2_fa1b python3 three_count_reconcile_p2.py --stage A 2>&1 | grep -E "verdict|GAP" | head -2
