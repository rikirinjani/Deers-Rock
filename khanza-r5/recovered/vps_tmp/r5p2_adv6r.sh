cd /opt/dr-benchmark
echo "=== AC-6 matrix results (from the adv6 run logs) ==="
for L in g0 g_e g_er g_b g_c t_f; do
  echo "--- $L ---"
  grep -oE "gate \(all deltas == 0, other == 0\): (PASS|FAIL)|verdict: (PASS|PARTIAL|FAIL)" /tmp/$L.log 2>/dev/null | head -1
done
echo ""
echo "=== named UNEXPLAINED / GAP lines ==="
echo "(e) delete-row:"; grep -E "UNEXPLAINED 2026/10/01/000254" /tmp/g_e.log 2>/dev/null | head -2
echo "(c) offsetting:"; grep -E "UNEXPLAINED" /tmp/g_c.log 2>/dev/null | head -3
echo "(f) other-status:"; grep -E "P2-OTHER-STATUS|verdict" /tmp/t_f.log 2>/dev/null | head -3
