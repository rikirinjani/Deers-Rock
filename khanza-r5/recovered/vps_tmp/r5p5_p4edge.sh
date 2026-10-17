echo "=== what date does the P4 B3-edge evidence cite? ==="
grep -aE "STRATA|date|tgl|reg_periksa|2026-" /opt/dr-benchmark/p-chain/r5_p4_agentblock_evidence.md 2>/dev/null | grep -aiE "strata|edge" | head -10
echo ""
echo "=== P4 B3-edge section ==="
sed -n "/B3 edge/,/E2/p" /opt/dr-benchmark/p-chain/r5_p4_agentblock_evidence.md 2>/dev/null | tr -d "\r" | head -30
