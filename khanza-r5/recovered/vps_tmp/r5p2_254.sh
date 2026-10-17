set -e
echo "=== drug ledger row for 000254 (rebuilt scratch) ==="
mysql -uroot -N -e "SELECT code, quantity, unit_price, amount, source FROM sik_bench_p2.dr_charge_ledger WHERE no_rawat='2026/10/01/000254' AND component='drug';"
echo "=== consumer billing value rows for 000254 (what the gate compares to) ==="
mysql -uroot -N -e "SELECT status, nm_perawatan, CAST(totalbiaya AS SIGNED) FROM sik_p2.billing WHERE no_rawat='2026/10/01/000254' AND (biaya>0 OR totalbiaya>0) AND status NOT LIKE 'Ttl%';"
echo "=== detail_pemberian_obat source lines for 000254 (jml, h_beli, ralan) ==="
mysql -uroot -N -e "SELECT d.kode_brng, d.jml, d.h_beli, b.ralan FROM sik_p2.detail_pemberian_obat d LEFT JOIN sik_p2.databarang b ON b.kode_brng=d.kode_brng WHERE d.no_rawat='2026/10/01/000254';"
