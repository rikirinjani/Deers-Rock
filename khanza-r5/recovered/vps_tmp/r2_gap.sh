#!/usr/bin/env bash
set -uo pipefail
echo "=== 86,455 total vs 86,101 B3-processed: find the 354 ==="
echo "B3 consumer OK line:"
grep -oE "Processed [0-9]+ visits, [0-9]+ billing rows, total Rp [0-9]+" /opt/dr-benchmark/results/Bseries_20261012T045027Z/consumer_B3.log | tail -1
echo
echo "reg_periksa DR by no_rawat month (the 12 months):"
mysql -uroot sik -N -B -e "SELECT SUBSTRING_INDEX(no_rawat,'/',2) ym, COUNT(*) n FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%' GROUP BY ym ORDER BY ym;"
echo
echo "=== Is 86,101 the NON-October total? (86,455 - 354 = 86,101; is there a 354 subset?) ==="
mysql -uroot sik -N -B -e "SELECT COUNT(*) total_dr, SUM(SUBSTRING_INDEX(no_rawat,'/',2)='2026/10') oct_dr FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%';"
echo
echo "=== Stage A / G2: what '354' refers to (G2 seed) — check run_all + state ==="
grep -nE "G2|354|stageA|stage_A|seed" /opt/dr-benchmark/run_all.sh | head -20
echo
echo "=== state.json: B3 days / start / lowered ==="
python3 -c "
import json
d=json.load(open('/opt/dr-benchmark/state/state.json'))
for k in sorted(d):
    if any(s in k.lower() for s in ('b3','day','start','window','seed','rate','oct','g2','stage')):
        print(k,'=',d[k])
"
echo
echo "=== 34.73B vs 34.87B: where do these two figures live? ==="
grep -rnE "34,7[0-9]{3}|34\.73|34,8[0-9]{3}|34\.87|34\.8|34\.7" /opt/dr-benchmark/results/Bseries_20261012T045027Z/*.md 2>/dev/null | head
echo
echo "=== B3_sampled_form_diff.md revenue line (if any) ==="
grep -iE "total|revenue|Rupee|Rp " /opt/dr-benchmark/results/Bseries_20261012T045027Z/B3_sampled_form_diff.md 2>/dev/null | head
echo
echo "=== telemetry_B3.json: total revenue key ==="
python3 -c "
import json
d=json.load(open('/opt/dr-benchmark/results/Bseries_20261012T045027Z/telemetry_B3.json'))
for k in sorted(d):
    if any(s in k.lower() for s in ('total','revenue','rp','amount','billing_rows','visits')):
        print(k,'=',d[k])
" 2>/dev/null
