echo "=== penjab table ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.penjab;" 2>&1
mysql -uroot -N -e "SELECT kd_pj FROM sik_p6.penjab LIMIT 5;" 2>&1
echo "=== does live sik have penjab rows? ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik.penjab;" 2>&1
mysql -uroot -N -e "SELECT DISTINCT kd_pj FROM sik.reg_periksa WHERE kd_pj IS NOT NULL AND kd_pj<>"""" LIMIT 5;" 2>&1
