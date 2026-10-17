set -e
cd /opt/dr-benchmark
echo "=== reg_periksa: ALL columns + which are NOT-NULL-without-default (must be supplied) ==="
mysql -uroot -N -e "SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION SEPARATOR \" | \") FROM information_schema.columns WHERE table_schema=\"sik_p2\" AND table_name=\"reg_periksa\" AND is_nullable=\"NO\" AND column_default IS NULL;"
echo "=== a template row with those fields (real values) ==="
mysql -uroot sik_p2 -e "SELECT no_rawat, kd_dokter, p_jawab, almt_pj, hubunganpj, status_lanjut, kd_pj, umurdaftar, sttsumur, status_poli, no_reg FROM reg_periksa WHERE no_rawat=\"2026/10/01/000254\"\G"
