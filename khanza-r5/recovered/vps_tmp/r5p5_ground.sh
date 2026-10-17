cd /opt/Deers-Rock
echo "=== STRATA run dir ==="
find results -path "*r5p5_strata*" -name "*.csv" -o -path "*r5p5_strata*" -name "*.md" 2>/dev/null | head
R=$(find results -path "*r5p5_strata*" -name "B3_sampled_form_diff_r5.csv" | head -1)
echo "CSV: $R"
if [ -n "$R" ]; then echo "--- CSV content ---"; cat "$R"; fi
echo "=== state.json (strata) ==="
S=$(find results -path "*r5p5_strata*" -name ".state.json" | head -1)
if [ -n "$S" ]; then python3 -c "
import json,sys
st=json.load(open('$S'))
print('phase:', st.get('phase'))
print('out_of_envelope:', st.get('out_of_envelope'))
for d,b in st.get('batches',{}).items():
    print('batch', d, 'status=', b.get('status'), 'restored=', b.get('restored'), 'fail_reason=', b.get('fail_reason'), 'rc=', b.get('rc'), 'sukses=', b.get('sukses'))
"; fi
echo "=== DRIFT run dir CSV ==="
R2=$(find results -path "*r5p5_drift*" -name "*.csv" | head -1)
if [ -n "$R2" ]; then echo "$R2"; cat "$R2"; fi
echo "=== CLEAN run dir CSV ==="
R3=$(find results -path "*r5p5_clean*" -name "*.csv" | head -1)
if [ -n "$R3" ]; then echo "$R3"; cat "$R3"; fi
