for i in $(seq 1 40); do
  if grep -q CLONE_DONE /tmp/r5_reclone3.log 2>/dev/null; then echo "DONE"; break; fi
  n=$(ps aux | grep -E 'mysql -uroot sik' | grep -v grep | wc -l)
  echo "poll $i procs=$n dump=$(stat -c%s /tmp/sik_r5_dump.sql 2>/dev/null)"
  sleep 20
done
echo "=== final log ==="
cat /tmp/r5_reclone3.log
