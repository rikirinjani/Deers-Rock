set +e
cd /tmp
echo "=== which mysqldump + schema dump with error output ==="
which mysqldump; mysqldump --version
mysqldump -uroot -no-data sik > /tmp/sik_p6_schema.sql 2>/tmp/schema_err.txt
echo "schema rc: $? bytes: $(wc -c < /tmp/sik_p6_schema.sql)"
echo "stderr:"; cat /tmp/schema_err.txt
echo "=== first 5 lines of schema ==="
head -5 /tmp/sik_p6_schema.sql
echo "=== grep CREATE TABLE count ==="
grep -c "CREATE TABLE" /tmp/sik_p6_schema.sql
