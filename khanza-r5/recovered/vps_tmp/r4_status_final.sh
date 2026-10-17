#!/bin/bash
# r4_status_final: live ledger vs bak2 state before A1 v2 run
set -u
echo "== live dr_charge_ledger =="
mysql -uroot -N -B sik_bench -e "SELECT CONCAT(COUNT(*),'|',ROUND(SUM(amount),2)+0) FROM dr_charge_ledger"
echo "== bak2 =="
mysql -uroot -N -B sik_bench -e "SELECT CONCAT(COUNT(*),'|',ROUND(SUM(amount),2)+0) FROM dr_charge_ledger_bak2"
echo "== live keys not in bak2 =="
mysql -uroot -N -B sik_bench -e "SELECT COUNT(*) FROM dr_charge_ledger l LEFT JOIN dr_charge_ledger_bak2 b ON b.no_rawat=l.no_rawat AND b.component=l.component AND b.code=l.code WHERE b.no_rawat IS NULL"
echo "== extra key detail (if any) =="
mysql -uroot -N -B sik_bench -e "SELECT l.no_rawat,l.component,l.code,l.quantity,l.amount FROM dr_charge_ledger l LEFT JOIN dr_charge_ledger_bak2 b ON b.no_rawat=l.no_rawat AND b.component=l.component AND b.code=l.code WHERE b.no_rawat IS NULL"
echo "== dr_tariff B000001135 =="
mysql -uroot -N -B sik_bench -e "SELECT dr_price+0 FROM dr_tariff WHERE kind='drug' AND code='B000001135'"
echo "== builder proc running? =="
ps aux | grep -E 'build_dr_charge|r4_bat4|r4_reprice' | grep -v grep | grep -v status || echo none
echo "== Oct reg/proc/drug rows + labels =="
mysql -uroot -N -B sik_bench -e "SELECT component, COUNT(*), SUM(source='dr_tariff') FROM dr_charge_ledger WHERE no_rawat LIKE '2026/10/%' AND component IN ('registration','procedure','drug') GROUP BY component"
echo STATUS_DONE
