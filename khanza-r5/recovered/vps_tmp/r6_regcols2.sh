PAT=$(mysql -uroot -N -e "SELECT no_rkm_medis FROM sik.reg_periksa WHERE no_rkm_medis LIKE '"'"'DR%'"'"' LIMIT 1;")
echo "FK patient: $PAT"
echo "=== reg_periksa columns ==="
mysql -uroot -N -e "SHOW COLUMNS FROM sik.reg_periksa;" | head -12
