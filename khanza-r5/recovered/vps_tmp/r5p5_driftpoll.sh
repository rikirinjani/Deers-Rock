for i in $(seq 1 50); do
  if grep -q "charge_delta rc=" /tmp/r5p5_drift.log 2>/dev/null; then echo "ALL DONE at poll $i"; break; fi
  last=$(tail -c 100 /tmp/r5p5_drift.log 2>/dev/null | tr -d "\r\n")
  echo "poll $i: $last"
  sleep 20
done
echo "=== full log ==="
cat /tmp/r5p5_drift.log
