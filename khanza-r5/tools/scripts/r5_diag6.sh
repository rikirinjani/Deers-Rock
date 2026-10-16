set -e
cd /opt/simrs-khanza
echo "=== BilingHarness.java: how it opens the form + DB ==="
grep -nE "koneksi|database|setDB|openDb|open_db|koneksiDB|new DlgBilingRalan|DB\.|db\." run-env/harness/BilingHarness.java | head -30
echo "=== harness: the save flow (BtnSimpan / sukses) ==="
grep -nE "sukses|Simpan|simpan|tunggu|sleep|Thread\.|saveDone|proses" run-env/harness/BilingHarness.java | head -30
echo "=== current ini ==="
grep -E "^(database|user|host)=" setting/database.ini
echo "=== clone: set_nota + payment master presence ==="
mysql -uroot -N -e "SELECT 'set_nota', COUNT(*) FROM sik_r5.set_nota; SELECT 'poliklinik', COUNT(*) FROM sik_r5.poliklinik; SELECT 'admin', COUNT(*) FROM sik_r5.admin;" 2>&1
echo "=== clone: piutang table exists? ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='sik_r5' AND table_name IN ('piutang_pasien','detail_piutang_pasien','set_nota');" 2>&1
