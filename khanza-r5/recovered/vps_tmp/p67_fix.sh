#!/usr/bin/env bash
set -euo pipefail
install -m 0644 /tmp/p67tools/build_benchmark_report.py /opt/Deers-Rock/tools/build_benchmark_report.py
install -m 0644 /tmp/p67tools/scrub_publishable.py     /opt/Deers-Rock/tools/scrub_publishable.py
sed -i 's/\r$//' /opt/Deers-Rock/tools/build_benchmark_report.py /opt/Deers-Rock/tools/scrub_publishable.py
cd /opt/Deers-Rock/tools
echo "--- py_compile (expect no warnings) ---"
python3 -W error::SyntaxWarning -m py_compile build_benchmark_report.py && echo OK build_benchmark_report
python3 -W error::SyntaxWarning -m py_compile scrub_publishable.py     && echo OK scrub_publishable
python3 -W error::SyntaxWarning -m py_compile burst_test.py            && echo OK burst_test
echo "--- rebuild scratch report ---"
python3 /opt/Deers-Rock/tools/build_benchmark_report.py \
  --run-id Bseries_20261012T045027Z \
  --results-root /tmp/p67_scratch/results \
  --out-dir /tmp/p67_scratch/out
if grep -rEn '([0-9]{1,3}\.){3}[0-9]{1,3}|benchmark_pw|EnkripsiAES|<KHANZA_AES_KEY>|<KHANZA_AES_IV>|usere' /tmp/p67_scratch/out/BENCHMARK_REPORT_publishable.md; then
  echo "GREP: MATCHES (BAD)"
else
  echo "GREP publishable: 0 matches (GOOD)"
fi
echo "--- also grep the INTERNAL report's publishable-forbidden set minus IP (sanity, informational) ---"
grep -cEn 'benchmark_pw|EnkripsiAES|<KHANZA_AES_KEY>|<KHANZA_AES_IV>|usere' /tmp/p67_scratch/out/BENCHMARK_REPORT.md || echo "internal: 0 secret literals (GOOD)"
echo "--- final sizes ---"
ls -la /opt/Deers-Rock/tools/build_benchmark_report.py /opt/Deers-Rock/tools/scrub_publishable.py /opt/Deers-Rock/tools/burst_test.py
systemctl is-active dr-bench
