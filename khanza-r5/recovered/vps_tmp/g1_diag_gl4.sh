#!/bin/bash
# Diagnose the general_log DML capture problem on the new VPS
set +e
GLD=/opt/dr-benchmark/results/g1test/g1_attempt1/gl
echo "=== gl file sizes ==="
ls -la $GLD/general_log_G1.* 2>/dev/null | awk '{print $5, $9}'
echo
echo "=== does a real-form save write DML to general_log? Look at a known-good gl file (from a successful harness run) ==="
echo "Search all gl files for INSERT/REPLACE/UPDATE/DELETE DML:"
grep -hE '(INSERT|REPLACE|UPDATE|DELETE|TRUNCATE)[[:space:]]+(INTO[[:space:]]+)?`?[a-z_]+' $GLD/general_log_G1.* 2>/dev/null | head -20
echo
echo "=== distinct DML verbs/tables ==="
grep -hoE '(INSERT|REPLACE|UPDATE|DELETE|TRUNCATE)[[:space:]]+(INTO[[:space:]]+)?`?[a-z_]+' $GLD/general_log_G1.* 2>/dev/null \
  | tr '[:upper:]' '[:lower:]' | sed 's/`//g' | sort | uniq -c | sort -rn | head -25
echo
echo "=== harness logs: did the JVMs actually bill? check for 'sukses=true' ==="
grep -l 'sukses=true' $GLD/../harness_*.log 2>/dev/null | head
grep -c 'sukses=true' $GLD/../harness_*.log 2>/dev/null | head -30
echo
echo "=== any AWT errors? ==="
grep -l 'AWTError\|Exception' $GLD/../harness_*.log 2>/dev/null | head
