cd /opt/Deers-Rock/tools
echo "=== AC-2 case A log (empty tariff, no fallback) ==="
grep -E "FAIL-CLOSED|EMPTY|refusing|done" /tmp/r5p2_A.log 2>/dev/null | head -3
echo "--- full caseA tail ---"
tail -4 /tmp/r5p2_A.log 2>/dev/null
echo "=== case B log (empty tariff, fallback) ==="
grep -E "FALLBACK-USED|done|legacy" /tmp/r5p2_B.log 2>/dev/null | head -3
tail -3 /tmp/r5p2_B.log 2>/dev/null
echo "=== case C log (tariff populated, no fallback) ==="
grep -E "dr_tariff authority|done" /tmp/r5p2_C.log 2>/dev/null | head -3
tail -3 /tmp/r5p2_C.log 2>/dev/null
