#!/usr/bin/env bash
# diagnose B1 rung failure — read-only
echo "=== 230938 B1.log ==="
cat /opt/dr-benchmark/results/20261011T230938Z/B1.log 2>/dev/null | head -20
echo
echo "=== loader upsert mode ==="
grep -nE 'REPLACE INTO|ON DUPLICATE|INSERT IGNORE|INSERT INTO' /opt/Deers-Rock/tools/generate_scale_encounters.py | head -15
echo
echo "=== disk_guard def ==="
sed -n '/^disk_guard/,/^}/p' /opt/dr-benchmark/run_all.sh
echo
echo "=== reconcile stage scoping ==="
grep -nE 'stage|no_rawat LIKE|scope|B1' /opt/Deers-Rock/tools/three_count_reconcile.py | head -30
echo
echo "=== charge_delta scoping ==="
grep -nE 'stage|no_rawat LIKE|scope' /opt/Deers-Rock/tools/charge_delta_per_component.py | head -15
echo
echo "=== current sik_bench DR-row state ==="
mysql -uroot -N -B sik_bench -e "SELECT COUNT(*) FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%'; SELECT COUNT(*) FROM billing WHERE no_rawat LIKE '%/8%';" 2>&1
echo
echo "=== restore stub check (what sql_sik_bench_restore_clean does) ==="
grep -n 'sql_sik_bench_restore_clean' /opt/dr-benchmark/run_all.sh
echo
echo "=== enable_general_log def ==="
sed -n '/^enable_general_log/,/^}/p' /opt/dr-benchmark/run_all.sh
