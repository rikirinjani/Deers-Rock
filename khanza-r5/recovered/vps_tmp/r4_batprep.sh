#!/bin/bash
# r4_batprep: battery preconditions — snapshot status, key uniqueness, scope counts
set -u
echo "=== snapshot status ==="
cat /tmp/d1_snapshot.log 2>/dev/null | tail -8
ls -la /opt/dr-benchmark/snapshots/ 2>/dev/null
echo
echo "=== billing (no_rawat,noindex) uniqueness (mutation restore key) ==="
mysql -uroot -N -B sik -e "SELECT COUNT(*), COUNT(DISTINCT CONCAT(no_rawat,'|',noindex)) FROM billing"
echo
echo "=== scope counts ==="
mysql -uroot -N -B sik -e "SELECT 'dpo_nonDR_oct', COUNT(*) FROM detail_pemberian_obat d WHERE d.no_rawat LIKE '2026/10/%' AND d.no_rawat NOT IN (SELECT no_rawat FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%')"
mysql -uroot -N -B sik -e "SELECT 'rawatjl_nonDR_oct', COUNT(*) FROM rawat_jl_dr r WHERE r.no_rawat LIKE '2026/10/%' AND r.no_rawat NOT IN (SELECT no_rawat FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%')"
mysql -uroot -N -B sik -e "SELECT 'billing_nonDR_oct', COUNT(*) FROM billing b WHERE b.no_rawat LIKE '2026/10/%' AND b.no_rawat NOT IN (SELECT no_rawat FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%')"
echo
echo "=== target visit drug codes with Oct visit counts (fault #1 pick) ==="
mysql -uroot -N -B sik -e "
SELECT l.code, l.unit_price, l.quantity, l.amount, (SELECT COUNT(DISTINCT x.no_rawat) FROM sik_bench.dr_charge_ledger x WHERE x.component='drug' AND x.code=l.code AND x.no_rawat LIKE '2026/10/%') vis
FROM sik_bench.dr_charge_ledger l WHERE l.no_rawat='2026/10/01/000254' AND l.component='drug' ORDER BY vis"
echo
echo "=== target visit PPN row noindex ==="
mysql -uroot -N -B sik -e "SELECT noindex, nm_perawatan, biaya, jumlah, totalbiaya FROM billing WHERE no_rawat='2026/10/01/000254' AND nm_perawatan LIKE '%PPN%' AND (biaya>0 OR totalbiaya>0)"
echo
echo "=== fault#7 month: 2027/02 DR billing rows + sum ==="
mysql -uroot -N -B sik -e "SELECT COUNT(*), ROUND(SUM(totalbiaya),2) FROM billing WHERE no_rawat IN (SELECT no_rawat FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%' AND no_rawat LIKE '2027/02/%')"
echo
echo "=== reg_periksa total (fault#3 restore target) ==="
mysql -uroot -N -B sik -e "SELECT COUNT(*) FROM reg_periksa"
echo
echo "=== does 2026/10/11/900001 collide anywhere ==="
mysql -uroot -N -B sik -e "SELECT COUNT(*) FROM reg_periksa WHERE no_rawat='2026/10/11/900001'"
