echo "=== p5c2_run.log ==="
cat /tmp/p5c2_run.log 2>/dev/null | head -30
echo "=== stage tables left on live ==="
mysql -uroot -N -e "SHOW TABLES FROM sik LIKE '"'"'r5_stage_%'"'"';" 2>/dev/null
echo "=== billing rows for the 2 visits ==="
mysql -uroot -N -e "SELECT no_rawat, COUNT(*) FROM sik.billing WHERE no_rawat IN ('"'"'2026/10/01/000254'"'"','"'"'2026/10/01/000289'"'"') GROUP BY no_rawat;" 2>/dev/null
