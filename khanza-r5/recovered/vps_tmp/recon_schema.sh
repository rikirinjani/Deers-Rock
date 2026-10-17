#!/usr/bin/env bash
# Schema recon for P1 unbilled-visit query design (read-only)
echo "=== reg_periksa cols ==="
mysql -uroot sik -N -B -e "SHOW COLUMNS FROM reg_periksa;" 2>/dev/null | cut -f1
echo
echo "=== billing cols ==="
mysql -uroot sik -N -B -e "SHOW COLUMNS FROM billing;" 2>/dev/null | cut -f1
echo
echo "=== DR sample rows ==="
mysql -uroot sik -N -B -e "SELECT no_rkm_medis, no_rawat FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%' LIMIT 5;" 2>/dev/null
echo
echo "=== counts ==="
mysql -uroot sik -N -B -e "SELECT COUNT(*) AS dr_reg FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%';" 2>/dev/null
mysql -uroot sik -N -B -e "SELECT COUNT(*) AS billing_rows_total FROM billing;" 2>/dev/null
echo
echo "=== month span of DR reg_periksa ==="
mysql -uroot sik -N -B -e "SELECT DISTINCT DATE_FORMAT(no_rawat,'%Y-%m') m, COUNT(*) c FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%' GROUP BY m ORDER BY m;" 2>/dev/null
echo
echo "=== month span of billing no_rawat ==="
mysql -uroot sik -N -B -e "SELECT DISTINCT DATE_FORMAT(no_rawat,'%Y-%m') m, COUNT(*) c FROM billing GROUP BY m ORDER BY m;" 2>/dev/null
