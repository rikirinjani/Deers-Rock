set -e
echo "=== rawat_jl_dr schema (what a valid proc row needs) ==="
mysql -uroot -N -e "SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION) FROM information_schema.columns WHERE table_schema=\"sik_p2\" AND table_name=\"rawat_jl_dr\";"
echo "=== a real rawat_jl_dr row (values to copy) ==="
mysql -uroot sik_p2 -e "SELECT no_rawat, kd_jenis_prw, biaya_rawat, kd_dokter, tgl_rawat FROM rawat_jl_dr WHERE no_rawat LIKE \"2026/10/%\" LIMIT 2\G"
