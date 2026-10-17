set -e
echo "=== does sik.billing.jumlah carry meaningful per-line quantities? (not all 1) ==="
mysql -uroot -N -e "SELECT jumlah, COUNT(*) FROM sik.billing b JOIN sik.reg_periksa rp ON rp.no_rawat=b.no_rawat WHERE rp.no_rawat LIKE '2026/10/%' AND rp.no_rkm_medis LIKE 'DR%' AND (b.biaya>0 OR b.totalbiaya>0) AND b.status NOT LIKE 'Ttl%' GROUP BY jumlah ORDER BY jumlah LIMIT 15;"
echo "=== per-visit SUM(jumlah) drug for a multi-drug visit ==="
mysql -uroot -N -e "SELECT no_rawat, COUNT(*) rows, SUM(jumlah) qty FROM sik.billing b JOIN sik.reg_periksa rp ON rp.no_rawat=b.no_rawat WHERE rp.no_rawat LIKE '2026/10/%' AND rp.no_rkm_medis LIKE 'DR%' AND b.status='Obat' AND b.nm_perawatan NOT LIKE '%PPN%' GROUP BY no_rawat HAVING SUM(jumlah) > COUNT(*) LIMIT 5;"
echo "=== ledger quantity per visit for same ==="
mysql -uroot -N -e "SELECT no_rawat, SUM(quantity) qty FROM sik_bench.dr_charge_ledger WHERE component='drug' AND no_rawat LIKE '2026/10/%' GROUP BY no_rawat HAVING SUM(quantity)>1 LIMIT 5;"
