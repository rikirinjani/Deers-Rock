cd /opt/dr-benchmark
HL=$(ls /opt/dr-benchmark/results/r5_p1_demo/B3_oracle_run_r5/harness_*.log 2>/dev/null | head -1)
echo "=== harness log $HL : connect/save lines ==="
grep -iE "koneksi|berhasil|gagal|login|tbBilling|payment|reaper|sukses|error|exception" "$HL" 2>/dev/null | head -15
echo "=== how many harness logs show the form connected vs not ==="
grep -l "Koneksi Berhasil" /opt/dr-benchmark/results/r5_p1_demo/B3_oracle_run_r5/harness_*.log 2>/dev/null | wc -l
echo "=== does the form save depend on a DB table that differs between sik and sik_r5? check piutang/nota ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik_r5.piutang_pasien WHERE no_rawat LIKE '____/__/__/8_____';"
echo "=== set_nota / set_biaya differences (form save gating) ==="
mysql -uroot -N -e "SELECT 'r5 set_nota', COUNT(*) FROM sik_r5.set_nota UNION ALL SELECT 'sik set_nota', COUNT(*) FROM sik.set_nota;" 2>&1
echo "=== is sik_r5 a FULL clone of sik (same row count billing)? ==="
mysql -uroot -N -e "SELECT 'r5_billing', COUNT(*) FROM sik_r5.billing UNION ALL SELECT 'sik_billing', COUNT(*) FROM sik.billing;" 2>&1
