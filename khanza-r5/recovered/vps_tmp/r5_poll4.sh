for i in $(seq 1 40); do
  if grep -q CLONE_OK /tmp/r5_clone_final.log 2>/dev/null; then echo "DONE at poll $i"; break; fi
  n=$(ps aux | grep -E 'mysql -uroot (sik|sik_r5) ' | grep -v grep | wc -l)
  echo "poll $i procs=$n dump=$(stat -c%s /tmp/sik_r5_dump.sql 2>/dev/null)"
  sleep 20
done
echo "=== final log ==="
tr -d '\r' < /tmp/r5_clone_final.log
