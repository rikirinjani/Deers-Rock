#!/bin/bash
# r4_recon7: battery contract + d1_restore + ledger-builder discovery
set -u
echo "=== p-chain listing ==="
ls -la /opt/dr-benchmark/p-chain/ | head -60
echo
echo "=== battery contract files ==="
for f in /opt/dr-benchmark/p-chain/a2b_battery*.md; do echo "--- $f ---"; cat "$f"; done
echo
echo "=== current d1_restore scripts ==="
for f in /opt/dr-benchmark/p-chain/d1_restore*.sh; do echo "--- $f ---"; cat "$f"; done
echo
echo "=== who creates/rebuilds dr_charge_ledger? ==="
grep -rln "dr_charge_ledger" /opt/Deers-Rock/tools/ /opt/dr-benchmark/*.sh 2>/dev/null
echo
echo "=== build_dr_charge_ledger head ==="
sed -n '1,60p' /opt/Deers-Rock/tools/build_dr_charge_ledger.py 2>/dev/null || echo MISSING
echo
echo "=== dr_tariff CREATE + rows ==="
mysql -uroot -N -e "SHOW CREATE TABLE sik.dr_tariff\G" 2>/dev/null
mysql -uroot -N -e "SELECT * FROM sik.dr_tariff" 2>/dev/null
echo
echo "=== B2 prior sample params (results csv headers + counts) ==="
for d in /opt/dr-benchmark/results/*/; do
  b1="$d/B1_sampled_form_diff.csv"; b2="$d/B2_sampled_form_diff.csv"; b3="$d/B3_sampled_form_diff.csv"
  [ -f "$b2" ] && echo "$d B1=$(($(wc -l < "$b1" 2>/dev/null || echo 1)-1)) B2=$(($(wc -l < "$b2")-1)) B3=$(($(wc -l < "$b3" 2>/dev/null || echo 1)-1))"
done
echo
echo "=== cohort size now (B2 stage) ==="
mysql -uroot -N sik -e "SELECT COUNT(*) FROM reg_periksa rp WHERE rp.no_rkm_medis LIKE 'DR%' AND rp.no_rawat LIKE '____/__/__/8_____'"
echo
echo "=== sample rate recorded in run logs? ==="
grep -rn "sample: .* desired" /opt/dr-benchmark/results/*/sampled_real_form_diff_*.log 2>/dev/null | tail -10
grep -rn "rate" /opt/dr-benchmark/results/*/general_log_B2.log 2>/dev/null | head -3
ls /opt/dr-benchmark/results/ | tail -8
