for i in $(seq 1 40); do
  if grep -q "p2 billing" /tmp/r5p4_b3edge.log 2>/dev/null; then echo "DONE at poll $i"; break; fi
  n=$(ps aux | grep -E "mysqldump -uroot sik |mysql -uroot sik_p2" | grep -v grep | wc -l)
  echo "poll $i procs=$n dump=$(stat -c%s /tmp/sik_p2.sql 2>/dev/null || echo 0)"
  sleep 20
done
echo "=== log ==="
cat /tmp/r5p4_b3edge.log
