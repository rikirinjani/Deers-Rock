for i in $(seq 1 40); do
  if grep -q "fresh never-billed" /tmp/r5a_reclone.log 2>/dev/null; then echo "DONE at poll $i"; break; fi
  n=$(ps aux | grep -E "mysqldump -uroot sik|mysql -uroot sik_r5" | grep -v grep | wc -l)
  echo "poll $i procs=$n dumpbytes=$(stat -c%s /tmp/sik_r5_dump.sql 2>/dev/null || echo 0)"
  sleep 20
done
echo "=== final log ==="
tr -d "\r" < /tmp/r5a_reclone.log
