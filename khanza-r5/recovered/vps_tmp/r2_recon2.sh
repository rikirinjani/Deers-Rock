#!/usr/bin/env bash
set -uo pipefail
echo "=== R1: 86,455 vs 86,101 (the 354) — monthly DR visit counts ==="
mysql -uroot sik -N -B -e "SELECT SUBSTRING_INDEX(no_rawat,'/',2) AS ym, COUNT(*) AS c FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%' GROUP BY ym ORDER BY ym;"
echo
echo "total DR:"
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%';"
echo
echo "=== B3 generation window (generate_scale_encounters.py) ==="
grep -nE "365|30|90|window|days|B3|B2|B1" /opt/Deers-Rock/tools/generate_scale_encounters.py | head -25
echo
echo "=== R2: revenue split ==="
echo "full-window (all 86,455):"
mysql -uroot sik -N -B -e "SELECT ROUND(SUM(biaya*COALESCE(jumlah,1)+totalbiaya)/1e9,4) AS bn FROM billing b JOIN reg_periksa r ON b.no_rawat=r.no_rawat WHERE r.no_rkm_medis LIKE 'DR%' AND b.status NOT LIKE 'Ttl%';"
echo "non-October (B3 window, 86,101):"
mysql -uroot sik -N -B -e "SELECT ROUND(SUM(biaya*COALESCE(jumlah,1)+totalbiaya)/1e9,4) AS bn FROM billing b JOIN reg_periksa r ON b.no_rawat=r.no_rawat WHERE r.no_rkm_medis LIKE 'DR%' AND b.status NOT LIKE 'Ttl%' AND b.no_rawat NOT LIKE '2026/10/%';"
echo "October-only (the difference):"
mysql -uroot sik -N -B -e "SELECT COUNT(*) AS visits, ROUND(SUM(biaya*COALESCE(jumlah,1)+totalbiaya)/1e9,4) AS bn FROM billing b JOIN reg_periksa r ON b.no_rawat=r.no_rawat WHERE r.no_rkm_medis LIKE 'DR%' AND b.status NOT LIKE 'Ttl%' AND b.no_rawat LIKE '2026/10/%';"
