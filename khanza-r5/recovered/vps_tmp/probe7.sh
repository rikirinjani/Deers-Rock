#!/bin/bash
GLF=/opt/dr-benchmark/results/g1test/g1_attempt1/gl/general_log_G1.2026-10-02
echo "=== gl INSERT lines (fixed quoting) ==="
grep -c 'INSERT INTO' "$GLF"
grep 'INSERT INTO' "$GLF" | grep -i 'billing' | head -4
echo "=== gl Query vs Execute vs Prepare line types ==="
grep -oE '^(Query|Execute|Prepare)' "$GLF" | sort | uniq -c
echo "=== DlgBilingRalan inserts ==="
grep -n 'INSERT INTO' /opt/simrs-khanza/src/keuangan/DlgBilingRalan.java | head -20
echo "=== DlgBilingRalan tables touched in save ==="
grep -n 'prepareStatement\|executeUpdate' /opt/simrs-khanza/src/keuangan/DlgBilingRalan.java | sed -n '1,60p' | grep -oE "'[A-Z a-z]*?(INSERT|UPDATE|DELETE|SELECT)[^']*'" | head -40
echo "=== jurnal recent rows ==="
mysql -uroot -e "SELECT no_jurnal, no_bukti, tgl_jurnal, jenis, jumlah FROM sik.jurnal ORDER BY no_jurnal DESC LIMIT 6"
echo "=== jurnal no_bukti LIKE RJ samples ==="
mysql -uroot -e "SELECT DISTINCT no_bukti FROM sik.jurnal ORDER BY no_bukti DESC LIMIT 6"
