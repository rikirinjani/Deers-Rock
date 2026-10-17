#!/usr/bin/env bash
set -uo pipefail
echo "=== R2-3 Q3: 86,455 vs 86,101 = 354 reconciliation ==="
mysql -uroot sik -N -B -e "SELECT 'total DR', COUNT(*) FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%';"
mysql -uroot sik -N -B -e "SELECT 'B3 window DR', COUNT(*) FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%' AND no_rawat NOT LIKE '2026/10/%';"
mysql -uroot sik -N -B -e "SELECT 'Oct DR', COUNT(*) FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%' AND no_rawat LIKE '2026/10/%';"
mysql -uroot sik -N -B -e "SELECT 'StageA DR (G2)', COUNT(*) FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%' AND no_rawat LIKE '2026/10/%';"
echo
echo "=== revenue split (Oct vs rest) ==="
mysql -uroot sik -N -B -e "SELECT ROUND(SUM(totalbiaya)/1e9,4) AS rest_bn FROM billing b JOIN reg_periksa r ON b.no_rawat=r.no_rawat WHERE r.no_rkm_medis LIKE 'DR%' AND b.status NOT LIKE 'Ttl%' AND b.no_rawat NOT LIKE '2026/10/%';"
mysql -uroot sik -N -B -e "SELECT ROUND(SUM(totalbiaya)/1e9,4) AS oct_bn FROM billing b JOIN reg_periksa r ON b.no_rawat=r.no_rawat WHERE r.no_rkm_medis LIKE 'DR%' AND b.status NOT LIKE 'Ttl%' AND b.no_rawat LIKE '2026/10/%';"
echo
echo "=== R2-3 Q4: top_diagnoses query source (empty at prefix sizes?) ==="
python3 -c "
import importlib.util
spec=importlib.util.spec_from_file_location('cst','/opt/Deers-Rock/tools/collect_scale_telemetry.py')
m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
for n,q in m.REPORT_QUERIES:
    if 'diagnos' in n.lower():
        print('QUERY:',n); print(q[:400]); print()
"
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM diagnosa_pasien WHERE no_rawat IN (SELECT no_rawat FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%');"
echo "(diagnosa rows joined to DR visits: 0 => top_diagnoses scans an empty set at prefix sizes => not a scaling result)"
echo
echo "=== which REPORT_QUERIES are Khanza-template vs benchmark-authored? (source comment check) ==="
grep -nE "Khanza|template|author|benchmark|custom" /opt/Deers-Rock/tools/collect_scale_telemetry.py | head -20
echo
echo "=== R2-3 Q1: root-cause file tgl_byr / 06:44 evidence (for citation) ==="
grep -nE "tgl_byr|06:44|faketime|reset|interrupt|delete" /opt/dr-benchmark/p-chain/p1_rootcause.md | head -25
echo
echo "=== R2-3 Q5: baseline scaling table 344/1041/41461 origin ==="
grep -nE "344|1041|41,?461|scaling" /opt/dr-benchmark/p-chain/p3_report.md 2>/dev/null | head
grep -rnE "344|1041" /opt/dr-benchmark/p-chain/p3_latency.json 2>/dev/null | head
