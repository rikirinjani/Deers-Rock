#!/bin/bash
# R4 recon4: are dr_tariff codes real/used? ledger structure? October DR scope.
echo "=== dr_tariff codes in databarang / jns_perawatan ==="
mysql -uroot sik -e "
SELECT kode_brng, nama_brng, ralan FROM databarang WHERE kode_brng IN ('D-001','D-002','D-003');
SELECT kd_perawatan, nm_perawatan, total_byrdr FROM jns_perawatan WHERE kd_perawatan IN ('P-001','P-002');
SELECT COUNT(*) AS oct_dr FROM reg_periksa WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis LIKE 'DR%';" 2>&1
echo "=== billing rows carrying those codes (Oct DR) ==="
mysql -uroot sik -e "
SELECT b.nm_perawatan, b.status, COUNT(*), SUM(b.totalbiaya)
FROM billing b JOIN reg_periksa r ON r.no_rawat=b.no_rawat
WHERE r.no_rawat LIKE '2026/10/%' AND r.no_rkm_medis LIKE 'DR%'
AND (b.nm_perawatan IN ('D-001','D-002','D-003','P-001','P-002') OR b.nm_perawatan LIKE '%Registrasi%')
GROUP BY b.nm_perawatan, b.status LIMIT 20;" 2>&1
echo "=== distinct nm_perawatan/status sample for Oct DR billing ==="
mysql -uroot sik -e "
SELECT status, nm_perawatan, COUNT(*) c FROM billing b JOIN reg_periksa r ON r.no_rawat=b.no_rawat
WHERE r.no_rawat LIKE '2026/10/%' AND r.no_rkm_medis LIKE 'DR%'
GROUP BY status, nm_perawatan ORDER BY c DESC LIMIT 25;" 2>&1
echo "=== dr_charge_ledger structure + component/code sample ==="
mysql -uroot sik_bench -e "
SHOW CREATE TABLE dr_charge_ledger\G
SELECT component, code, COUNT(*), SUM(amount) FROM dr_charge_ledger GROUP BY component, code ORDER BY 3 DESC LIMIT 25;
SELECT COUNT(*) FROM dr_charge_ledger WHERE no_rawat LIKE '2026/10/%';" 2>&1
echo "=== sample D-001-like drug rows in dpo for Oct DR ==="
mysql -uroot sik -e "
SELECT d.kode_brng, db.nama_brng, db.ralan, COUNT(*) c FROM detail_pemberian_obat d
JOIN reg_periksa r ON r.no_rawat=d.no_rawat JOIN databarang db ON db.kode_brng=d.kode_brng
WHERE r.no_rawat LIKE '2026/10/%' AND r.no_rkm_medis LIKE 'DR%'
GROUP BY d.kode_brng, db.nama_brng, db.ralan ORDER BY c DESC LIMIT 10;" 2>&1
echo "=== three_count stages ==="
grep -n "stage\|window\|2026/10\|B1\|B3" /opt/Deers-Rock/tools/three_count_reconcile.py | head -25
