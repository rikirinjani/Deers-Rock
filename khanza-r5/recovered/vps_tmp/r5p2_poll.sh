for i in $(seq 1 40); do
  if grep -q "p2 dr_tariff" /tmp/r5p2_fixture.log 2>/dev/null; then echo "DONE at poll $i"; break; fi
  n=$(ps aux | grep -E "mysqldump -uroot (sik|sik_bench) |mysql -uroot sik_p2|mysql -uroot sik_bench_p2" | grep -v grep | wc -l)
  echo "poll $i procs=$n"
  sleep 15
done
echo "=== final fixture log ==="
tr -d "\r" < /tmp/r5p2_fixture.log
