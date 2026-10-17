set -e
echo "=== sik.billing columns (is there a code / kode_brng / kd_jenis_prw column?) ==="
mysql -uroot -N -e "SELECT GROUP_CONCAT(COLUMN_NAME) FROM information_schema.columns WHERE table_schema='sik' AND table_name='billing';"
echo "=== a sample billing row for a DR visit (all columns) ==="
mysql -uroot sik -e "SELECT * FROM billing WHERE no_rawat='2026/10/01/000254' LIMIT 3\G" 2>/dev/null | head -40
