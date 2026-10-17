#!/bin/bash
# R4 recon: scope external-assessment fixes
P=/opt/dr-benchmark/p-chain
echo "=== P-CHAIN FILES ==="
ls -1t $P | head -50
echo "=== A3 MD ==="
f=$(ls -1 $P/a3_fullwindow_monthly_*.md 2>/dev/null | head -1); [ -n "$f" ] && cat "$f"
echo "=== A2B BATTERY MD ==="
f=$(ls -1 $P/a2b_battery_*.md 2>/dev/null | head -1); [ -n "$f" ] && sed -n '1,90p' "$f"
echo "=== A1 TARIFF MD ==="
f=$(ls -1 $P/a1_tariff_*.md 2>/dev/null | head -1); [ -n "$f" ] && sed -n '1,60p' "$f"
echo "=== E1 LEDGER ==="
f=$(ls -1 $P/e1_claims_ledger_*.md 2>/dev/null | head -1); [ -n "$f" ] && cat "$f"
echo "=== D1 RESTORE ==="
f=$(ls -1 $P/d1_restore_*.sh 2>/dev/null | head -1); [ -n "$f" ] && sed -n '1,60p' "$f"
echo "=== CONSUMER SNAPSHOT ==="
f=$(ls -1 $P/consumer_snapshot_*.json 2>/dev/null | head -1); [ -n "$f" ] && head -c 3000 "$f"; echo
echo "=== SAMPLED DIFF TOOLING ==="
grep -rn "sampled_real_form_diff" /opt/dr-benchmark /opt/Deers-Rock --include=*.sh --include=*.py 2>/dev/null | head -20
echo "=== SAMPLE LISTS ==="
find /opt/dr-benchmark /opt/Deers-Rock -iname "*sample*" -not -path "*/node_modules/*" 2>/dev/null | head -30
echo "=== GATE WIRING ==="
grep -n "check_billed_eq_dr\|charge_delta_per_component\|three_count_reconcile" /opt/dr-benchmark/run_all.sh | head -20
echo "=== B3 SAMPLED-DIFF OUTPUTS ==="
find /opt/dr-benchmark -newermt "2026-10-12" -iname "*diff*" -o -newermt "2026-10-12" -iname "*b3*" 2>/dev/null | head -40
echo "=== TOOL HEADS ==="
sed -n '1,50p' /opt/Deers-Rock/tools/sampled_real_form_diff.py 2>/dev/null
echo "=== RUN DIR LISTING ==="
ls -1 /opt/dr-benchmark/results/Bseries_20261012T045027Z/ 2>/dev/null | head -40
echo "=== MYSQL STATE ==="
mysql -uroot -e "SHOW GLOBAL VARIABLES LIKE 'innodb_buffer_pool_size'; SHOW GLOBAL VARIABLES LIKE 'long_query_time';" 2>&1
mysql -uroot -e "SELECT COUNT(*) AS dr_pasien FROM sik.pasien WHERE no_rkm_medis LIKE 'DR%'; SELECT COUNT(*) AS dr_reg FROM sik.reg_periksa WHERE no_rkm_medis LIKE 'DR%'; SELECT COUNT(*) FROM sik_bench.dr_tariff;" 2>&1
echo "=== PROCS ==="
ps aux | grep -iE "mysql|xvfb|faketime|java" | grep -v grep | head -10
echo "=== OKLINE / GATE SCRIPTS ==="
ls -1 /opt/Deers-Rock/tools/ | head -40
