set -e
cd /opt/Deers-Rock/tools
echo "=== final gate on live (post clean re-bill) ==="
export DBUTIL_FORCE_ROOT=1
env RUN_ID=r5p5_gate4 python3 charge_delta_per_component_p2.py --stage A >/tmp/p5d_gate4.log 2>&1
echo "charge_delta rc=$? $(grep -oE 'gate \(all deltas == 0, other == 0\): (PASS|FAIL)' /tmp/p5d_gate4.log | head -1)"
env RUN_ID=r5p5_gate4t python3 three_count_reconcile_p2.py --stage A >/tmp/p5d_gate4t.log 2>&1
echo "three_count A/C: $(grep -oE 'Count A .*' /tmp/p5d_gate4t.log | head -1) | $(grep -oE 'Count C .*' /tmp/p5d_gate4t.log | head -1)"
echo "=== stage hygiene on live ==="
mysql -uroot -N -e "SHOW TABLES FROM sik LIKE 'r5_stage_%';"
echo "(empty above = clean)"
echo "=== stage hygiene on scratch ==="
mysql -uroot -N -e "SHOW TABLES FROM sik_p2 LIKE 'r5_stage_%';"
echo "(empty above = clean)"
echo "=== cleanup: drop scratch pair, restore harness ini to sik ==="
mysql -uroot -e "DROP DATABASE IF EXISTS sik_p2; DROP DATABASE IF EXISTS sik_bench_p2;"
sed -i "s/^database=.*/database=sik/" /opt/simrs-khanza/setting/database.ini
echo "databases: $(mysql -uroot -N -e "SHOW DATABASES LIKE 'sik%';" | tr "\n" " ")"
echo "harness: $(grep -E "^database=" /opt/simrs-khanza/setting/database.ini)"
echo "=== ledger final ==="
mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(amount),0) FROM sik_bench.dr_charge_ledger;"
