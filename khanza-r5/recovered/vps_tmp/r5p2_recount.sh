set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1 P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2
echo "=== rebuilt p2 ledger row/amount totals (should be 356355 / 34870243633 if full) ==="
mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(amount),0) FROM sik_bench_p2.dr_charge_ledger;"
echo "=== component split ==="
mysql -uroot -N -e "SELECT component, COUNT(*), SUM(amount) FROM sik_bench_p2.dr_charge_ledger GROUP BY component ORDER BY component;"
echo "=== what build_dr_charge_ledger_p2 logged for row counts ==="
grep -E "registration rows|procedure rows|drug rows|tax rows" /tmp/clean.log 2>/dev/null
