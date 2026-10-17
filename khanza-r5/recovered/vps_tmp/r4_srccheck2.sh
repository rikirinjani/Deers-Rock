#!/bin/bash
echo "=== full sandbox builder log ==="
cat /tmp/r4_bat_logs/a1_sandbox.log 2>/dev/null
echo "=== artifact CSV source samples ==="
head -3 /opt/dr-benchmark/results/r4_a1_sandbox/dr_charge_ledger.csv 2>/dev/null
grep -m2 ",drug," /opt/dr-benchmark/results/r4_a1_sandbox/dr_charge_ledger.csv 2>/dev/null
echo "=== live table source now ==="
mysql -uroot -N -B sik_bench -e "SELECT source, COUNT(*) FROM dr_charge_ledger WHERE component='drug' GROUP BY source"
echo "=== one live row ==="
mysql -uroot -N -B sik_bench -e "SELECT no_rawat,code,unit_price,amount,source FROM dr_charge_ledger WHERE no_rawat='2026/10/01/000254'"
echo "=== bat4 still running? ==="
ps aux | grep -E 'r4_bat4|r4_reprice|charge_delta|three_count' | grep -v grep
echo "=== bat4 log tail ==="
tail -8 /tmp/r4_bat4.log
