echo "=== r5p4_b3 run dir (P4 edge-strata evidence) ==="
find /opt/dr-benchmark/results/r5p4_b3 -maxdepth 3 -type f 2>/dev/null
echo ""
echo "=== P4 b3 CSV ==="
cat /opt/dr-benchmark/results/r5p4_b3/B3_sampled_form_diff_r5.csv 2>/dev/null
echo ""
echo "=== P4 b3 state.json (batch keys + statuses) ==="
python3 -c "
import json
st = json.load(open('/opt/dr-benchmark/results/r5p4_b3/B3_oracle_run_r5/.state.json'))
print('db:', st.get('db'))
for d, b in st.get('batches', {}).items():
    print('batch_key=%r visits=%s status=%s sukses=%s' % (d, b.get('visits'), b.get('status'), b.get('sukses')))
print('nrs:', st.get('nrs'))
"
echo ""
echo "=== P4 b3 tool log ==="
cat /opt/dr-benchmark/results/r5p4_b3/sampled_real_form_diff_r5.log 2>/dev/null | tr -d "\r"
