#!/bin/bash
# r4_d1_snapshot: D1 real snapshot — full sik + sik_bench + billing-only dumps + counts json
set -euo pipefail
TS="$(date -u +%Y%m%dT%H%M%SZ)"
DIR="/opt/dr-benchmark/snapshots/d1_$TS"
mkdir -p "$DIR"
echo "[d1] snapshot dir: $DIR"

echo "[d1] dumping billing (billing-only) ..."
mysqldump --single-transaction --no-tablespaces --skip-lock-tables -uroot sik billing > "$DIR/sik_billing.sql"
echo "[d1] billing dump: $(du -h "$DIR/sik_billing.sql" | cut -f1)"

echo "[d1] dumping full sik ..."
mysqldump --single-transaction --no-tablespaces --skip-lock-tables -uroot sik > "$DIR/sik_full.sql"
echo "[d1] sik dump: $(du -h "$DIR/sik_full.sql" | cut -f1)"

echo "[d1] dumping sik_bench ..."
mysqldump --single-transaction --no-tablespaces --skip-lock-tables -uroot sik_bench > "$DIR/sik_bench_full.sql"
echo "[d1] sik_bench dump: $(du -h "$DIR/sik_bench_full.sql" | cut -f1)"

echo "[d1] counts json ..."
mysql -uroot -N -B -e "
SELECT CONCAT('TABLE|', table_name) FROM information_schema.tables
WHERE table_schema='sik'" > "$DIR/counts_raw.txt"
{
  echo "{"
  echo "  \"taken\": \"$TS\","
  echo "  \"tables\": {"
  first=1
  for t in $(mysql -uroot -N -B -e "SELECT table_name FROM information_schema.tables WHERE table_schema='sik' ORDER BY table_name"); do
    n=$(mysql -uroot -N -B sik -e "SELECT COUNT(*) FROM \`$t\`" 2>/dev/null || echo "ERR")
    [ $first -eq 1 ] || echo ","
    first=0
    printf '    "%s": %s' "$t" "$n"
  done
  echo
  echo "  },"
  echo "  \"billing_sum_totalbiaya\": $(mysql -uroot -N -B sik -e "SELECT ROUND(COALESCE(SUM(totalbiaya),0),2) FROM billing"),"
  echo "  \"billing_value_rows\": $(mysql -uroot -N -B sik -e "SELECT COUNT(*) FROM billing WHERE (biaya>0 OR totalbiaya>0) AND status NOT LIKE 'Ttl%'"),"
  echo "  \"dr_ledger_rows\": $(mysql -uroot -N -B sik_bench -e "SELECT COUNT(*) FROM dr_charge_ledger"),"
  echo "  \"dr_ledger_sum\": $(mysql -uroot -N -B sik_bench -e "SELECT ROUND(COALESCE(SUM(amount),0),2) FROM dr_charge_ledger"),"
  echo "  \"reg_periksa\": $(mysql -uroot -N -B sik -e "SELECT COUNT(*) FROM reg_periksa"),"
  echo "  \"detail_pemberian_obat\": $(mysql -uroot -N -B sik -e "SELECT COUNT(*) FROM detail_pemberian_obat")"
  echo "}"
} > "$DIR/counts.json"
rm -f "$DIR/counts_raw.txt"

sha256sum "$DIR/sik_billing.sql" "$DIR/sik_full.sql" "$DIR/sik_bench_full.sql" > "$DIR/SHA256SUMS"
cat "$DIR/counts.json"
echo "[d1] done: $DIR"
echo "$DIR" > /opt/dr-benchmark/snapshots/LATEST_D1
