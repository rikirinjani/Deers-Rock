set -e
cd /opt/dr-benchmark
echo "=== clone ready? ==="
mysql -uroot -N -e "SELECT \"p2 billing\", COUNT(*) FROM sik_p2.billing; SELECT \"p2 reg\", COUNT(*) FROM sik_p2.reg_periksa;"
echo "=== edge-strata visit discovery (consumer side, sik_p2) ==="
echo "-- (a) non-typical embalase/tuslah rows:"
mysql -uroot -N -e "SELECT \"embalase_tuslah\", COUNT(*) FROM sik_p2.detail_pemberian_obat WHERE COALESCE(embalase,0)<>0 OR COALESCE(tuslah,0)<>0;"
echo "-- (b) visits with >=3 procedure lines:"
mysql -uroot -N -e "SELECT \"gt3proc\", COUNT(*) FROM (SELECT no_rawat FROM sik_p2.rawat_jl_dr GROUP BY no_rawat HAVING COUNT(*)>=3) t;"
echo "-- (c) half-rupiah PPN: PPN rows with fractional (odd-cent) totals"
mysql -uroot -N -e "SELECT \"halfppn\", COUNT(*) FROM sik_p2.billing WHERE nm_perawatan LIKE \"%PPN%\" AND (totalbiaya*100) % 100 <> 0 LIMIT 1;" 2>/dev/null || echo "0"
echo "-- (d) zero-fee DR clinic visits (reg fee 0):"
mysql -uroot -N -e "SELECT \"zerofee\", COUNT(*) FROM sik_p2.reg_periksa rp WHERE rp.no_rkm_medis LIKE \"DR%\" AND rp.no_rawat LIKE \"2026/10/%\";"
