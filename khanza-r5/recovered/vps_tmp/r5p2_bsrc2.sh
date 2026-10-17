set -e
echo "=== form-save presence for the 2026-10 DR cohort on the fixture ==="
echo "distinct nota_jalan visits in 2026-10 DR cohort:"
mysql -uroot -N -e "SELECT COUNT(DISTINCT nj.no_rawat) FROM sik_p2.nota_jalan nj JOIN sik_p2.reg_periksa rp ON rp.no_rawat=nj.no_rawat WHERE rp.no_rawat LIKE \"2026/10/%\" AND rp.no_rkm_medis LIKE \"DR%\";"
echo "total nota_jalan rows 2026-10 DR cohort:"
mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p2.nota_jalan nj JOIN sik_p2.reg_periksa rp ON rp.no_rawat=nj.no_rawat WHERE rp.no_rawat LIKE \"2026/10/%\" AND rp.no_rkm_medis LIKE \"DR%\";"
echo "=== sample a few 2026-10 DR visits that HAVE nota_jalan ==="
mysql -uroot -N -e "SELECT nj.no_rawat, nj.no_nota, nj.tanggal FROM sik_p2.nota_jalan nj JOIN sik_p2.reg_periksa rp ON rp.no_rawat=nj.no_rawat WHERE rp.no_rawat LIKE \"2026/10/%\" AND rp.no_rkm_medis LIKE \"DR%\" LIMIT 5;"
