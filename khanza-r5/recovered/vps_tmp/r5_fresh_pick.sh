set -e
cd /opt/simrs-khanza
# point harness at LIVE sik for this control
sed -i "s/^database=.*/database=sik/" setting/database.ini
echo "=== pick a fresh, never-billed generated visit on LIVE sik ==="
mysql -uroot -N -e "SELECT rp.no_rawat FROM sik.reg_periksa rp LEFT JOIN sik.billing b ON b.no_rawat=rp.no_rawat WHERE rp.no_rawat LIKE '____/__/__/8_____' AND b.no_rawat IS NULL ORDER BY rp.no_rawat LIMIT 3;"
