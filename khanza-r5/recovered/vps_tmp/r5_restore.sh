set -e
cd /opt/simrs-khanza
# restore harness config to live
if [ -f /tmp/r5_database.ini.bak ]; then cp /tmp/r5_database.ini.bak setting/database.ini; fi
grep -E "^database=" setting/database.ini
echo "=== ensure live sik untouched (expect 1464593 / 34895128580) ==="
mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(totalbiaya),0) FROM sik.billing;"
echo "=== drop the clone (demo complete; keep tool + evidence) ==="
mysql -uroot -e "DROP DATABASE IF EXISTS sik_r5;" 2>&1
mysql -uroot -N -e "SHOW DATABASES LIKE \"sik%\";"
echo "=== confirm live gates still green (charge_delta + three_count on live) ==="
cd /opt/Deers-Rock/tools
RUN_ID=r5_p1_demo_postcheck python3 charge_delta_per_component.py --stage A 2>&1 | tail -3 || echo "charge_delta: rc=$?"
RUN_ID=r5_p1_demo_postcheck python3 three_count_reconcile.py --stage A 2>&1 | tail -3 || echo "three_count: rc=$?"
