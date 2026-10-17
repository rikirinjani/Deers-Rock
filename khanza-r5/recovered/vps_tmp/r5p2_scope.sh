set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1 P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2
echo "=== cohort-scoped (2026-10 DR) ledger total vs consumer total ? the REAL comparison ==="
mysql -uroot -N -e "SELECT 'ledger_202610DR', COALESCE(SUM(l.amount),0) FROM sik_bench_p2.dr_charge_ledger l JOIN sik_p2.reg_periksa rp ON rp.no_rawat=l.no_rawat WHERE rp.no_rawat LIKE '2026/10/%' AND rp.no_rkm_medis LIKE 'DR%';"
echo "=== is the 2026-10 cohort the ONLY cohort, or did my rebuild touch other months? ==="
mysql -uroot -N -e "SELECT LEFT(no_rawat,7) m, COUNT(*) FROM sik_bench_p2.dr_charge_ledger GROUP BY LEFT(no_rawat,7) ORDER BY m;"
