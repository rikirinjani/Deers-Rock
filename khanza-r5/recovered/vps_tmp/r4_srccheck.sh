#!/bin/bash
echo "=== sandbox log (authority line) ==="
grep -n "authority" /tmp/r4_bat_logs/a1_sandbox.log /opt/dr-benchmark/results/r4_a1_sandbox/dr_charge_ledger.log 2>/dev/null
echo "=== source distribution ==="
mysql -uroot -N -B sik_bench -e "SELECT component, source, COUNT(*) FROM dr_charge_ledger GROUP BY component, source"
echo "=== benchmark grants on dr_tariff ==="
mysql -uroot -N -B -e "SHOW GRANTS FOR 'benchmark'@'localhost'" 2>/dev/null | grep -i tariff
echo "=== bat4 log tail ==="
tail -12 /tmp/r4_bat4.log
