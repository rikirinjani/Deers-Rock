#!/usr/bin/env bash
cd /opt/dr-benchmark/p-chain || exit 1
for f in p1_rootcause.md p2_report.md p3_report.md p4_report.md p5_report.md; do
  echo "########## $f ##########"
  cat "$f" 2>/dev/null || echo "(missing)"
  echo
done
echo "########## p3_latency.json ##########"
cat p3_latency.json 2>/dev/null
echo
echo "########## p3_pool_restore.txt ##########"
cat p3_pool_restore.txt 2>/dev/null
echo
echo "########## p3_mysql_before.json (head) ##########"
head -20 p3_mysql_before.json 2>/dev/null
echo
echo "########## canonical reports + manifest ##########"
ls -la /opt/dr-benchmark/results/Bseries_20261012T045027Z/BENCHMARK_REPORT.md /opt/dr-benchmark/results/Bseries_20261012T045027Z/BENCHMARK_REPORT_publishable.md /opt/dr-benchmark/results/Bseries_20261012T045027Z/manifest.sha256 2>&1
echo
echo "=== publishable scrub grep (expect 0) ==="
grep -cE '([0-9]{1,3}\.){3}[0-9]{1,3}|benchmark_pw|EnkripsiAES|<KHANZA_AES_KEY>|<KHANZA_AES_IV>|usere' /opt/dr-benchmark/results/Bseries_20261012T045027Z/BENCHMARK_REPORT_publishable.md 2>/dev/null
echo "=== units ==="
systemctl is-active dr-bench
systemctl is-active p-chain
echo "=== run_all.sh syntax + gate ==="
bash -n /opt/dr-benchmark/run_all.sh && echo SYNTAX_OK
grep -c "check_billed_eq_dr" /opt/dr-benchmark/run_all.sh
echo "=== p4 replay scratch ==="
ls /opt/dr-benchmark/results/p4_replay_B1/ 2>&1 | head
echo "=== stray procs ==="
ps aux | grep -E "run_all|KhanzaBillingConsumer|sampled_real|p-chain|p_chain" | grep -v grep
echo NO-PROCS-IF-EMPTY
