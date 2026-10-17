#!/bin/bash
echo "=== full harness log 2026-10-03 ==="
cat /opt/dr-benchmark/results/g1test/g1_attempt1/harness_2026-10-03.log
echo
echo "=== detail_nota_jalan columns+rows for sample visit ==="
mysql -uroot -N -e "SHOW COLUMNS FROM sik.detail_nota_jalan"
mysql -uroot -e "SELECT * FROM sik.detail_nota_jalan WHERE no_rawat='2026/10/03/000303' LIMIT 5"
echo "=== which sample-tables have rows for 2026/10 visits ==="
for t in billing nota_jalan detail_nota_jalan detail_pemberian_obat jurnal detailjurnal piutang_pasien akun_bayar; do
  c=$(mysql -uroot -N -e "SELECT COUNT(*) FROM sik.$t WHERE no_rawat LIKE '2026/10/%'" 2>/dev/null)
  echo "$t: ${c:-n/a}"
done
echo "=== jurnal recent no_bukti samples ==="
mysql -uroot -e "SELECT no_jurnal, no_bukti, tgl_jurnal, jenis, jumlah FROM sik.jurnal ORDER BY no_jurnal DESC LIMIT 8" 2>/dev/null
echo "=== reg_periksa status_bayar distribution DR ==="
mysql -uroot -N -e "SELECT status_bayar, COUNT(*) FROM sik.reg_periksa WHERE no_rkm_medis LIKE 'DR%' AND no_rawat LIKE '2026/10/%' GROUP BY status_bayar"
