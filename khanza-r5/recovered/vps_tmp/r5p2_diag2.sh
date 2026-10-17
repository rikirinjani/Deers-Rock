set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1 P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2
echo "=== rebuild p2 ledger ==="
env RUN_ID=r5p2_reb2 python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr 2>&1 | grep -E "dr_tariff|registration rows|procedure rows|drug rows|tax rows|done|FAIL-CLOSED" | head
echo "=== p2 ledger by component (rows, amount) ==="
mysql -uroot -N -e "SELECT component, COUNT(*), SUM(amount) FROM sik_bench_p2.dr_charge_ledger GROUP BY component ORDER BY component;"
echo "=== p2 consumer DR-cohort value rows by bucket ==="
mysql -uroot -N -e "SELECT
  SUM(status='Registrasi'),
  SUM(status LIKE 'Ralan Dokter%' OR status LIKE 'Ranap Dokter%' OR status LIKE '%Paramedis%'),
  SUM(status='Obat' AND nm_perawatan NOT LIKE '%PPN%'),
  SUM(nm_perawatan LIKE '%PPN%'),
  COUNT(*), SUM(totalbiaya)
FROM sik_p2.billing b JOIN sik_p2.reg_periksa rp ON rp.no_rawat=b.no_rawat
WHERE b.no_rawat LIKE '2026/10/%' AND rp.no_rkm_medis LIKE 'DR%'
  AND (b.biaya>0 OR b.totalbiaya>0) AND b.status NOT LIKE 'Ttl%';"
