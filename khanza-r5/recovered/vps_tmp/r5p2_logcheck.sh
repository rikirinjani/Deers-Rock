cd /opt/Deers-Rock/tools
echo "=== case C log (tariff populated, expect build) ==="
tail -20 /tmp/log_fcC.log 2>/dev/null
echo "=== case A log (expect FAIL-CLOSED text) ==="
grep -E "FAIL-CLOSED|EMPTY|dr_tariff" /tmp/log_fcA.log 2>/dev/null | head
