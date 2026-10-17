echo "=== grant benchmark user DML on sik_p2 (root runs) ==="
mysql -uroot -e "GRANT SELECT, INSERT, UPDATE, DELETE ON sik_p2.* TO '"'"'benchmark'"'"'@'"'"'localhost'"'"';"
echo "grant rc: $?"
mysql -uroot -N -e "SHOW GRANTS FOR '"'"'benchmark'"'"'@'"'"'localhost'"'"';" | grep -i sik_p2
echo ""
echo "=== now the benchmark user can run DML on sik_p2 ==="
# quick check: can benchmark read a reg_periksa row?
cd /opt/Deers-Rock/tools
python3 -c "
import sys; sys.path.insert(0,'.')
import dbutil
# default benchmark user (no FORCE_ROOT)
r = dbutil.scalar(\"sik_p2\", \"SELECT COUNT(*) FROM reg_periksa\")
print(\"benchmark user sik_p2 reg_periksa rows:\", r)
"
