#!/usr/bin/env bash
# p67_patch_validate.sh — install patched report builder, py_compile, scratch
# dry-run, verify 7 footnotes in both reports, scrub grep, live-run safety.
set -euo pipefail

echo "=== 0. snapshot live tree (before) ==="
find /opt/dr-benchmark/results -type f -printf '%P %s %T@\n' | sort > /tmp/p67p_mtimes_before.txt
sha256sum /opt/dr-benchmark/run_all.sh > /tmp/p67p_runall_before.txt

echo
echo "=== 1. install + py_compile ==="
install -m 0644 /tmp/build_benchmark_report.py /opt/Deers-Rock/tools/build_benchmark_report.py
sed -i 's/\r$//' /opt/Deers-Rock/tools/build_benchmark_report.py
cd /opt/Deers-Rock/tools
python3 -W error::SyntaxWarning -m py_compile build_benchmark_report.py && echo "py_compile: OK (no warnings)"
ls -la build_benchmark_report.py

echo
echo "=== 2. scratch dry-run (existing /tmp/p67_scratch copy) ==="
rm -f /tmp/p67_scratch/out/BENCHMARK_REPORT.md /tmp/p67_scratch/out/BENCHMARK_REPORT_publishable.md
python3 /opt/Deers-Rock/tools/build_benchmark_report.py \
  --run-id Bseries_20261012T045027Z \
  --results-root /tmp/p67_scratch/results \
  --out-dir /tmp/p67_scratch/out

echo
echo "=== 3. orchestrator scrub grep on publishable ==="
if grep -rEn '([0-9]{1,3}\.){3}[0-9]{1,3}|benchmark_pw|EnkripsiAES|<KHANZA_AES_KEY>|<KHANZA_AES_IV>|usere' /tmp/p67_scratch/out/BENCHMARK_REPORT_publishable.md; then
  echo "GREP: MATCHES (BAD)"
else
  echo "GREP publishable: 0 matches (GOOD)"
fi

echo
echo "=== 4. seven footnote markers present in BOTH reports ==="
for f in /tmp/p67_scratch/out/BENCHMARK_REPORT.md /tmp/p67_scratch/out/BENCHMARK_REPORT_publishable.md; do
  echo "--- $f ---"
  echo "  [1] general-log 0-byte:   $(grep -ci 'real-form SQL capture' "$f") hits"
  echo "  [2] stale rows(est):       $(grep -ci 'stale information_schema' "$f") hits"
  echo "  [3] empty top_diagnoses:   $(grep -ci 'empty-set cost' "$f") hits"
  echo "  [4] lifetime counters:     $(grep -ci 'server-lifetime' "$f") hits"
  echo "  [5] Count B derived:       $(grep -c 'Count B is derived' "$f") hits"
  echo "  [6] CSV latest-rung-only:  $(grep -ci 'latest rung only' "$f") hits"
  echo "  [7] Oct-only scope note:   $(grep -ci 'October' "$f") hits"
  echo "  [+] marginal MB/1k:        $(grep -ci 'marginal' "$f") hits"
done

echo
echo "=== 5. exact footnote copy (for review) — INTERNAL ==="
grep -n "Evidence basis\|No real-form SQL capture\|Count B is derived\|Reconcile gates cover\|NOTE: Count B\|SCOPE:\|Ladder footnotes\|long_query_time\|billing shows rows_est\|sample estimate (25 per\|Data size per 1,000\|Prefer the marginal\|LATEST RUNG ONLY\|entity is empty\|Real-form SQL capture was NOT\|Top-20-table rows/MB\|top_diagnoses returns 0 rows\|InnoDB hit rate and buffer-pool\|one shared file overwritten\|Scope split" /tmp/p67_scratch/out/BENCHMARK_REPORT.md || true

echo
echo "=== 6. exact footnote copy — PUBLISHABLE ==="
cat /tmp/p67_scratch/out/BENCHMARK_REPORT_publishable.md

echo
echo "=== 7. live-run safety ==="
find /opt/dr-benchmark/results -type f -printf '%P %s %T@\n' | sort > /tmp/p67p_mtimes_after.txt
echo "--- changed vs before (expect only live B3 churn):"
diff /tmp/p67p_mtimes_before.txt /tmp/p67p_mtimes_after.txt || true
echo "--- run_all.sh:"
diff /tmp/p67p_runall_before.txt <(sha256sum /opt/dr-benchmark/run_all.sh) && echo "run_all.sh UNCHANGED"
echo "--- unit:"
systemctl is-active dr-bench
