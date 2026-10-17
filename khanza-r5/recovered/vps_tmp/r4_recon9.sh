#!/bin/bash
# r4_recon9: price-uniformity per code, single-visit codes (fault #1/#8 targets),
# Oct DR value-row count (mutation scope), consumer reject handling, dpo columns
set -u
echo "=== ledger drug codes: visit counts + price uniformity (Oct) ==="
mysql -uroot -N -B sik_bench -e "
SELECT COUNT(*) FROM (
  SELECT code FROM dr_charge_ledger WHERE component='drug' AND no_rawat LIKE '2026/10/%'
  GROUP BY code HAVING COUNT(DISTINCT unit_price)>1) x"
echo "non-uniform drug codes above (0 expected)"
echo "--- single-visit drug codes (fault #1/#8 target) ---"
mysql -uroot -N -B sik_bench -e "
SELECT code, no_rawat, unit_price, quantity, amount FROM dr_charge_ledger
WHERE component='drug' AND no_rawat LIKE '2026/10/%'
AND code IN (SELECT code FROM (SELECT code FROM dr_charge_ledger WHERE component='drug' AND no_rawat LIKE '2026/10/%' GROUP BY code HAVING COUNT(DISTINCT no_rawat)=1) t)
ORDER BY code LIMIT 10"
echo "=== ledger procedure codes: price uniformity (Oct) ==="
mysql -uroot -N -B sik_bench -e "
SELECT COUNT(*) FROM (
  SELECT code FROM dr_charge_ledger WHERE component='procedure' AND no_rawat LIKE '2026/10/%'
  GROUP BY code HAVING COUNT(DISTINCT unit_price)>1) x"
echo "non-uniform procedure codes above"
echo "--- single-visit procedure codes ---"
mysql -uroot -N -B sik_bench -e "
SELECT code, no_rawat, unit_price, quantity FROM dr_charge_ledger
WHERE component='procedure' AND no_rawat LIKE '2026/10/%'
AND code IN (SELECT code FROM (SELECT code FROM dr_charge_ledger WHERE component='procedure' AND no_rawat LIKE '2026/10/%' GROUP BY code HAVING COUNT(DISTINCT no_rawat)=1) t)
ORDER BY code LIMIT 6"
echo
echo "=== all-window uniformity (loader applies full window) ==="
mysql -uroot -N -B sik_bench -e "
SELECT 'drug_nonuniform', COUNT(*) FROM (SELECT code FROM dr_charge_ledger WHERE component='drug' GROUP BY code HAVING COUNT(DISTINCT unit_price)>1) x"
mysql -uroot -N -B sik_bench -e "
SELECT 'proc_nonuniform', COUNT(*) FROM (SELECT code FROM dr_charge_ledger WHERE component='procedure' GROUP BY code HAVING COUNT(DISTINCT unit_price)>1) x"
echo
echo "=== Oct DR billing VALUE rows (mutation-test domain) ==="
mysql -uroot -N -B sik -e "
SELECT COUNT(*) FROM billing b WHERE b.no_rawat IN (
  SELECT no_rawat FROM reg_periksa WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis LIKE 'DR%')
  AND (b.biaya>0 OR b.totalbiaya>0) AND b.status NOT LIKE 'Ttl%'"
echo
echo "=== PPN billing rows sample (fault #6 target) ==="
mysql -uroot -N -B sik -e "
SELECT no_rawat, status, nm_perawatan, biaya, jumlah, totalbiaya FROM billing
WHERE no_rawat LIKE '2026/10/%' AND (nm_perawatan LIKE '%PPN%' OR status LIKE '%PPN%')
AND (biaya>0 OR totalbiaya>0) LIMIT 5"
echo
echo "=== consumer reject handling (fault #2) ==="
grep -n -i "unknown\|reject\|skip\|missing\|not found\|tidak" /opt/simrs-khanza/consumer/KhanzaBillingConsumer.java | head -25
echo
echo "=== dpo table columns (fake-row insert, fault #2) ==="
mysql -uroot -N -e "SHOW COLUMNS FROM sik.detail_pemberian_obat" | head -30
echo
echo "=== dpo NOT NULL without default? ==="
mysql -uroot -N -e "SHOW COLUMNS FROM sik.detail_pemberian_obat" | awk '$3=="NO" && $5=="NULL" {print}' 
echo "(rows above: NOT NULL, no default)"
echo
echo "=== billing template row (fault #4 clone) full columns ==="
mysql -uroot -N -B -e "SELECT * FROM sik.billing WHERE no_rawat LIKE '2026/10/%' AND status='Obat' AND (biaya>0) LIMIT 1\G" 2>/dev/null | head -20
mysql -uroot -e "SELECT * FROM sik.billing WHERE no_rawat LIKE '2026/10/%' AND status='Obat' AND biaya>0 LIMIT 1\G" | head -25
echo
echo "=== ledger checksum now (baseline for A1 no-op proof) ==="
mysql -uroot -N -B sik_bench -e "SELECT component, COUNT(*), ROUND(SUM(amount),2), ROUND(SUM(quantity),2) FROM dr_charge_ledger GROUP BY component ORDER BY component"
echo
echo "=== billed visit count for single-visit-code visits (fault targets sanity) ==="
mysql -uroot -N -B sik -e "SELECT COUNT(*) FROM billing WHERE no_rawat='$(mysql -uroot -N -B sik_bench -e "SELECT no_rawat FROM dr_charge_ledger WHERE component='drug' AND no_rawat LIKE '2026/10/%' GROUP BY code HAVING COUNT(DISTINCT no_rawat)=1 LIMIT 1" | head -1)'"
