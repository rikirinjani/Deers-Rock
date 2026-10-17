set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
export P2_CONSUMER_DB=sik_p2
export P2_LEDGER_DB=sik_bench_p2
# rebuild p2 ledger cleanly and inspect
echo "=== rebuild p2 ledger ==="
env RUN_ID=r5p2_reb python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/tmp/reb.log 2>&1; echo "builder rc=$?"
grep -E "dr_tariff authority|registration rows|procedure rows|drug rows|tax rows|done" /tmp/reb.log | head
echo "=== p2 ledger by component ==="
mysql -uroot -N -e "SELECT component, COUNT(*), SUM(amount) FROM sik_bench_p2.dr_charge_ledger GROUP BY component ORDER BY component;"
echo "=== p2 consumer billing value rows for the DR cohort only ==="
mysql -uroot -N -e "
SELECT
 SUM(CASE WHEN status='Registrasi' THEN 1 ELSE 0 END) reg_rows,
 SUM(CASE WHEN status LIKE 'Ralan Dokter%' OR status LIKE 'Ranap Dokter%' OR status LIKE '%Paramedis%' THEN 1 ELSE 0 END) proc_rows,
 SUM(CASE WHEN status='Obat' AND nm_perawatan NOT LIKE '%PPN%' THEN 1 ELSE 0 END) drug_rows,
 SUM(CASE WHEN nm_perawatan LIKE '%PPN%' THEN 1 ELSE 0 END) tax_rows,
 COUNT(*) total, SUM(totalbiaya) total_amt
FROM sik_p2.billing b
JOIN sik_p2.reg_periksa rp ON rp.no_rawat=b.no_rawat
WHERE b.no_rawat LIKE \"2026/10/%\" AND rp.no_rkm_medis LIKE \"DR%\"
AND (b.biaya>0 OR b.totalbiaya>0) AND b.status NOT LIKE \"Ttl%\";"
