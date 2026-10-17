#!/bin/bash
echo "=== dpo schema ==="
mysql -uroot -N -B sik -e "SHOW CREATE TABLE detail_pemberian_obat"
echo "=== dpo sample row ==="
mysql -uroot -N -B sik -e "SELECT * FROM detail_pemberian_obat WHERE no_rawat='2026/10/01/000254' LIMIT 2"
echo "=== billing sample rows for V ==="
mysql -uroot -N -B sik -e "SELECT noindex,status,nm_perawatan,biaya,jumlah,totalbiaya FROM billing WHERE no_rawat='2026/10/01/000254' ORDER BY noindex"
echo "=== ledger rows for V ==="
mysql -uroot -N -B sik_bench -e "SELECT component,code,quantity,unit_price,amount FROM dr_charge_ledger WHERE no_rawat='2026/10/01/000254'"
