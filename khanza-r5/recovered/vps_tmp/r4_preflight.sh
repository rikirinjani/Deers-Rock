#!/bin/bash
# r4_preflight: fresh baseline gate confirmation (read-only) under RUN_ID=r4_preflight
set -u
export RUN_ID=r4_preflight
cd /opt/Deers-Rock/tools
echo "=== three_count ==="
python3 three_count_reconcile.py --stage A 2>&1 | tail -15
echo "rc=$?"
echo "=== charge_delta ==="
python3 charge_delta_per_component.py --stage A 2>&1 | tail -15
echo "rc=$?"
echo "=== check_billed_eq_dr ==="
out="$(mysql -uroot sik -N -B -e "
    SELECT SUBSTRING_INDEX(r.no_rawat,'/',2) ym,
           COUNT(DISTINCT r.no_rawat)-COUNT(DISTINCT b.no_rawat)
    FROM reg_periksa r LEFT JOIN billing b ON b.no_rawat=r.no_rawat
    WHERE r.no_rkm_medis LIKE 'DR%' GROUP BY ym" 2>/dev/null)"
bad=0
echo "$out" | while read -r ym n; do
  [ -z "${ym:-}" ] && continue
  [ "${n:-0}" -gt 0 ] && echo "  UNBILLED-${ym}: ${n}"
done
n_bad=$(echo "$out" | awk '$2>0' | wc -l)
echo "months_with_unbilled=$n_bad (0 expected)"
