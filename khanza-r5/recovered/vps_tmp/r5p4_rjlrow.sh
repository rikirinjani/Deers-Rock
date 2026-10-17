set -e
echo "=== real rawat_jl_dr row (all 12 cols) to use as template ==="
mysql -uroot sik_p2 -e "SELECT * FROM rawat_jl_dr WHERE no_rawat LIKE \"2026/10/%\" LIMIT 1\G"
