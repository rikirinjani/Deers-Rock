#!/bin/bash
export MYSQL_PWD=$(cat /opt/simrs-khanza/run-env/benchmark_pw)
M="mysql -ubenchmark -N -B"
echo "=== DlgBilingRalan table references (save + akun + reads) ==="
grep -oE '(from|into|update|FROM|INTO|UPDATE)[[:space:]]+`?[a-z_0-9]{3,}`?' /opt/simrs-khanza/src/keuangan/DlgBilingRalan.java | awk '{print tolower($2)}' | tr -d '`' | sort | uniq -c | sort -rn | head -40
echo "=== akun bayar loading in DlgBilingRalan ==="
grep -n "tbAkunBayar\|akun" /opt/simrs-khanza/src/keuangan/DlgBilingRalan.java | head -20
echo "=== master counts in sik ==="
$M -e "SELECT 'set_nota', COUNT(*) FROM sik.set_nota"
$M -e "SELECT 'admin', COUNT(*) FROM sik.admin"
$M -e "SELECT 'akun_bayar', COUNT(*) FROM sik.akun_bayar"
$M -e "SELECT 'set_akun', COUNT(*) FROM sik.set_akun"
echo "=== admin columns (names only) ==="
$M -e "SHOW COLUMNS FROM sik.admin" | awk '{print $1}' | tr '\n' ' '
echo ""
echo "PROBE4_DONE"
