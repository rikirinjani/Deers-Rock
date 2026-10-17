#!/bin/bash
echo "=== diff bak2 vs current (builder output) ==="
mysql -uroot -N -B sik_bench -e "
SELECT 'only_in_builder', no_rawat, component, code, quantity, unit_price, amount FROM dr_charge_ledger
WHERE (no_rawat, component, code) NOT IN (SELECT no_rawat, component, code FROM dr_charge_ledger_bak2)
UNION ALL
SELECT 'only_in_bak2', no_rawat, component, code, quantity, unit_price, amount FROM dr_charge_ledger_bak2
WHERE (no_rawat, component, code) NOT IN (SELECT no_rawat, component, code FROM dr_charge_ledger)"
echo "=== amount-diff on common keys ==="
mysql -uroot -N -B sik_bench -e "
SELECT a.no_rawat, a.component, a.code, a.amount bak_amt, b.amount new_amt
FROM dr_charge_ledger_bak2 a JOIN dr_charge_ledger b
  ON a.no_rawat=b.no_rawat AND a.component=b.component AND a.code=b.code
WHERE ABS(a.amount-b.amount)>0.005 LIMIT 20"
echo "=== totals ==="
mysql -uroot -N -B sik_bench -e "SELECT 'bak2', COUNT(*), ROUND(SUM(amount),2)+0 FROM dr_charge_ledger_bak2"
mysql -uroot -N -B sik_bench -e "SELECT 'new', COUNT(*), ROUND(SUM(amount),2)+0 FROM dr_charge_ledger"
echo "=== builder log tail ==="
tail -15 /tmp/r4_bat_logs/a1_final.log
echo "=== source dist now ==="
mysql -uroot -N -B sik_bench -e "SELECT component, source, COUNT(*), ROUND(SUM(amount),2)+0 FROM dr_charge_ledger GROUP BY component, source"
