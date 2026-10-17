set -e
cd /opt/dr-benchmark
# Recreate the scratch pair for the B3 edge-strata run
echo "=== recreate sik_p2 / sik_bench_p2 (scratch) ==="
mysql -uroot -e "DROP DATABASE IF EXISTS sik_p2; DROP DATABASE IF EXISTS sik_bench_p2; CREATE DATABASE sik_p2; CREATE DATABASE sik_bench_p2;"
echo "dumping..."
t0=$(date +%s)
mysqldump -uroot sik > /tmp/sik_p2.sql
echo "sik dump $(($(date +%s)-t0))s $(stat -c%s /tmp/sik_p2.sql)"
mysql -uroot sik_p2 < /tmp/sik_p2.sql
echo "sik_p2 restore done"
rm -f /tmp/sik_p2.sql
echo "=== verify + get 5 edge-strata visits that exist on the clone ==="
mysql -uroot -N -e "SELECT \"p2 billing\", COUNT(*) FROM sik_p2.billing;"
echo "5 edge-strata visits (embalase/tuslah rows, >=3 proc lines, half-rupiah PPN, zero-fee clinic) from the canonical consumer:"
mysql -uroot -N -e "
-- embalase/tuslah: a visit with nonzero embalase or tuslah in detail_pemberian_obat
SELECT \"embalase\", no_rawat FROM sik_p2.detail_pemberian_obat d WHERE d.embalase<>0 OR d.tuslah<>0 ORDER BY no_rawat LIMIT 2;
-- >=3 procedure lines
SELECT \"gt3proc\", no_rawat FROM sik_p2.rawat_jl_dr rj GROUP BY no_rawat HAVING COUNT(*)>=3 ORDER BY no_rawat LIMIT 2;
-- zero-fee clinic visit (reg fee 0)
SELECT \"zerofee\", rp.no_rawat FROM sik_p2.reg_periksa rp WHERE rp.no_rkm_medis LIKE \"DR%\" AND rp.no_rawat LIKE \"2026/10/%\" ORDER BY rp.no_rawat LIMIT 1;
" 2>&1 | head -10
