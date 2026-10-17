echo "=== databases ==="
mysql -uroot -N -e "SHOW DATABASES;"
echo ""
echo "=== count for each candidate ==="
for db in sik sik_bench; do
  c=$(mysql -uroot -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='"'"'$db'"'"';" 2>/dev/null)
  echo "$db: $c tables"
done
echo ""
echo "=== table names (first 40) ==="
mysql -uroot -N -e "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema LIKE '"'"'sik%'"'"' LIMIT 40;"
