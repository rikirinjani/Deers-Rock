#!/bin/bash
# r4_recon10: which price source actually built the ledger (ralan vs h_beli vs total_byrdr)
set -u
echo "=== drug unit_price vs databarang.ralan vs dpo.h_beli (Oct, mismatch counts) ==="
mysql -uroot -N -B sik_bench -e "
SELECT 'ledger_vs_ralan_mismatch', COUNT(*) FROM dr_charge_ledger l
JOIN sik.databarang b ON b.kode_brng=l.code
WHERE l.component='drug' AND l.no_rawat LIKE '2026/10/%' AND ROUND(l.unit_price,2)<>ROUND(b.ralan,2)" 2>/dev/null
mysql -uroot -N -B sik -e "
SELECT 'ledger_vs_ralan_mismatch_sikdb', COUNT(*) FROM sik_bench.dr_charge_ledger l
JOIN databarang b ON b.kode_brng=l.code
WHERE l.component='drug' AND l.no_rawat LIKE '2026/10/%' AND ROUND(l.unit_price,2)<>ROUND(b.ralan,2)"
mysql -uroot -N -B sik -e "
SELECT 'ledger_vs_hbeli_mismatch', COUNT(*) FROM sik_bench.dr_charge_ledger l
JOIN (SELECT no_rawat, kode_brng, MAX(h_beli) hb FROM detail_pemberian_obat
      WHERE no_rawat LIKE '2026/10/%' GROUP BY no_rawat, kode_brng) d
  ON d.no_rawat=l.no_rawat AND d.kode_brng=l.code
WHERE l.component='drug' AND l.no_rawat LIKE '2026/10/%' AND ROUND(l.unit_price,2)<>ROUND(d.hb,2)"
echo "=== distinct ralan==h_beli for Oct ledger drug codes ==="
mysql -uroot -N -B sik -e "
SELECT 'codes_ralan_eq_hbeli', COUNT(*) FROM (
  SELECT l.code FROM sik_bench.dr_charge_ledger l
  JOIN databarang b ON b.kode_brng=l.code
  JOIN (SELECT kode_brng, MAX(h_beli) hb, COUNT(DISTINCT h_beli) nh FROM detail_pemberian_obat WHERE no_rawat LIKE '2026/10/%' GROUP BY kode_brng) d ON d.kode_brng=l.code
  WHERE l.component='drug' AND l.no_rawat LIKE '2026/10/%'
  GROUP BY l.code HAVING ROUND(MAX(b.ralan),2)=ROUND(MAX(d.hb),2) AND MAX(d.nh)=1) x"
mysql -uroot -N -B sik -e "
SELECT 'codes_total', COUNT(DISTINCT code) FROM sik_bench.dr_charge_ledger WHERE component='drug' AND no_rawat LIKE '2026/10/%'"
echo "=== procedure: unit_price vs rawat_jl_dr.biaya_rawat vs jns_perawatan.total_byrdr ==="
mysql -uroot -N -B sik -e "
SELECT 'proc_vs_rawatjl_mismatch', COUNT(*) FROM sik_bench.dr_charge_ledger l
JOIN (SELECT no_rawat, kd_jenis_prw, MAX(biaya_rawat) br FROM rawat_jl_dr
      WHERE no_rawat LIKE '2026/10/%' GROUP BY no_rawat, kd_jenis_prw) r
  ON r.no_rawat=l.no_rawat AND r.kd_jenis_prw=l.code
WHERE l.component='procedure' AND l.no_rawat LIKE '2026/10/%' AND ROUND(l.unit_price,2)<>ROUND(r.br,2)"
mysql -uroot -N -B sik -e "
SELECT 'proc_vs_jns_mismatch', COUNT(*) FROM sik_bench.dr_charge_ledger l
JOIN jns_perawatan j ON j.kd_jenis_prw=l.code
WHERE l.component='procedure' AND l.no_rawat LIKE '2026/10/%' AND ROUND(l.unit_price,2)<>ROUND(j.total_byrdr,2)"
echo "=== dpo h_beli uniform per code? (Oct) ==="
mysql -uroot -N -B sik -e "
SELECT 'hbeli_nonuniform_codes', COUNT(*) FROM (SELECT kode_brng FROM detail_pemberian_obat WHERE no_rawat LIKE '2026/10/%' GROUP BY kode_brng HAVING COUNT(DISTINCT h_beli)>1) x"
echo "=== single-visit Oct drug codes (with visits) — fault #1/#8 pick ==="
mysql -uroot -N -B sik -e "
SELECT l.code, l.no_rawat, l.unit_price, l.quantity, l.amount, ROUND(b.ralan,2)
FROM sik_bench.dr_charge_ledger l JOIN databarang b ON b.kode_brng=l.code
WHERE l.component='drug' AND l.no_rawat LIKE '2026/10/%'
AND l.code IN (SELECT c FROM (SELECT code c FROM sik_bench.dr_charge_ledger WHERE component='drug' AND no_rawat LIKE '2026/10/%' GROUP BY code HAVING COUNT(DISTINCT no_rawat)=1) t)
ORDER BY l.amount DESC LIMIT 8"
echo "=== candidate fault#1 code with few Oct visits ==="
mysql -uroot -N -B sik -e "
SELECT l.code, COUNT(DISTINCT l.no_rawat) vis, MAX(b.ralan), MAX(l.unit_price)
FROM sik_bench.dr_charge_ledger l JOIN databarang b ON b.kode_brng=l.code
WHERE l.component='drug' AND l.no_rawat LIKE '2026/10/%'
GROUP BY l.code HAVING vis BETWEEN 1 AND 5 ORDER BY vis, l.code LIMIT 8"
echo "=== visit for fault#2/4/5/6: one Oct visit with drugs+PPN, billing rows ==="
mysql -uroot -N -B sik -e "
SELECT b.no_rawat, COUNT(*) rows, SUM(CASE WHEN (biaya>0 OR totalbiaya>0) AND status NOT LIKE 'Ttl%' THEN 1 ELSE 0 END) valrows
FROM billing b WHERE b.no_rawat LIKE '2026/10/%'
AND EXISTS(SELECT 1 FROM sik_bench.dr_charge_ledger l WHERE l.no_rawat=b.no_rawat AND l.component='drug')
AND EXISTS(SELECT 1 FROM billing p WHERE p.no_rawat=b.no_rawat AND p.nm_perawatan LIKE '%PPN%')
GROUP BY b.no_rawat HAVING valrows BETWEEN 3 AND 8 ORDER BY b.no_rawat LIMIT 5"
