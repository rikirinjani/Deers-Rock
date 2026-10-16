set -e
echo "=== fresh never-billed generated visits on LIVE sik ==="
mysql -uroot -N -e "SELECT rp.no_rawat FROM sik.reg_periksa rp LEFT JOIN sik.billing b ON b.no_rawat=rp.no_rawat WHERE rp.no_rawat LIKE '____/__/__/8_____' AND rp.no_rkm_medis LIKE 'DR%' AND b.no_rawat IS NULL ORDER BY rp.no_rawat LIMIT 5;"
echo "=== how many never-billed generated visits exist on live? ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik.reg_periksa rp LEFT JOIN sik.billing b ON b.no_rawat=rp.no_rawat WHERE rp.no_rawat LIKE '____/__/__/8_____' AND rp.no_rkm_medis LIKE 'DR%' AND b.no_rawat IS NULL;"
echo "=== same on clone sik_r5 ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik_r5.reg_periksa rp LEFT JOIN sik_r5.billing b ON b.no_rawat=rp.no_rawat WHERE rp.no_rawat LIKE '____/__/__/8_____' AND rp.no_rkm_medis LIKE 'DR%' AND b.no_rawat IS NULL;"
