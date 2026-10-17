#!/bin/bash
# r4_launch1: start D1 snapshot detached + preflight gates + consumer drug-lookup recon
set -u
if ! pgrep -f r4_d1_snapshot.sh >/dev/null; then
  nohup bash /tmp/r4_d1_snapshot.sh > /tmp/d1_snapshot.log 2>&1 &
  echo "snapshot started pid=$!"
else
  echo "snapshot already running"
fi
echo '--- preflight ---'
bash /tmp/r4_preflight.sh
echo '--- consumer drug lookup (fault #2 evidence) ---'
grep -n -i 'databarang\|nama_brng\|ralan\|kode_brng' /opt/simrs-khanza/consumer/KhanzaBillingConsumer.java | head -30
echo '--- visits per drug code Oct (fault #1/#8 pick) ---'
mysql -uroot -N -B sik -e "SELECT l.code, COUNT(DISTINCT l.no_rawat) vis FROM sik_bench.dr_charge_ledger l WHERE l.component='drug' AND l.no_rawat LIKE '2026/10/%' GROUP BY l.code ORDER BY vis, l.code LIMIT 6"
echo '--- template reg row (fault #3 insert template) ---'
mysql -uroot -e "SELECT * FROM sik.reg_periksa WHERE no_rawat='2026/10/01/000254'\G"
echo '--- template billing rows full set for fault #2/#4/#5 visit ---'
mysql -uroot -e "SELECT * FROM sik.billing WHERE no_rawat='2026/10/01/000254'\G" | head -60
