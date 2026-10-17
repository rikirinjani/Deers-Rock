set -e
echo "=== reg_periksa columns (which fields to populate) ==="
mysql -uroot -N -e "SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION) FROM information_schema.columns WHERE table_schema=\"sik_p2\" AND table_name=\"reg_periksa\";"
echo "=== a real DR reg row as a template (masked) ==="
mysql -uroot -N -e "SELECT GROUP_CONCAT(CONCAT(COLUMN_NAME,\"=\",IFNULL(CAST(COLUMN_NAME AS CHAR),\"NULL\"))) FROM (SELECT * FROM sik_p2.reg_periksa WHERE no_rkm_medis LIKE \"DR%\" LIMIT 1) t;" 2>/dev/null
echo "=== simpler: one DR reg row, key columns ==="
mysql -uroot sik_p2 -e "SELECT no_rawat, no_rkm_medis, poli_id, tgl_registrasi, jam_registrasi, status_bayar FROM reg_periksa WHERE no_rkm_medis LIKE \"DR%\" LIMIT 2\G"
