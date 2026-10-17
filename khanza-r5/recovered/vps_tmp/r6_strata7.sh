#!/bin/bash
echo "=== all NOT NULL columns in reg_periksa without defaults ==="
mysql -uroot -N -e "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='sik_p6' AND TABLE_NAME='reg_periksa' AND IS_NULLABLE='NO';"
echo "=== re-check: maybe the row landed with a different key ==="
mysql -uroot -N -e "SELECT no_rawat, no_rkm_medis, status_bayar FROM sik_p6.reg_periksa WHERE no_rkm_medis='000002' ORDER BY no_rawat DESC LIMIT 10;"
echo "=== total reg_periksa now ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.reg_periksa;"
