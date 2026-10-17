#!/bin/bash
echo "--- procs ---"
ps aux | grep -E 'r4_bat1|mysql' | grep -v grep | head -10
echo "--- bat logs ---"
ls -la /tmp/r4_bat_logs/ 2>/dev/null
echo "--- p-chain newest ---"
ls -t /opt/dr-benchmark/p-chain/ | head -6
echo "--- databarang value ---"
mysql -uroot -N -B sik -e "SELECT ralan FROM databarang WHERE kode_brng='B000001135'"
echo "--- ledger sum ---"
mysql -uroot -N -B sik_bench -e "SELECT ROUND(SUM(amount),2)+0 FROM dr_charge_ledger"
