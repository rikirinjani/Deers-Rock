#!/bin/bash
echo "=== oom check ==="
dmesg -T 2>/dev/null | grep -i -E 'oom|killed process' | tail -10
journalctl --since "08:40" --until "09:10" -k 2>/dev/null | grep -i -E 'oom|killed' | tail -10
echo "=== memory ==="
free -m
echo "=== newest evidence ABORT context ==="
grep -n ABORT "$(ls -t /opt/dr-benchmark/p-chain/a2b_battery_run_*.md | head -1)"
echo "=== ledger integrity ==="
mysql -uroot -N -B sik_bench -e "SELECT CONCAT(COUNT(*),'|',ROUND(SUM(amount),2)+0) FROM dr_charge_ledger"
mysql -uroot -N -B sik_bench -e "SELECT CONCAT(COUNT(*),'|',ROUND(SUM(amount),2)+0) FROM dr_charge_ledger_bak"
