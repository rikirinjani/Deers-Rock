set -e
cd /opt/Deers-Rock/tools
echo "=== P4-LD clean canonical (drug+proc line-diff) ==="
env RUN_ID=r5p4_ld2_clean python3 charge_delta_per_component_p2.py --stage A --line-diff >/tmp/ld2c.log 2>&1; echo "clean rc=$?"
grep -E "LINE-DELTA=0|LINE-DELTA|gate" /tmp/ld2c.log | head -5
echo "=== P4-LD swap (same unit price, qty moved between codes) ==="
V=$(mysql -uroot -N -e "SELECT no_rawat FROM sik_bench.dr_charge_ledger WHERE component='drug' AND quantity>=4 LIMIT 1;")
echo "target $V before:"; mysql -uroot -N -e "SELECT code, quantity FROM sik_bench.dr_charge_ledger WHERE no_rawat='$V' AND component='drug';"
mysql -uroot sik_bench -e "UPDATE dr_charge_ledger SET quantity = quantity - 2 WHERE no_rawat='$V' AND component='drug' AND quantity>=4;"
echo "after qty shift:"; mysql -uroot -N -e "SELECT code, quantity FROM sik_bench.dr_charge_ledger WHERE no_rawat='$V' AND component='drug';"
env RUN_ID=r5p4_ld2_swap python3 charge_delta_per_component_p2.py --stage A --line-diff >/tmp/ld2s.log 2>&1; echo "swap rc=$?"
grep -E "LINE-DELTA|gate|overall delta" /tmp/ld2s.log | head -6
echo "=== restore canonical, re-verify ==="
mysql -uroot sik_bench -e "DELETE FROM dr_charge_ledger; REPLACE INTO dr_charge_ledger SELECT * FROM dr_charge_ledger_p2bak;"
env RUN_ID=r5p4_ld2_restore python3 charge_delta_per_component_p2.py --stage A --line-diff >/tmp/ld2r.log 2>&1; echo "restore rc=$? $(grep -oE 'LINE-DELTA=0' /tmp/ld2r.log | head -1)"
mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(amount),0) FROM sik_bench.dr_charge_ledger;"
