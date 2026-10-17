cd /opt/dr-benchmark
echo "=== find result files ==="
find results/r5_p1_demo -name "*_r5.*" -o -name "*.md" 2>/dev/null | grep -i "form_diff\|oracle" | head
echo "--- all files in r5_p1_demo ---"
find results/r5_p1_demo -type f | head -30
echo "=== AC-7: read the final md ==="
MD=$(find results/r5_p1_demo -name "B3_sampled_form_diff_r5.md" 2>/dev/null | head -1)
echo "md=$MD"
cat "$MD" 2>/dev/null | head -25
echo "=== csv mismatch tally ==="
CSV=$(find results/r5_p1_demo -name "B3_sampled_form_diff_r5.csv" 2>/dev/null | head -1)
python3 -c "import csv;rows=list(csv.DictReader(open('$CSV')));n=len(rows);m=sum(1 for r in rows if (r.get('mismatch') or '').strip() in ('True','true','YES'));print('sampled=%d mismatch=%d'%(n,m))"
echo "=== 4 historical drift visits ==="
grep -E "2027/09/23/800080|2027/09/23/800214|2027/09/28/800109|2027/09/28/800164" "$CSV" 2>/dev/null
