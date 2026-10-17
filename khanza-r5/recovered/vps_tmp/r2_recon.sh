#!/usr/bin/env bash
echo "=== current general_log_file ==="
mysql -uroot -N -B -e "SHOW VARIABLES LIKE 'general_log_file';" 2>&1
echo
echo "=== p3_latency.json (pool + reports keys) ==="
python3 -c "import json;d=json.load(open('/opt/dr-benchmark/p-chain/p3_latency.json'));print('pool_new_mb',d.get('pool_new_mb'),'pool_old_mb',d.get('pool_old_mb'));print('reports:',list(d.get('reports',{}).keys()))" 2>&1
echo
echo "=== collect_scale_telemetry REPORT_QUERIES + defs ==="
grep -nE "REPORT_QUERIES|def |revenue_by_clinic|top_billed_visits|per_query|GLOBAL_BUDGET|MIN_RUNS|DEFAULT_ITERS" /opt/Deers-Rock/tools/collect_scale_telemetry.py | head -40
echo
echo "=== check_billed_eq_dr presence in run_all.sh ==="
grep -n "check_billed_eq_dr\|enable_general_log\|disable_general_log" /opt/dr-benchmark/run_all.sh | head
echo
echo "=== current innodb pool + long_query_time ==="
mysql -uroot -N -B -e "SELECT @@innodb_buffer_pool_size, @@long_query_time;" 2>&1
