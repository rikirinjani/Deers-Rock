#!/bin/bash
SRC=/opt/simrs-khanza/src/keuangan/DlgBilingRalan.java
echo "=== tagihan_sadewa refs ==="
grep -n 'tagihan_sadewa' "$SRC" | head -10
echo "=== all table names in insert/menyimpan calls (whole file) ==="
grep -oiE '(menyimpan|menyimpantf2?|queryutf2?|SimpanTrack)\("?[a-z_0-9]+' "$SRC" | sort | uniq -c | sort -rn | head -25
echo "=== current leftovers for sample visits ==="
for t in tagihan_sadewa tagihan_sadewa_detil tagihan_bpd_jateng tagihan_bpd_papua tagihan_bpd_jabar tagihan_briva tagihan_mandiri piutang_pasien detail_piutang_pasien; do
  c=$(mysql -uroot -N -e "SELECT COUNT(*) FROM sik.$t WHERE no_rawat LIKE '2026/10/%'" 2>/dev/null)
  echo "$t: ${c:-n/a}"
done
echo "=== tagihan_sadewa columns ==="
mysql -uroot -N -e "SHOW COLUMNS FROM sik.tagihan_sadewa" 2>/dev/null | head -8
echo "=== sadewa rows sample ==="
mysql -uroot -e "SELECT * FROM sik.tagihan_sadewa LIMIT 3" 2>/dev/null
echo "=== does tagihan_sadewa have no_rawat col? count via no_rawat ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik.tagihan_sadewa" 2>/dev/null
