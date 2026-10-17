#!/usr/bin/env bash
# recon.sh — READ-ONLY recon of post-failure state. No changes.
set -uo pipefail
R=/opt/dr-benchmark/results/Bseries_20261012T045027Z

echo "=== 1. processes / unit ==="
pgrep -af "run_all|KhanzaBillingConsumer|java|burst" || echo "(no run_all/java/burst processes)"
systemctl is-active dr-bench; systemctl is-failed dr-bench; systemctl status dr-bench --no-pager -n 8 2>/dev/null | head -20 || true
ps -o user=,pid=,etime=,cmd= -C mysqld 2>/dev/null | head -3
mysql -uroot -N -B -e "SELECT 1 AS up" 2>&1 | head -2

echo
echo "=== 2. why did it die (journal) ==="
journalctl -u dr-bench --since "2026-10-12 06:40" --no-pager 2>/dev/null | tail -25
journalctl --since "2026-10-12 06:40" --until "2026-10-12 06:56" --no-pager 2>/dev/null | grep -iE "oom|kill|out of memory|mysqld|crash" | tail -20

echo
echo "=== 3. B3 artifacts ==="
ls -la "$R" | grep -iE "B3|DONE|STOPPED|general" || true
echo "--- B3.log tail 25 ---"
tail -25 "$R/B3.log"
echo "--- telemetry_B3.json key fields ---"
python3 - "$R/telemetry_B3.json" <<'PY'
import json,sys
try:
    d=json.load(open(sys.argv[1]))
    c=d.get("consumer",{})
    print("visits=%s wall_s=%s vpm=%s billing_rows=%s total_rp=%s p95=%s p99=%s errors=%s" % (
        c.get("visits"),c.get("wall_s"),c.get("visits_per_min"),c.get("billing_rows"),
        c.get("total_rp"),c.get("ms_p95"),c.get("ms_p99"),c.get("error_lines")))
    print("datadir_mb=%s hit=%s%%" % (d.get("datadir",{}).get("datadir_mb"),
        d.get("mysql",{}).get("_derived",{}).get("buffer_pool_hit_pct")))
except Exception as e:
    print("telemetry_B3.json unreadable:", e)
PY
echo "--- B3 manifest head ---"
head -8 "$R/B3_generate_manifest.md"
echo "--- stale STOPPED marker ---"
cat "$R/STOPPED_AT_phase1_stageB_B1.md" 2>/dev/null || echo "(not present)"

echo
echo "=== 4. state.json / heartbeat ==="
cat /opt/dr-benchmark/state/state.json
echo "heartbeat: $(cat /opt/dr-benchmark/state/heartbeat 2>/dev/null)"

echo
echo "=== 5. sampled-diff partial evidence ==="
tail -12 "$R/sampled_real_form_diff.log" 2>/dev/null
ls -la "$R"/B3_oracle.log "$R"/B3_sampled_form_diff.* 2>/dev/null || echo "(no B3 sampled artifacts)"
echo "--- consumer_B3.log tail 4 ---"
tail -4 "$R/consumer_B3.log"

echo
echo "=== 6. run_all.sh tail (dispatcher/resume/done) ==="
sed -n '395,520p' /opt/dr-benchmark/run_all.sh
echo "--- grep: all_gates_passed / write_done / resume / DONE ---"
grep -n "all_gates_passed\|write_done\|--resume\|resume)\|DONE" /opt/dr-benchmark/run_all.sh | head -30

echo
echo "=== 7. dir perms for general-log fix ==="
namei -l "$R/general_log_B1.log" 2>/dev/null || ls -ld /opt /opt/dr-benchmark /opt/dr-benchmark/results "$R"
ls -la "$R"/general_log_*.log
grep -m1 "user" <(mysql -uroot -N -B -e "SELECT USER(),CURRENT_USER()" 2>&1) || true
echo
echo "=== 8. disk/mem ==="
df -BG / | tail -1; free -m | head -2
