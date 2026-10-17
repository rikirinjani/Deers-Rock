for i in $(seq 1 60); do
  if ! pgrep -f "mysql -uroot sik_p6" >/dev/null 2>&1; then
    echo "data load finished after ~$((i*30))s"
    break
  fi
  sleep 30
done
if pgrep -f "mysql -uroot sik_p6" >/dev/null 2>&1; then
  echo "STILL RUNNING after 30 min"
fi
echo "=== counts ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.reg_periksa;"
mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.billing;"
mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.detail_pemberian_obat;"
