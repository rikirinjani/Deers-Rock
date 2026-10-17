echo "=== AC-6 injection results (on-box logs) ==="
for L in be bb bc; do
  echo "--- $L ---"
  grep -oE "gate \(all deltas == 0, other == 0\): (PASS|FAIL)" /tmp/$L.log 2>/dev/null | head -1
done
echo "(e) delete-row named UNEXPLAINED:"
grep -E "UNEXPLAINED 2026/10/01/000254" /tmp/be.log 2>/dev/null | head -1
echo "(c) offsetting unexplained count:"
grep -cE "UNEXPLAINED" /tmp/bc.log 2>/dev/null
grep -E "UNEXPLAINED 2026/10/01/000298|UNEXPLAINED 2026/10/01/000332" /tmp/bc.log 2>/dev/null | head -2
echo "(b) wrong-code total-delta:"
grep -oE "overall delta: [0-9]+" /tmp/bb.log 2>/dev/null | head -1
