#!/bin/bash
set -e
echo "=== jurnal columns ==="
mysql -uroot sik -N -B -e "SHOW COLUMNS FROM sik.jurnal" 2>/dev/null | cut -d'#' -f1
echo "=== detailjurnal columns ==="
mysql -uroot sik -N -B -e "SHOW COLUMNS FROM sik.detailjurnal" 2>/dev/null | cut -d'#' -f1
echo "=== piutang_pasien columns ==="
mysql -uroot sik -N -B -e "SHOW COLUMNS FROM sik.piutang_pasien" 2>/dev/null | cut -d'#' -f1
echo "=== general_log state now ==="
mysql -uroot sik -N -B -e "SHOW VARIABLES LIKE 'general_log'" 2>/dev/null
echo "=== can root toggle it? ==="
mysql -uroot sik -B -e "SET GLOBAL general_log=ON" 2>&1 | head -3
echo "toggle_rc=$?"
echo "=== billing INSERT regex test against a sample (search real gl files) ==="
find /opt/dr-benchmark/results/g1test/g1_attempt1/ -name 'general_log_G1.*' -size +0c 2>/dev/null | head
echo "=== try toggling root ON + insert probe ==="
mysql -uroot sik -N -B -e "SELECT @@global.general_log, @@global.general_log_file" 2>/dev/null
