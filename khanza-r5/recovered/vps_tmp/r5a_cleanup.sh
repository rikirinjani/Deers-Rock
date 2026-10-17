set -e
echo "=== drop scratch clone sik_r5 (keep tool + evidence on box) ==="
mysql -uroot -e "DROP DATABASE IF EXISTS sik_r5;" 2>&1
mysql -uroot -N -e "SHOW DATABASES LIKE \"sik%\";"
echo "=== confirm harness ini is back on live ==="
grep -E "^database=" /opt/simrs-khanza/setting/database.ini
echo "=== final live gate check ==="
cd /opt/Deers-Rock/tools
RUN_ID=r5a_postcheck python3 charge_delta_per_component.py --stage A 2>&1 | tail -1
RUN_ID=r5a_postcheck python3 three_count_reconcile.py --stage A 2>&1 | tail -1
