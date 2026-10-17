set -e
echo "=== is sik_r5 still present? ==="
mysql -uroot -N -e "SHOW DATABASES LIKE \"sik_r5\";"
echo "=== live sik.akun_bayar (all rows, masked id) ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik.akun_bayar;"
mysql -uroot -e "SELECT * FROM sik.akun_bayar;" 2>&1 | head -12
echo "=== form: which query fills tbAkunBayar? (strings in the ralan billing class) ==="
cd /opt/simrs-khanza
strings dist/SIMRSKhanza.jar 2>/dev/null | grep -iE "akun_bayar|akunpiutang|from akun" | sort -u | head
