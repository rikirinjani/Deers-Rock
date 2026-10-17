set -e
echo "=== detail_nota_jalan full columns ==="
mysql -uroot -N -e "SELECT GROUP_CONCAT(COLUMN_NAME) FROM information_schema.columns WHERE table_schema='sik_p2' AND table_name='detail_nota_jalan';"
echo "=== nota_jalan full columns ==="
mysql -uroot -N -e "SELECT GROUP_CONCAT(COLUMN_NAME) FROM information_schema.columns WHERE table_schema='sik_p2' AND table_name='nota_jalan';"
echo "=== sample detail_nota_jalan rows for a 2026-10 DR visit ==="
mysql -uroot -N -e "SELECT * FROM sik_p2.detail_nota_jalan WHERE no_rawat='2026/10/01/000254';"
echo "=== how does detail_nota_jalan relate to nota_jalan? (join by no_nota?) ==="
mysql -uroot -N -e "SELECT nj.no_nota, nj.no_rawat, dn.* FROM sik_p2.nota_jalan nj LEFT JOIN sik_p2.detail_nota_jalan dn ON dn.no_rawat=nj.no_rawat WHERE nj.no_rawat='2026/10/01/000254';" 2>/dev/null || echo "(join by no_nota failed; check cols)"
