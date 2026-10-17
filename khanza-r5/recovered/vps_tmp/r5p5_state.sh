echo "=== databases on box ==="
mysql -uroot -N -e "SHOW DATABASES;" | tr "\n" " "; echo
echo ""
echo "=== harness database.ini ==="
grep -E "^database=" /opt/simrs-khanza/setting/database.ini
echo ""
echo "=== sik_p2 reg_periksa row count (root) ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p2.reg_periksa;" 2>&1
echo ""
echo "=== STRATA- visits in sik_p2 ==="
mysql -uroot -N -e "SELECT no_rawat FROM sik_p2.reg_periksa WHERE no_rawat LIKE '"'"'STRATA-%'"'"';" 2>&1
echo ""
echo "=== sik live STRATA visits (should be none) ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik.reg_periksa WHERE no_rawat LIKE '"'"'STRATA-%'"'"';"
