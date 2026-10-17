echo "=== reg_periksa via direct query ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik.reg_periksa;" 2>&1
echo "=== billing ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik.billing;" 2>&1
echo "=== information_schema tables LIKE sik% ==="
mysql -uroot -N -e "SELECT table_schema, COUNT(*) FROM information_schema.tables WHERE table_schema LIKE '"'"'sik%'"'"' GROUP BY table_schema;" 2>&1
