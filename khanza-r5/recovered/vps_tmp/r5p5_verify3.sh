echo "=== strata state.json batches ==="
python3 -c "
import json
st = json.load(open('/opt/dr-benchmark/results/r5p5_strata/B3_oracle_run_r5/.state.json'))
for d,b in st['batches'].items():
    print('batch_key=%r status=%s rc=%s' % (d, b.get('status'), b.get('rc')))
print('out_of_envelope:', st.get('out_of_envelope'))
print('nrs:', st.get('nrs'))
"
echo ""
echo "=== strata result CSV ==="
cat /opt/dr-benchmark/results/r5p5_strata/B3_sampled_form_diff_r5.csv
echo ""
echo "=== strata result MD ==="
cat /opt/dr-benchmark/results/r5p5_strata/B3_sampled_form_diff_r5.md
echo ""
echo "=== harness logs (strata) ==="
find /opt/dr-benchmark/results/r5p5_strata -name "harness_*" 2>/dev/null
