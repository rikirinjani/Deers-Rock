set -e
cd /tmp
PAT=$(mysql -uroot -N -e "SELECT no_rkm_medis FROM sik.reg_periksa WHERE no_rkm_medis LIKE '"'"'DR%'"'"' AND no_rkm_medis<>"" LIMIT 1;")
echo "FK patient: $PAT"
# verify the reg_periksa column set we can populate
mysql -uroot -N -e "DESCRIBE sik.reg_periksa;" 2>/dev/null | head -15
