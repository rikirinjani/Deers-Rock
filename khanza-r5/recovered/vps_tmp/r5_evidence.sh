set -e
cd /opt/dr-benchmark
export DBUTIL_FORCE_ROOT=1
# live sik must be byte-stable (demo ran on sik_r5)
echo "=== live sik post-fingerprint (expect 1464593 / 34895128580) ==="
mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(totalbiaya),0) FROM sik.billing;"
echo "=== AC-7: oracle final result (0/50 vs frozen baseline) ==="
ls -la /opt/dr-benchmark/results/r5_p1_demo/B3_sampled_form_diff_r5.* 2>/dev/null
echo "--- md summary ---"
grep -E "visits=|drift=|baseline=" /opt/dr-benchmark/results/r5_p1_demo/B3_sampled_form_diff_r5.md 2>/dev/null | head -5
echo "--- csv mismatch tally ---"
python3 -c "import csv;rows=list(csv.DictReader(open('/opt/dr-benchmark/results/r5_p1_demo/B3_sampled_form_diff_r5.csv')));n=len(rows);m=sum(1 for r in rows if r['mismatch'].strip() in ('True','true','YES'));print('sampled=%d mismatch=%d'%(n,m))"
echo "=== 4 historical drift visits in result? ==="
grep -E "2027/09/23/800080|2027/09/23/800214|2027/09/28/800109|2027/09/28/800164" /opt/dr-benchmark/results/r5_p1_demo/B3_sampled_form_diff_r5.csv 2>/dev/null | head -8
