echo "=== P5 demo run dirs ==="
ls -d /opt/dr-benchmark/results/r5p5_* 2>/dev/null
echo ""
echo "=== strata state.json ==="
cat /opt/dr-benchmark/results/r5p5_strata/B3_oracle_run_r5/.state.json 2>/dev/null | python3 -m json.tool 2>/dev/null | head -30
echo ""
echo "=== clean state.json ==="
cat /opt/dr-benchmark/results/r5p5_clean/B3_oracle_run_r5/.state.json 2>/dev/null | python3 -m json.tool 2>/dev/null | head -30
echo ""
echo "=== live sik stage tables ==="
mysql -uroot -N -e "SHOW TABLES FROM sik LIKE '"'"'r5_stage_%'"'"';"
echo "(count above)"
echo ""
echo "=== databarang B000001135 price (canonical check) ==="
mysql -uroot -e "SELECT kode_brng, ralan FROM sik.databarang WHERE kode_brng='B000001135';" 2>&1
echo ""
echo "=== database.ini ==="
grep -E "^database=" /opt/simrs-khanza/setting/database.ini
