set -e
echo "=== was the legacy gate ALREADY failing on live (pre-P2-deploy)? Check its most recent canonical artifact ==="
ls -t /opt/dr-benchmark/results/*/stageA_G2_validation.md 2>/dev/null | head -3
echo "=== run the LEGACY gate once more, full output tail ==="
cd /opt/Deers-Rock/tools
env RUN_ID=r5p2_probe python3 charge_delta_per_component.py --stage A 2>&1 | tail -12
echo "=== ledger window scope: how many 2026/10 vs other-month rows? ==="
mysql -uroot -N -e "SELECT LEFT(no_rawat,7) m, COUNT(*), SUM(amount) FROM sik_bench.dr_charge_ledger GROUP BY LEFT(no_rawat,7) ORDER BY m;"
echo "=== the canonical R4 'oct_window charge_delta 0' claim: which ledger was it built against? ==="
echo "R4 ledger (356355|34870243633) vs current (356355|32452587969): DIFF"
mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(amount),0) FROM sik_bench.dr_charge_ledger;"
