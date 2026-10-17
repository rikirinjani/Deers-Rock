echo "=== /tmp/p5d_run.log (drift demo) ==="
cat /tmp/p5d_run.log 2>/dev/null
echo ""
echo "=== /tmp/p5_strata_run.log (strata demo, key lines) ==="
grep -nE "ALLOW-STRATA|stage-backup|stage-restore|date 2026-10-01|FAILED|BILLED|REPAIR-SKIPPED|FINAL|ORACLE_|EXIT|verdict" /tmp/p5_strata_run.log 2>/dev/null
echo ""
echo "=== strata log exit marker ==="
grep -nE "EXIT CODE|exit" /tmp/p5_strata_run.log 2>/dev/null
echo "=== drift log exit marker ==="
grep -nE "EXIT CODE|exit" /tmp/p5d_run.log 2>/dev/null
