#!/bin/bash
echo "=== reg_periksa columns ==="
mysql -uroot -N -B sik -e "SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='sik' AND TABLE_NAME='reg_periksa' ORDER BY ORDINAL_POSITION"
echo "=== reg_periksa template row ==="
mysql -uroot -N -B sik -e "SELECT * FROM reg_periksa WHERE no_rawat='2026/10/01/000254'"
