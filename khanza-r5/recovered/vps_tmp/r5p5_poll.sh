for i in $(seq 1 40); do
  if grep -q READY /tmp/r5p5_setup.log 2>/dev/null; then echo "READY at poll $i"; break; fi
  echo "poll $i: $(tail -c 120 /tmp/r5p5_setup.log 2>/dev/null | tr -d '\r\n')"
  sleep 20
done
echo "=== setup log tail ==="
cat /tmp/r5p5_setup.log
