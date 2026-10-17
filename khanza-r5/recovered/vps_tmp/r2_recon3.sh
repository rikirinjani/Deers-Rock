#!/usr/bin/env bash
set -uo pipefail
echo "=== Q1: 86,101 vs 86,455 gap (the 354) — monthly ==="
mysql -uroot sik -N -B -e "SELECT SUBSTRING_INDEX(no_rawat,'/',2) AS ym, COUNT(*) AS n FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%' GROUP BY ym ORDER BY ym;"
echo
echo "=== Q2: total + non-Oct ==="
mysql -uroot sik -N -B -e "SELECT COUNT(*) AS total FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%';"
mysql -uroot sik -N -B -e "SELECT COUNT(*) AS non_oct FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%' AND no_rawat NOT LIKE '2026/10/%';"
echo
echo "=== Q3: B3 window definition in telemetry ==="
grep -nE "365|B3|days|window|365" /opt/Deers-Rock/tools/collect_scale_telemetry.py | head -12
echo
echo "=== Q4: revenue 34.73B vs 34.87B (SUM totalbiaya non-Ttl, DR-joined) ==="
mysql -uroot sik -N -B -e "SELECT ROUND(SUM(totalbiaya)/1e9,4) AS bn_total FROM billing b JOIN reg_periksa r ON b.no_rawat=r.no_rawat WHERE r.no_rkm_medis LIKE 'DR%' AND b.status NOT LIKE 'Ttl%';"
mysql -uroot sik -N -B -e "SELECT ROUND(SUM(totalbiaya)/1e9,4) AS bn_nonoct FROM billing b JOIN reg_periksa r ON b.no_rawat=r.no_rawat WHERE r.no_rkm_medis LIKE 'DR%' AND b.status NOT LIKE 'Ttl%' AND b.no_rawat NOT LIKE '2026/10/%';"
echo
echo "=== Q5: top_diagnoses empty at B3? ==="
mysql -uroot sik -N -B -e "SELECT COUNT(*) AS dx_total FROM diagnosa_pasien;"
mysql -uroot sik -N -B -e "SELECT COUNT(*) AS dx_dr FROM diagnosa_pasien dp JOIN reg_periksa r ON dp.no_rawat=r.no_rawat WHERE r.no_rkm_medis LIKE 'DR%';"
echo
echo "=== Q6: p3_report.md scaling table 344/1041/41461 origin ==="
grep -nE "344|1041|41,?461|scaling|B1|B2|B3" /opt/dr-benchmark/p-chain/p3_report.md 2>/dev/null | head -20
