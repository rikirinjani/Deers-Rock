set -e
for i in $(seq 1 40); do
  sz=$(stat -c%s /tmp/sik_r5_dump.sql 2>/dev/null || echo 0)
  running=$(ps aux | grep -E "mysql -uroot sik " | grep -v grep | wc -l)
  echo "poll $i: dump_bytes=$sz dump_procs=$running"
  if [ "$running" -eq 0 ] && [ "$sz" -gt 0 ]; then echo "dump complete size=$sz"; break; fi
  sleep 15
done
