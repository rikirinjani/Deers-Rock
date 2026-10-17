#!/bin/bash
# r4_recon8: identify real ledger builder, dr_tariff (sik_bench), month scope, mutation-test scope, consumer reject path
set -u
echo "=== dr_tariff in sik_bench ==="
mysql -uroot -e "SHOW CREATE TABLE sik_bench.dr_tariff\G" 2>&1 | head -30
mysql -uroot -e "SELECT * FROM sik_bench.dr_tariff" 2>&1
echo
echo "=== ledger composition (component x source) ==="
mysql -uroot sik_bench -N -B -e "SELECT component, COALESCE(source,'NULL') s, COUNT(*), SUM(amount) FROM dr_charge_ledger GROUP BY component, s ORDER BY component, s"
echo
echo "=== which tool writes dr_charge_ledger (statement context) ==="
for f in load_354_dr_visits.py stage_a_g2.py generate_scale_encounters.py stagea_common.py; do
  echo "--- $f ---"
  grep -n -B2 -A8 "dr_charge_ledger" /opt/Deers-Rock/tools/$f 2>/dev/null | head -50
done
echo
echo "=== per-month DR reg vs billing (full window) ==="
mysql -uroot -N -B sik -e "
SELECT SUBSTRING_INDEX(r.no_rawat,'/',2) ym, COUNT(DISTINCT r.no_rawat) dr_regs,
       COUNT(DISTINCT b.no_rawat) billed
FROM reg_periksa r LEFT JOIN billing b ON b.no_rawat=r.no_rawat
WHERE r.no_rkm_medis LIKE 'DR%' GROUP BY ym ORDER BY ym"
echo
echo "=== months with zero DR regs (candidate for fault #7 insert) ==="
mysql -uroot -N -B sik -e "SELECT DISTINCT SUBSTRING_INDEX(no_rawat,'/',2) FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%' ORDER BY 1" | tr '\n' ' '; echo
echo
echo "=== Oct DR billing value rows + noindex uniqueness ==="
mysql -uroot -N -B sik -e "
SELECT COUNT(*), COUNT(DISTINCT noindex), COUNT(DISTINCT CONCAT(noindex,'|',no_rawat))
FROM billing b JOIN reg_periksa r ON r.no_rawat=b.no_rawat
WHERE r.no_rawat LIKE '2026/10/%' AND r.no_rkm_medis LIKE 'DR%'
  AND (b.biaya>0 OR b.totalbiaya>0) AND b.status NOT LIKE 'Ttl%'"
echo
echo "=== billing total rows ==="
mysql -uroot -N -B sik -e "SELECT COUNT(*), COUNT(DISTINCT noindex) FROM billing"
echo
echo "=== fault#7 smallest DR month billing rows ==="
mysql -uroot -N -B sik -e "
SELECT SUBSTRING_INDEX(b.no_rawat,'/',2) ym, COUNT(*)
FROM billing b JOIN reg_periksa r ON r.no_rawat=b.no_rawat
WHERE r.no_rkm_medis LIKE 'DR%' GROUP BY ym ORDER BY ym"
echo
echo "=== consumer unmappable/reject path ==="
grep -rln "KhanzaBillingConsumer" /opt --include=*.java 2>/dev/null | head -5
grep -rn "unmappable\|reject" /opt/SIMRSKhanza/src/plus/khanza/BillingConsumer*.java 2>/dev/null | head -10
ls /opt | head -20
echo
echo "=== dbutil: KHANZA_DIR / RESULTS_ROOT ==="
grep -n "KHANZA_DIR\|RESULTS_ROOT\|CONSUMER_CP" /opt/Deers-Rock/tools/dbutil.py | head -10
