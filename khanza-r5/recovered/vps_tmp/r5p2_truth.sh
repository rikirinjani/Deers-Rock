set -e
echo "=== 1. Did I touch the live ledger? (my P2 tools only write sik_bench_p2, not sik_bench) ==="
echo "live sik_bench.dr_charge_ledger mtime-ish (max update):"
mysql -uroot -N -e "SELECT MAX(gmt_modified) FROM information_schema.tables WHERE table_schema=\"sik_bench\" AND table_name=\"dr_charge_ledger\";" 2>/dev/null || echo "(no gmt col)"
echo "live ledger totals NOW:"
mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(amount),0) FROM sik_bench.dr_charge_ledger;"
echo "=== 2. Is the original legacy tool (untouched) failing the same way? ==="
cd /opt/Deers-Rock/tools
git -C /opt/Deers-Rock status --short tools/charge_delta_per_component.py 2>/dev/null || echo "(not a git repo / no tracked change)"
env RUN_ID=r5p2_liveprobe python3 charge_delta_per_component.py --stage A 2>&1 | grep -E "Khanza total|DR ledger total|overall delta|gate|UNEXPLAINED" | head -8
echo "=== 3. Is the live ledger the ORIGINAL (Rp34.87B) or a rebuilt one (Rp32.45B)? ==="
echo "ORIGINAL R4 ledger: 356355 | 34870243633"
echo "CURRENT live:       356355 | 32452587969   <-- DIFFERENT (rebuilt)"
echo "=== 4. Can I rebuild the canonical ledger to match the consumer? Try the ORIGINAL builder with fallback ==="
env RUN_ID=r5p2_rebuild_orig python3 build_dr_charge_ledger.py --stage A 2>&1 | grep -E "registration|procedure|drug|tax rows|done|dr_tariff" | head
