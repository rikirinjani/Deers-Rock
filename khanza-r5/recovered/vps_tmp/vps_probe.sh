set -u
echo "host: $(hostname)  up: $(uptime -p)"
echo "--- tools sha (first 8):"
cd /opt/Deers-Rock/tools 2>/dev/null && for f in sampled_real_form_diff_r5.py dbutil.py build_dr_charge_ledger_p2.py charge_delta_per_component_p2.py three_count_reconcile_p2.py; do [ -f "$f" ] && echo "$(sha256sum $f | cut -c1-8) $(stat -c '%y' $f | cut -c1-16) $f" || echo "MISSING $f"; done
echo "--- p-chain dir:"; ls -1t /opt/Deers-Rock/p-chain 2>/dev/null | head -15
echo "--- databases:"; mysql -N -e "SHOW DATABASES" 2>&1 | grep -E '^sik' 
echo "--- harness database.ini db lines:"; find / -name database.ini -path '*' 2>/dev/null | grep -v proc | head -5 | while read f; do echo "$f: $(grep -iE '^\s*(DATABASE|db)\s*=' "$f" 2>/dev/null | head -2 | tr '\n' ' ')"; done
echo "--- java procs:"; pgrep -af java | cut -c1-120 | head
echo "--- disk:"; df -h / | tail -1
