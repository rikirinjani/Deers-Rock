set -e
cd /opt/dr-benchmark
# remove the lingering dead lock so the fresh process can start
rm -f /opt/dr-benchmark/results/r5_p1_demo/B3_oracle_run_r5/.lock
echo "=== current phase ==="
python3 -c "import json;d=json.load(open('/opt/dr-benchmark/results/r5_p1_demo/B3_oracle_run_r5/.state.json'));print('phase=',d.get('phase'))"
