#!/bin/bash
echo "=== half-rupiah census in report ==="
grep -A2 "Half-rupiah" /opt/dr-benchmark/results/test/g1_validation.md
echo "=== the two half-rupiah visits detail ==="
mysql -uroot -N -e "SELECT d.no_rawat, SUM(d.total+d.embalase+d.tuslah) s FROM sik.detail_pemberian_obat d JOIN sik.reg_periksa rp ON rp.no_rawat=d.no_rawat WHERE rp.no_rkm_medis LIKE 'DR%' GROUP BY d.no_rawat HAVING ABS(((SUM(d.total+d.embalase+d.tuslah)*0.11) MOD 1) - 0.5) < 0.000001"
echo "=== their consumer PPN rows now ==="
for v in $(mysql -uroot -N -e "SELECT d.no_rawat FROM sik.detail_pemberian_obat d JOIN sik.reg_periksa rp ON rp.no_rawat=d.no_rawat WHERE rp.no_rkm_medis LIKE 'DR%' GROUP BY d.no_rawat HAVING ABS(((SUM(d.total+d.embalase+d.tuslah)*0.11) MOD 1) - 0.5) < 0.000001"); do
  mysql -uroot -e "SELECT no_rawat, nm_perawatan, biaya, jumlah, totalbiaya FROM sik.billing WHERE no_rawat='$v' AND nm_perawatan LIKE '%PPN%'"
done
