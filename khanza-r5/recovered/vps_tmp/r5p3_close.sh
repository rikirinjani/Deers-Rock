set -e
cd /opt/Deers-Rock/tools
echo "=== P2 canonical ledger + both live gates ? final P3 close-out evidence ==="
echo "-- canonical ledger (post P2 rebuild):"
mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(amount),0) FROM sik_bench.dr_charge_ledger;"
echo "-- charge_delta_p2 live:"
env RUN_ID=r5p3_close_cd python3 charge_delta_per_component_p2.py --stage A >/tmp/p3cd.log 2>&1; echo "rc=$? $(grep -oE 'gate \(all deltas == 0, other == 0\): (PASS|FAIL)' /tmp/p3cd.log)"
echo "-- three_count_p2 live:"
env RUN_ID=r5p3_close_3c python3 three_count_reconcile_p2.py --stage A >/tmp/p33c.log 2>&1
echo "A==C rows/amount: $(grep -oE 'Count A.*rows=[0-9]+ amount=[0-9]+' /tmp/p33c.log | head -1)"
echo "B subset: $(grep -oE 'Count B.*rows=[0-9]+ amount=[0-9]+' /tmp/p33c.log | head -1)"
echo "P2-BC-TOTAL: $(grep -c 'P2-BC-TOTAL' /tmp/p33c.log)"
