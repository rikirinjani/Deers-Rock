#!/bin/bash
# Verify whether the G1 PASS is genuine: did the real form actually write billing
# (vs just reading the consumer's rows), and what does sukses=false mean?
set +e
echo "=== sukses values across harness logs ==="
grep -ohE 'sukses=(true|false)' /opt/dr-benchmark/results/g1test/g1_attempt1/harness_*.log 2>/dev/null | sort | uniq -c
echo
echo "=== how is 'sukses' set in DlgBilingRalan (source) ==="
grep -n 'sukses' /opt/simrs-khanza/keuangan/DlgBilingRalan.java 2>/dev/null | head -20
echo
echo "=== billing rows for 2 sample visits (consumer wrote earlier; did real form re-write?) ==="
mysql -uroot sik -B -e "SELECT no_rawat, tgl_byr, no, nm_perawatan, biaya, status, totalbiaya FROM sik.billing WHERE no_rawat IN ('2026/10/02/000479','2026/10/02/000320') ORDER BY no_rawat, noindex LIMIT 40" 2>/dev/null
echo
echo "=== total billing rows for the 50-sample no_rawat ==="
mysql -uroot sik -B -e "SELECT COUNT(*) AS rows, COUNT(DISTINCT no_rawat) AS visits FROM sik.billing WHERE no_rawat LIKE '2026/10/%'" 2>/dev/null
echo
echo "=== check the tgl_byr of the billing rows (consumer writes tgl_byr=visit date; real form would too). Look for the no_nota (real form numbers nota differently) ==="
mysql -uroot sik -B -e "SELECT no_rawat, no, tgl_byr FROM sik.billing WHERE no_rawat IN ('2026/10/02/000479') ORDER BY noindex LIMIT 8" 2>/dev/null
