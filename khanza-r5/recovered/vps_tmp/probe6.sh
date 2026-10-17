#!/bin/bash
echo "=== consumer writes detail_nota_jalan? ==="
grep -n "detail_nota_jalan\|piutang\|jurnal" /opt/simrs-khanza/consumer/KhanzaBillingConsumer.java | head -10
echo "=== DlgBilingRalan save writes (source if present) ==="
find /opt/simrs-khanza -name "DlgBilingRalan.java" 2>/dev/null | head -3
SRC=$(find /opt/simrs-khanza -name "DlgBilingRalan.java" 2>/dev/null | head -1)
if [ -n "$SRC" ]; then
  grep -n "INSERT INTO\|UPDATE reg_periksa\|DELETE FROM" "$SRC" | head -30
fi
echo "=== gl file: INSERT INTO billing lines sample ==="
grep -c "INSERT INTO \`billing\`\|INSERT INTO billing" /opt/dr-benchmark/results/g1test/g1_attempt1/gl/general_log_G1.2026-10-02
grep "INSERT INTO" /opt/dr-benchmark/results/g1test/g1_attempt1/gl/general_log_G1.2026-10-02 | grep -i billing | head -6
echo "=== that date's real billing rows now ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik.billing WHERE no_rawat IN (SELECT no_rawat FROM sik.reg_periksa WHERE no_rawat LIKE '2026/10/02/%')"
echo "=== jurnal table row count ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik.jurnal"
mysql -uroot -N -e "SELECT COUNT(*) FROM sik.detailjurnal"
echo "=== ENC count in export ==="
grep -c "^ENC " /tmp/dr_encounters.txt 2>/dev/null
echo "=== consumer snapshot csv head ==="
head -5 /opt/dr-benchmark/results/g1test/g1_attempt1/consumer_value_rows.csv
echo "=== 22 Belum Bayar visits (failed saves from last run) ==="
mysql -uroot -N -e "SELECT no_rawat FROM sik.reg_periksa WHERE no_rkm_medis LIKE 'DR%' AND no_rawat LIKE '2026/10/%' AND status_bayar='Belum Bayar' LIMIT 30"
