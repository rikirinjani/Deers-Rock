echo "=== ralan B000001135 ==="
mysql -uroot -N -e "SELECT kode_brng, COALESCE(ralan,0) FROM sik.databarang WHERE kode_brng='"'"'B000001135'"'"';"
