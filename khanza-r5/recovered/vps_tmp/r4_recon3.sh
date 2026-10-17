#!/bin/bash
# R4 recon3: per-visit OK lines, ledger price source, provenance, schema samples
R=/opt/dr-benchmark/results/Bseries_20261012T045027Z
echo "=== per-visit OK lines in consumer logs? ==="
grep -m 3 "800190\|OK 2026\|OK: 2026" $R/consumer_B3.log | head -5
grep -c "OK" $R/consumer_B3.log
echo "--- consumer_B3 head 15 ---"
head -15 $R/consumer_B3.log
echo "--- search any per-visit pattern ---"
grep -m 5 -E "visit|no_rawat|Rp" $R/consumer_B3.log | head -10
echo "=== sampled diff tool: how it snapshots consumer side ==="
grep -n "snapshot\|consumer_total\|totalbiaya\|SELECT" /opt/Deers-Rock/tools/sampled_real_form_diff.py | head -30
echo "=== ledger builder price source ==="
grep -n "dr_tariff\|ralan\|harga\|price" /opt/Deers-Rock/tools/build_dr_charge_ledger.py | head -30
echo "=== dr_tariff schema + rows ==="
mysql -uroot sik_bench -e "SHOW CREATE TABLE dr_tariff\G; SELECT * FROM dr_tariff;" 2>&1
echo "=== overlay: where dr_tariff feeds databarang ==="
grep -rn "dr_tariff" /opt/Deers-Rock/tools/*.py /opt/dr-benchmark/run_all.sh 2>/dev/null | head -20
echo "=== REPORT_QUERIES provenance ==="
sed -n '50,100p' /opt/Deers-Rock/tools/collect_scale_telemetry.py
echo "=== existing DR reg row sample (cols for injection) ==="
mysql -uroot sik -e "SELECT * FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%' AND no_rawat LIKE '2026/10/%' LIMIT 1\G" 2>&1 | head -30
echo "=== collision check for fresh no_rawat ==="
mysql -uroot sik -N -B -e "SELECT no_rawat FROM reg_periksa WHERE no_rawat LIKE '2026/10/11/9%' LIMIT 5; SELECT COUNT(*) FROM billing WHERE no_rawat='2026/10/11/900001';" 2>&1
