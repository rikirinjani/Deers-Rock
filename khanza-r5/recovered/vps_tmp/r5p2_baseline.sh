set -e
cd /opt/Deers-Rock/tools
echo "=== canonical Stage-A baseline (before any P2 change) ==="
RUN_ID=r5_p2_baseline python3 charge_delta_per_component.py --stage A 2>&1 | grep -E "Khanza total|Unexplained|gate" | head
RUN_ID=r5_p2_baseline python3 three_count_reconcile.py --stage A 2>&1 | grep -E "Count|A == B|gate|DR visits" | head
echo "=== ledger source-of-truth numbers ==="
mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(amount),0) FROM sik_bench.dr_charge_ledger WHERE no_rawat LIKE \"2026/10/%\";"
mysql -uroot -N -e "SELECT COUNT(*) FROM sik.reg_periksa WHERE no_rawat LIKE \"2026/10/%\" AND no_rkm_medis LIKE \"DR%\";"
