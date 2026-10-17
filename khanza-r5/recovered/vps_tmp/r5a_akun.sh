set -e
cd /opt/simrs-khanza
echo "=== harness payment block (read the full logic) ==="
sed -n '55,95p' run-env/harness/BilingHarness.java 2>&1 || cat run-env/harness/BilingHarness.java | sed -n '55,95p'
echo "=== akun_bayar / piutang master on live sik vs (would-be) clone ==="
echo "live sik.akun_bayar rows: $(mysql -uroot -N -e 'SELECT COUNT(*) FROM sik.akun_bayar;')  (distinct jenis: $(mysql -uroot -N -e 'SELECT COUNT(DISTINCT jenis) FROM sik.akun_bayar;' 2>/dev/null))"
echo "live sik.akun_piutang rows: $(mysql -uroot -N -e 'SELECT COUNT(*) FROM sik.akun_piutang;')"
echo "=== what does tbAkunBayar load? (grep the jar's DlgBilingRalan behavior) ==="
strings dist/SIMRSKhanza.jar 2>/dev/null | grep -iE "akun_bayar|akunpiutang|akun_piutang|SELECT.*akun" | sort -u | head -10
