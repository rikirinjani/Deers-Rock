set -e
echo "=== restore harness DB target to live sik ==="
sed -i "s/^database=.*/database=sik/" /opt/simrs-khanza/setting/database.ini
echo "harness DB now: $(grep -E '^database=' /opt/simrs-khanza/setting/database.ini)"
echo "=== confirm live canonical ledger + gates intact (P4 tools never wrote live) ==="
echo "live ledger: $(mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(amount),0) FROM sik_bench.dr_charge_ledger;")"
echo "=== final gate check on live ==="
cd /opt/Deers-Rock/tools
env RUN_ID=r5p4_close_cd python3 charge_delta_per_component_p2.py --stage A >/tmp/p4close_cd.log 2>&1
echo "charge_delta live rc=$? $(grep -oE 'gate \(all deltas == 0, other == 0\): (PASS|FAIL)' /tmp/p4close_cd.log | head -1)"
env RUN_ID=r5p4_close_ld python3 charge_delta_per_component_p2.py --stage A --line-diff >/tmp/p4close_ld.log 2>&1
echo "charge_delta --line-diff live rc=$? $(grep -oE 'LINE-DELTA=0' /tmp/p4close_ld.log | head -1)"
echo "=== drop scratch fixtures (P4 demo complete; keep P4 evidence + tools on box) ==="
mysql -uroot -e "DROP DATABASE IF EXISTS sik_p2; DROP DATABASE IF EXISTS sik_bench_p2;" 2>&1
echo "databases now: $(mysql -uroot -N -e "SHOW DATABASES LIKE 'sik%';" | tr "\n" " ")"
