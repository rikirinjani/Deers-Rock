set -e
cd /opt/simrs-khanza
# The ini restore cp didn't take (still sik_r5, clone dropped) ? force live
sed -i "s/^database=.*/database=sik/" setting/database.ini
grep -E "^database=" setting/database.ini
# confirm live still stable after ini fix
echo "live sik billing (expect 1464593 / 34895128580):"
mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(totalbiaya),0) FROM sik.billing;"
echo "=== is any live Khanza service running that reads this ini? ==="
ps aux | grep -E "java|khanza" | grep -v grep | head -5
