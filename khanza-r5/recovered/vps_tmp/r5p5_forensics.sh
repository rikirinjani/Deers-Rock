echo "=== /tmp p5* logs (any exit-code markers?) ==="
ls -la /tmp/p5* 2>/dev/null
echo ""
echo "=== /tmp/r5p5_drift.txt ==="
cat /tmp/r5p5_drift.txt 2>/dev/null
echo ""
echo "=== /tmp/r5p5_strata_visits.txt ==="
cat /tmp/r5p5_strata_visits.txt 2>/dev/null
echo ""
echo "=== search for exit-code markers anywhere under /tmp ==="
grep -rl "EXIT CODE" /tmp/p5* 2>/dev/null
echo ""
echo "=== database.ini (harness) ==="
cat /opt/simrs-khanza/setting/database.ini 2>/dev/null | tr -d "\r"
