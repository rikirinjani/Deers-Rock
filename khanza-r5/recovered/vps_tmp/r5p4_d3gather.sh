set -e
echo "=== P4-D3: release packaging inputs ==="
echo "--- Khanza jar sha256 ---"
sha256sum /opt/simrs-khanza/dist/SIMRSKhanza.jar
echo "--- JDK ---"
java -version 2>&1 | head -1
echo "--- MySQL server ---"
mysql -uroot -N -e "SELECT VERSION();"
echo "--- MySQL client/mysqldump ---"
mysql --version
mysqldump --version
echo "--- DR/adapter/consumer commit (git) ---"
cd /opt/Deers-Rock
git rev-parse HEAD 2>/dev/null && git log -1 --format="%h %s" 2>/dev/null || echo "(not a git repo on-box)"
echo "--- canonical ledger hash (pin the ground-truth reference) ---"
mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(amount),0) FROM sik_bench.dr_charge_ledger;"
sha256sum /opt/dr-benchmark/results/Bseries_20261012T045027Z/B3.encounters.txt
echo "--- P1/P2 tool SHAs (the gate surface) ---"
sha256sum /opt/Deers-Rock/tools/sampled_real_form_diff_r5.py /opt/Deers-Rock/tools/charge_delta_per_component_p2.py /opt/Deers-Rock/tools/three_count_reconcile_p2.py /opt/Deers-Rock/tools/build_dr_charge_ledger_p2.py 2>/dev/null
