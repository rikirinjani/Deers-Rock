#!/bin/bash
# R4 recon6: PKs/FKs for battery injections + tooling presence
echo "=== billing CREATE ==="
mysql -uroot sik -e "SHOW CREATE TABLE billing\G" 2>&1 | head -40
echo "=== reg_periksa CREATE ==="
mysql -uroot sik -e "SHOW CREATE TABLE reg_periksa\G" 2>&1
echo "=== tooling ==="
which java faketime Xvfb 2>&1
echo "=== billing dup-insert probe (dry): find a simple Oct DR drug row to back up ==="
mysql -uroot sik -e "SELECT no_rawat, status, nm_perawatan, biaya, jumlah, totalbiaya FROM billing b JOIN reg_periksa r ON r.no_rawat=b.no_rawat WHERE r.no_rawat LIKE '2026/10/%' AND r.no_rkm_medis LIKE 'DR%' AND b.status='Obat' AND b.nm_perawatan NOT LIKE 'PPN%' LIMIT 3;" 2>&1
echo "=== PPN row sample ==="
mysql -uroot sik -e "SELECT no_rawat, status, nm_perawatan, biaya, jumlah, totalbiaya FROM billing b JOIN reg_periksa r ON r.no_rawat=b.no_rawat WHERE r.no_rawat LIKE '2026/10/%' AND r.no_rkm_medis LIKE 'DR%' AND b.nm_perawatan LIKE 'PPN%' LIMIT 2;" 2>&1
echo "=== ledger rows for fault-#8 code A000000804 (Oct) ==="
mysql -uroot sik_bench -e "SELECT COUNT(*), SUM(quantity), SUM(amount) FROM dr_charge_ledger WHERE component='drug' AND code='A000000804' AND no_rawat LIKE '2026/10/%';" 2>&1
echo "=== 2026/11 DR billing row count (fault #7 scope) ==="
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM billing b JOIN reg_periksa r ON r.no_rawat=b.no_rawat WHERE b.no_rawat LIKE '2027/06/%' AND r.no_rkm_medis LIKE 'DR%';" 2>&1
