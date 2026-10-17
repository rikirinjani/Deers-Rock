#!/usr/bin/env bash
set -uo pipefail
RES=/opt/dr-benchmark/results/Bseries_20261012T045027Z
echo "=== 86,101 origin: B3 consumer OK line ==="
grep -oE "Processed [0-9]+ visits, [0-9]+ billing rows" "$RES/consumer_B3.log" | tail -1
echo
echo "=== B3 generation: days + start (state.json) ==="
python3 -c "
import json
try:
    d=json.load(open('/opt/dr-benchmark/state/state.json'))
    for k in d:
        if any(s in str(k).lower() for s in ('b3','day','start','window','encounter','seed','rate','oct')):
            print(k,'=',d[k])
except Exception as e: print('state read err:',e)
"
echo
echo "=== DR visits in B3 window 2026-10-01..2027-09-30 vs total vs outside ==="
mysql -uroot sik -N -B -e "SELECT 'in_window' tag, COUNT(*) n FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%' AND tgl_registrasi >= '2026-10-01' AND tgl_registrasi < '2027-10-01';"
mysql -uroot sik -N -B -e "SELECT 'total' tag, COUNT(*) n FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%';"
mysql -uroot sik -N -B -e "SELECT 'outside' tag, COUNT(*) n FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%' AND (tgl_registrasi < '2026-10-01' OR tgl_registrasi >= '2027-10-01');"
echo
echo "=== the 354 candidates: DR rows by tgl month ==="
mysql -uroot sik -N -B -e "SELECT DATE_FORMAT(tgl_registrasi,'%Y-%m') ym, COUNT(*) n FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%' GROUP BY ym ORDER BY ym;"
echo
echo "=== revenue: total / non-Oct / Oct (SUM totalbiaya non-Ttl, DR-joined) ==="
mysql -uroot sik -N -B -e "SELECT 'total' tag, ROUND(SUM(totalbiaya)/1e9,4) bn FROM billing b JOIN reg_periksa r ON b.no_rawat=r.no_rawat WHERE r.no_rkm_medis LIKE 'DR%' AND b.status NOT LIKE 'Ttl%';"
mysql -uroot sik -N -B -e "SELECT 'non_oct' tag, ROUND(SUM(totalbiaya)/1e9,4) bn FROM billing b JOIN reg_periksa r ON b.no_rawat=r.no_rawat WHERE r.no_rkm_medis LIKE 'DR%' AND b.status NOT LIKE 'Ttl%' AND b.no_rawat NOT LIKE '2026/10/%';"
mysql -uroot sik -N -B -e "SELECT 'oct' tag, ROUND(SUM(totalbiaya)/1e9,4) bn FROM billing b JOIN reg_periksa r ON b.no_rawat=r.no_rawat WHERE r.no_rkm_medis LIKE 'DR%' AND b.status NOT LIKE 'Ttl%' AND b.no_rawat LIKE '2026/10/%';"
echo
echo "=== top_diagnoses empty-set at each R2-3 cutoff ==="
mysql -uroot sik -N -B -e "SELECT 'all_dr' tag, COUNT(*) n FROM diagnosa_pasien dp JOIN reg_periksa r ON dp.no_rawat=r.no_rawat WHERE r.no_rkm_medis LIKE 'DR%' AND dp.kd_penyakit IS NOT NULL;"
for c in "2026-11-10" "2027-02-03" "2027-06-10" "2027-09-30"; do
  echo "cutoff=$c:"
  mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM diagnosa_pasien dp JOIN reg_periksa r ON dp.no_rawat=r.no_rawat WHERE r.no_rkm_medis LIKE 'DR%' AND r.tgl_registrasi <= '$c' AND dp.kd_penyakit IS NOT NULL;"
done
echo
echo "=== revenue_by_clinic EXPLAIN (scans raw billing?) ==="
mysql -uroot sik -N -B -e "EXPLAIN SELECT r.nm_klinik, ROUND(SUM(biaya*COALESCE(jumlah,1)+totalbiaya)/1e6,2) FROM reg_periksa r JOIN billing b ON b.no_rawat=r.no_rawat WHERE r.no_rkm_medis LIKE 'DR%' AND b.status NOT LIKE 'Ttl%' GROUP BY r.nm_klinik;" 2>/dev/null
echo
echo "=== p3_report.md (344/1041/41461 + pool note) ==="
head -45 /opt/dr-benchmark/p-chain/p3_report.md
