#!/usr/bin/env bash
set -euo pipefail
echo "===== BENCHMARK_REPORT_publishable.md ====="
cat /tmp/p67_scratch/out/BENCHMARK_REPORT_publishable.md
echo
echo "===== BENCHMARK_REPORT.md (internal, full) ====="
cat /tmp/p67_scratch/out/BENCHMARK_REPORT.md
echo
echo "===== final live-tree integrity ====="
find /opt/dr-benchmark/results -type f -printf '%P %s %T@\n' | sort > /tmp/p67_mtimes_final.txt
diff /tmp/p67_mtimes_before.txt /tmp/p67_mtimes_final.txt && echo "results tree: UNCHANGED since first snapshot"
sha256sum -c /tmp/p67_runall_sha_before.txt 2>/dev/null || sha256sum /opt/dr-benchmark/run_all.sh
systemctl is-active dr-bench
