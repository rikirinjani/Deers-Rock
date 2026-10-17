set -e
cd /opt/dr-benchmark
COLS=$(mysql -uroot -N -e "SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION) FROM information_schema.columns WHERE table_schema=\"sik_p2\" AND table_name=\"reg_periksa\";")
echo "cols: $COLS"
mysql -uroot sik_p2 -e "
DELETE FROM reg_periksa WHERE no_rawat LIKE 'STRATA-%';
"
# 5 STRATA- rows, each a full copy of a real DR reg row with no_rawat overridden
for STR in "STRATA-EMBALASE 2026/10/01/000254" "STRATA-TUSLAH 2026/10/01/000289" "STRATA-HALFPPN 2026/10/01/000298" "STRATA-ZEROFEE 2026/10/01/000332" "STRATA-GT3PROC 2026/10/01/000358"; do
  S=$(echo $STR | cut -d' ' -f1)
  T=$(echo $STR | cut -d' ' -f2)
  # column list with no_rawat replaced by a literal
  RESTCOLS=$(echo $COLS | sed "s/^no_rawat,//; s/,no_rawat/,/g; s/no_rawat//g")
  mysql -uroot sik_p2 -e "INSERT INTO reg_periksa ($COLS) SELECT '$S', (SELECT t.$RESTCOLS FROM reg_periksa t WHERE t.no_rawat='$T' LIMIT 1);" 2>/dev/null || \
  mysql -uroot sik_p2 -e "INSERT INTO reg_periksa ($RESTCOLS) SELECT '$S', $RESTCOLS FROM reg_periksa WHERE no_rawat='$T' LIMIT 1;" 2>/dev/null
done
# fix the no_rawat column: the RESTCOLS approach doubled it; just set explicitly. Clean approach:
mysql -uroot sik_p2 -e "DELETE FROM reg_periksa WHERE no_rawat LIKE 'STRATA-%';"
# Now a clean column-explicit copy: list every column, override only no_rawat
echo "$COLS"
