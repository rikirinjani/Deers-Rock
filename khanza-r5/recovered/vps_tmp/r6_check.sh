echo "=== check fixture state ==="
mysql -uroot -N -e "SHOW DATABASES LIKE '"'"'sik_p6'"'"';"
echo "dump bytes: $(wc -c < /tmp/sik_p6_data.sql 2>/dev/null || echo NA)"
echo "dump err: $(head -2 /tmp/sik_p6_dump.err 2>/dev/null)"
echo "schema bytes: $(wc -c < /tmp/sik_p6_schema.sql 2>/dev/null || echo NA)"
if mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.reg_periksa;" 2>/dev/null; then
  echo "reg_periksa: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.reg_periksa;")"
  echo "billing: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.billing;")"
fi
