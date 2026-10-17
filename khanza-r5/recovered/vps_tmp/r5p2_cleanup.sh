set -e
echo "=== confirm live canonical gate state (P2 tools never wrote live) ==="
echo "live ledger total: $(mysql -uroot -N -e "SELECT COALESCE(SUM(amount),0) FROM sik_bench.dr_charge_ledger WHERE no_rawat LIKE \"2026/10/%\";")"
echo "live consumer 2026-10 DR cohort: $(mysql -uroot -N -e "SELECT COALESCE(SUM(b.totalbiaya),0) FROM sik.billing b JOIN sik.reg_periksa rp ON rp.no_rawat=b.no_rawat WHERE rp.no_rawat LIKE \"2026/10/%\" AND rp.no_rkm_medis LIKE \"DR%\" AND (b.biaya>0 OR b.totalbiaya>0) AND b.status NOT LIKE \"Ttl%\";")"
echo "=== drop scratch fixture (P2 demo complete; keep P2 tools + evidence on box) ==="
mysql -uroot -e "DROP DATABASE IF EXISTS sik_p2; DROP DATABASE IF EXISTS sik_bench_p2;" 2>&1
echo "databases now: $(mysql -uroot -N -e "SHOW DATABASES LIKE \"sik%\";" | tr "\n" " ")"
echo "=== P2 tools present on box ==="
ls /opt/Deers-Rock/tools/*_p2.py 2>/dev/null
