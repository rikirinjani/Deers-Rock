#!/bin/bash
echo "=== dr_charge_ledger DDL ==="
mysql -uroot -N -B sik_bench -e "SHOW CREATE TABLE dr_charge_ledger"
echo "=== a1_final.log full ==="
cat /tmp/r4_bat_logs/a1_final.log 2>/dev/null
echo "=== results r4_a1_final log ==="
cat /opt/dr-benchmark/results/r4_a1_final/dr_charge_ledger.log 2>/dev/null | head -20
echo "=== deployed builder drug-loop src lines ==="
grep -n "src = " /opt/Deers-Rock/tools/build_dr_charge_ledger.py
echo "=== sample rows post clean build ==="
mysql -uroot -N -B sik_bench -e "SELECT no_rawat,component,code,amount,source FROM dr_charge_ledger WHERE no_rawat='2026/10/01/000254'"
echo "=== dr_tariff sample ==="
mysql -uroot -N -B sik_bench -e "SELECT kind,code,dr_price,source_note FROM dr_tariff LIMIT 5"
echo "=== benchmark grants ==="
mysql -uroot -N -B -e "SHOW GRANTS FOR 'benchmark'@'localhost'"
