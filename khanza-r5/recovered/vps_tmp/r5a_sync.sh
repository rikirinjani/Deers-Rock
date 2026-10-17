cd /opt/dr-benchmark
python3 -c "import ast; ast.parse(open('/opt/Deers-Rock/tools/sampled_real_form_diff_r5.py').read()); print('on-box syntax OK')"
# restore harness ini to live sik (clone demo is done; leave box clean)
sed -i "s/^database=.*/database=sik/" /opt/simrs-khanza/setting/database.ini
echo "ini now: $(grep -E '^database=' /opt/simrs-khanza/setting/database.ini)"
echo "live sik stable check (expect 1464593 / 34895128580):"
mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(totalbiaya),0) FROM sik.billing;"
