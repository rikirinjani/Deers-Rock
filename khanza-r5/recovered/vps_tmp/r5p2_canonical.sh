set -e
cd /opt/Deers-Rock/tools
# P2 builder on LIVE: writes sik_bench.dr_charge_ledger from sik DR sources + live dr_tariff.
# Snapshot the current (legacy) ledger first for rollback safety.
echo "=== pre-rebuild: snapshot canonical ledger ==="
mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(amount),0) FROM sik_bench.dr_charge_ledger;"
mysql -uroot sik_bench -e "CREATE TABLE IF NOT EXISTS dr_charge_ledger_p2bak AS SELECT * FROM dr_charge_ledger;"
echo "backup rows: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_bench.dr_charge_ledger_p2bak;")"
echo "=== rebuild canonical 2026-10 DR cohort with the P2 builder (fail-closed, line-total) ==="
env RUN_ID=r5p2_canonical python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr 2>&1 | grep -E "dr_tariff authority|registration rows|procedure rows|drug rows|tax rows|done|FAIL-CLOSED|FALLBACK"
echo "=== post-rebuild: canonical ledger now ==="
mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(amount),0) FROM sik_bench.dr_charge_ledger;"
