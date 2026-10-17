cd /opt/Deers-Rock/tools
echo "=== verify B-subset form-save deltas (pre vs post P5 re-demo) ==="
mysql -uroot -N -e "SELECT '"'"'detail_nota_jalan'"'"', COUNT(*) FROM sik_p2.detail_nota_jalan;" 2>/dev/null
mysql -uroot -N -e "SELECT '"'"'detail_nota_jalan'"'"', COUNT(*) FROM sik.detail_nota_jalan;"
mysql -uroot -N -e "SELECT '"'"'piutang_pasien'"'"', COUNT(*) FROM sik.piutang_pasien;"
echo ""
echo "=== B-subset amounts (live) ==="
mysql -uroot -N -e "SELECT '"'"'dnl'"'"', COALESCE(SUM(jumlah*biaya),0) FROM sik.detail_nota_jalan;"
echo ""
echo "=== confirm A/C canonical unchanged (gates) ==="
export DBUTIL_FORCE_ROOT=1
env RUN_ID=r5p5_v1 python3 charge_delta_per_component_p2.py 2>&1 | grep -aE "overall delta|gate \(|PASS|FAIL" | tr -d "\r"
env RUN_ID=r5p5_v1 python3 three_count_reconcile_p2.py 2>&1 | grep -aE "Count |gate:" | tr -d "\r"
echo ""
echo "=== stage hygiene (live sik) ==="
echo "live stage tables: $(mysql -uroot -N -e "SHOW TABLES FROM sik LIKE '"'"'r5_stage_%'"'"';" | wc -l)"
echo "harness: $(grep -aE "^database=" /opt/simrs-khanza/setting/database.ini | tr -d " \r")"
