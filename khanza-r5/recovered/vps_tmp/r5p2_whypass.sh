set -e
echo "=== WHY did legacy charge_delta report delta=0? Reproduce its exact math on live ==="
echo "legacy get_dr_visits: no_rawat LIKE '2026/10/%' AND no_rkm LIKE 'DR%' => 7708 visits"
echo "legacy khanza_matrix reads sik.billing WHERE no_rawat IN (those 7708) => total?"
mysql -uroot -N -e "SELECT 'khanza_cohort', COALESCE(SUM(totalbiaya),0) FROM sik.billing WHERE no_rawat IN (SELECT no_rawat FROM reg_periksa WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis LIKE 'DR%') AND (biaya>0 OR totalbiaya>0) AND status NOT LIKE 'Ttl%';"
echo "legacy ledger_matrix reads sik_bench.dr_charge_ledger WHERE no_rawat IN (same 7708) => total?"
mysql -uroot -N -e "SELECT 'ledger_cohort', COALESCE(SUM(amount),0) FROM sik_bench.dr_charge_ledger WHERE no_rawat IN (SELECT no_rawat FROM reg_periksa WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis LIKE 'DR%');"
echo "=== component-level, the legacy per-component khanza vs ledger (the gate actually compares per-component, not just totals) ==="
echo "-- khanza per-component (cohort):"
mysql -uroot -N -e "SELECT
  SUM(status='Registrasi' AND biaya>0), SUM(CASE WHEN status LIKE 'Ralan Dokter%' OR status LIKE 'Ranap Dokter%' OR status LIKE '%Paramedis%' THEN totalbiaya ELSE 0 END),
  SUM(status='Obat' AND nm_perawatan NOT LIKE '%PPN%'), SUM(nm_perawatan LIKE '%PPN%'),
  SUM(CASE WHEN status='Registrasi' THEN 0 WHEN status LIKE 'Ralan Dokter%' OR status LIKE 'Ranap Dokter%' OR status LIKE '%Paramedis%' THEN totalbiaya WHEN status='Obat' AND nm_perawatan NOT LIKE '%PPN%' THEN totalbiaya WHEN nm_perawatan LIKE '%PPN%' THEN totalbiaya END)
 FROM sik.billing WHERE no_rawat IN (SELECT no_rawat FROM reg_periksa WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis LIKE 'DR%') AND (biaya>0 OR totalbiaya>0) AND status NOT LIKE 'Ttl%';"
