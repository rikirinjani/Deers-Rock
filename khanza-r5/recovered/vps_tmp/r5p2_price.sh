set -e
echo "=== drug price source: h_beli (purchase) vs ralan (retail) on detail_pemberian_obat/databarang ==="
mysql -uroot -N -e "SELECT d.kode_brng, d.h_beli, b.h_beli, b.ralan FROM sik_p2.detail_pemberian_obat d JOIN sik_p2.databarang b ON b.kode_brng=d.kode_brng WHERE d.no_rawat LIKE '2026/10/%' LIMIT 8;"
echo "=== consumer drug rows use ralan price: verify one visit 000254 (drug khanza=103752 ledger=34584) ==="
mysql -uroot -N -e "SELECT d.kode_brng, d.jml, d.h_beli, b.ralan, (b.ralan*d.jml) retail_total FROM sik_p2.detail_pemberian_obat d LEFT JOIN sik_p2.databarang b ON b.kode_brng=d.kode_brng WHERE d.no_rawat='2026/10/01/000254';"
echo "=== what price does the canonical ledger builder actually use? check the ORIGINAL builder source ==="
grep -nE "h_beli|ralan|databarang|drug" /opt/Deers-Rock/tools/build_dr_charge_ledger.py | head
