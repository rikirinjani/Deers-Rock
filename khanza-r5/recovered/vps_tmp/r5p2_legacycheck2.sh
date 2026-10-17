set -e
echo "=== legacy tool live total: reproduce exactly (DB-qualified) ==="
echo "cohort count (sik.reg_periksa):"
mysql -uroot -N -e "SELECT COUNT(*) FROM sik.reg_periksa WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis LIKE 'DR%';"
echo "khanza_matrix total (sik.billing value rows for that cohort):"
mysql -uroot -N -e "SELECT COALESCE(SUM(b.totalbiaya),0) FROM sik.billing b WHERE b.no_rawat IN (SELECT no_rawat FROM sik.reg_periksa WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis LIKE 'DR%') AND (b.biaya>0 OR b.totalbiaya>0) AND b.status NOT LIKE 'Ttl%';"
echo "ledger_matrix total (sik_bench.dr_charge_ledger for that cohort):"
mysql -uroot -N -e "SELECT COALESCE(SUM(l.amount),0) FROM sik_bench.dr_charge_ledger l WHERE l.no_rawat IN (SELECT no_rawat FROM sik.reg_periksa WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis LIKE 'DR%');"
echo "WHOLE ledger table total:"
mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(amount),0) FROM sik_bench.dr_charge_ledger;"
echo "=== run the LEGACY charge_delta on live, capture the two totals it printed ==="
cd /opt/Deers-Rock/tools
env RUN_ID=r5p2_legacy_check python3 charge_delta_per_component.py --stage A 2>&1 | grep -E "Khanza total|DR ledger total|overall delta|gate"
