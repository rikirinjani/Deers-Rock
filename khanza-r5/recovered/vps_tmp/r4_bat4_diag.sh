#!/bin/bash
echo "=== bat4 outer ==="
cat /tmp/r4_bat4_outer.log 2>/dev/null
echo "=== bat4 log full ==="
cat /tmp/r4_bat4.log 2>/dev/null
echo "=== a1 sandbox log ==="
tail -20 /tmp/r4_bat_logs/a1_sandbox.log 2>/dev/null
echo "=== results r4_a1_sandbox ==="
ls -la /opt/dr-benchmark/results/r4_a1_sandbox/ 2>/dev/null
tail -5 /opt/dr-benchmark/results/r4_a1_sandbox/dr_charge_ledger.log 2>/dev/null
echo "=== ledger state ==="
mysql -uroot -N -B sik_bench -e "SELECT component, COUNT(*), ROUND(SUM(amount),2)+0 FROM dr_charge_ledger GROUP BY component"
echo "=== bak exists ==="
mysql -uroot -N -B sik_bench -e "SELECT COUNT(*) FROM dr_charge_ledger_bak" 2>/dev/null || echo no_bak
echo "=== evidence ABORT check ==="
grep -c ABORT "$(ls -t /opt/dr-benchmark/p-chain/a2b_battery_run_*.md | head -1)"
