cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1 P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2
echo "=== (e) delete-drug-row result ==="
grep -oE "gate \(all deltas == 0, other == 0\): (PASS|FAIL)" /tmp/e1.log | head -1
grep -E "UNEXPLAINED 2026/10/01/000254" /tmp/e1.log | head -3
echo "=== (c) offsetting result ==="
grep -oE "gate \(all deltas == 0, other == 0\): (PASS|FAIL)" /tmp/e2.log | head -1
grep -E "UNEXPLAINED" /tmp/e2.log | head -4
echo "=== (f) unknown-status -> three_count P2-OTHER-STATUS ==="
grep -E "P2-OTHER-STATUS|verdict|P2-AC-" /tmp/e4.log | head -4
