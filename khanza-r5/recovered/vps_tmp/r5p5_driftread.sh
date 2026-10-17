for i in $(seq 1 40); do
  if grep -q "charge_delta rc=" /tmp/r5p5_drift.log 2>/dev/null; then echo "ALL DONE at poll $i"; break; fi
  sleep 15
done
echo "=== key results ==="
grep -E "DRIFT RUN EXIT CODE|CLEAN RUN EXIT CODE|freeze rc=|price reverted|charge_delta rc=" /tmp/r5p5_drift.log
echo "=== drift run detail ==="
grep -E "FROZEN|verify|stage-backup|reset |date 2026|BILLED|FINAL|ORACLE_|verdict|stage-drop|REPAIR|ALIGNED" /tmp/p5d_run.log | head -20
echo "=== clean run detail ==="
grep -E "date 2026|BILLED|FINAL|ORACLE_|verdict|stage-drop" /tmp/p5d_clean.log | head -10
echo "=== gate ==="
grep -E "gate \(all deltas" /tmp/p5d_gate.log 2>/dev/null | head -2
