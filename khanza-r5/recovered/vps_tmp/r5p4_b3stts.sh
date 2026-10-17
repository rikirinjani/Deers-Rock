set -e
echo "=== stts / stts_daftar domain on real DR rows ==="
mysql -uroot -N -e "SELECT DISTINCT stts, stts_daftar FROM sik_p2.reg_periksa WHERE no_rkm_medis LIKE \"DR%\" LIMIT 5;"
echo "=== a representative DR reg row (real values, key cols) to copy ==="
mysql -uroot sik_p2 -e "SELECT no_rawat, tgl_registrasi, jam_reg, no_rkm_medis, kd_poli, biaya_reg, status_bayar, stts, stts_daftar FROM reg_periksa WHERE no_rkm_medis LIKE \"DR%\" AND no_rawat LIKE \"2026/10/%\" LIMIT 2\G"
