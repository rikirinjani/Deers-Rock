for i in $(seq 1 40); do
  if grep -q "CLEAN RUN EXIT CODE" /tmp/r5p5_clean_outer.log 2>/dev/null; then echo "DONE at poll $i"; break; fi
  sleep 20
done
echo "=== results ==="
grep -E "freeze rc=|CLEAN RUN EXIT CODE" /tmp/r5p5_clean_outer.log
echo "=== clean run log ==="
grep -E "ALIGNED|FROZEN|verify|stage-backup|reset |date 2026|BILLED|FINAL|ORACLE_|verdict|stage-drop|REPAIR" /tmp/p5c_run.log | head -15
