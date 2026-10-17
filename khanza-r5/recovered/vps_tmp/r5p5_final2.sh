cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
env RUN_ID=r5p5_gate4t python3 three_count_reconcile_p2.py --stage A >/tmp/p5d_gate4t.log 2>&1
echo "three_count: $(grep -oE "Count A .*" /tmp/p5d_gate4t.log | head -1)"
echo "             $(grep -oE "Count C .*" /tmp/p5d_gate4t.log | head -1)"
echo "verdict: $(grep -oE "gate: .*" /tmp/p5d_gate4t.log | head -1)"
echo "=== stage hygiene ==="
echo "live stage tables: $(mysql -uroot -N -e "SHOW TABLES FROM sik LIKE '"'"'r5_stage_%'"'"';" | wc -l)"
mysql -uroot -e "DROP DATABASE IF EXISTS sik_p2; DROP DATABASE IF EXISTS sik_bench_p2;"
sed -i "s/^database=.*/database=sik/" /opt/simrs-khanza/setting/database.ini
echo "databases: $(mysql -uroot -N -e "SHOW DATABASES LIKE '"'"'sik%'"'"';" | tr "\n" " ")"
echo "harness: $(grep -E "^database=" /opt/simrs-khanza/setting/database.ini)"
echo "ledger: $(mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(amount),0) FROM sik_bench.dr_charge_ledger;")"
