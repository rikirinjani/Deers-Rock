echo "=== database.ini (trim) ==="
INI=$(grep -E "^database=" /opt/simrs-khanza/setting/database.ini | tr -d " \r")
echo "$INI"
echo ""
echo "=== verify the 2 drift-demo visits have canonical billing (consumer settlement present) ==="
mysql -uroot -N -e "SELECT no_rawat, COUNT(*) c, COALESCE(SUM(totalbiaya),0) s FROM sik.billing WHERE no_rawat IN ('2026/10/01/000254','2026/10/01/000289') GROUP BY no_rawat;"
echo ""
echo "=== live gates: charge_delta (should PASS delta 0) ==="
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
env RUN_ID=r5p5_gate4t python3 charge_delta_per_component_p2.py 2>&1 | grep -E "charge_delta|delta|PASS|FAIL|Verdict|verdict" | head
echo ""
echo "=== live gates: three_count A==C (expect 31,750 / 3,113,533,580) ==="
env RUN_ID=r5p5_gate4t python3 three_count_reconcile_p2.py 2>&1 | grep -E "A ==|A==|C ==|31750|31,750|3,113|verdict|Verdict|PASS|FAIL" | head
