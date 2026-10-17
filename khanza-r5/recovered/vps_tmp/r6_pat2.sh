cat > /tmp/p6_probe.sql <<SQL
SELECT no_rkm_medis FROM sik.reg_periksa WHERE no_rkm_medis IS NOT NULL AND no_rkm_medis <> "" LIMIT 8;
SQL
echo "=== sample patients ==="
mysql -uroot -N < /tmp/p6_probe.sql
