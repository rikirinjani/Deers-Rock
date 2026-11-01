set -u
echo "## wire $(date -u +%FT%TZ)"
umask 077
install -m 600 /dev/null /opt/simrs-khanza/run-env/benchmark_pw
openssl rand -base64 24 | tr -d '\n' > /opt/simrs-khanza/run-env/benchmark_pw
PW=$(cat /opt/simrs-khanza/run-env/benchmark_pw)
mysql -uroot -e "CREATE USER IF NOT EXISTS 'benchmark'@'localhost' IDENTIFIED BY '$PW'; ALTER USER 'benchmark'@'localhost' IDENTIFIED BY '$PW';
 GRANT SELECT,INSERT,UPDATE,DELETE ON sik.* TO 'benchmark'@'localhost';
 GRANT ALL PRIVILEGES ON sik_bench.* TO 'benchmark'@'localhost'; FLUSH PRIVILEGES;"
echo "grants: $(mysql -uroot -N -e "SELECT CONCAT(table_schema,':',privilege_type) FROM information_schema.schema_privileges WHERE grantee LIKE '%benchmark%' AND table_schema IN ('sik','sik_bench')" | wc -l) rows (source box: 4 sik + 17 sik_bench = 21)"
mysql -uroot -N -e "SHOW GRANTS FOR 'benchmark'@'localhost'" | sed "s/IDENTIFIED.*//"
# compile: move the shipped classes aside first so a fresh javac output is what remains
mkdir -p /srv/shipped_classes/consumer /srv/shipped_classes/harness
cd /opt/simrs-khanza/consumer && mv *.class* /srv/shipped_classes/consumer/ 2>/dev/null
cd /opt/simrs-khanza/run-env/harness && mv *.class /srv/shipped_classes/harness/ 2>/dev/null
CP="/opt/simrs-khanza/consumer:/opt/simrs-khanza/KhanzaSecurity16bit/build/classes:/opt/simrs-khanza/lib/mariadb.jar:/opt/simrs-khanza/resumepasien/lib/commons-codec-1.10.jar"
cd /opt/simrs-khanza/consumer && javac -cp "$CP" KhanzaBillingConsumer.java PatchDbXml.java RetargetDbXml.java TestAES.java JdbcProbe.java MiniParse.java 2>&1 | tail -5; echo "consumer javac rc=${PIPESTATUS[0]}"
javac -cp "$CP" JasperHeadless.java 2>&1 | tail -3; echo "JasperHeadless javac rc=${PIPESTATUS[0]} (needs jasper jars, not in the doc classpath)"
cd /opt/simrs-khanza/run-env/harness && javac -cp ".:shim:../../dist/SIMRSKhanza.jar:../../KhanzaSecurity16bit/dist/KhanzaSecurity16bit.jar" BilingHarness.java 2>&1 | tail -5; echo "BilingHarness javac rc=${PIPESTATUS[0]}"
javac -cp "$CP" EncodeAES.java 2>&1 | tail -3; echo "EncodeAES javac rc=${PIPESTATUS[0]}"
ls /opt/simrs-khanza/consumer/*.class /opt/simrs-khanza/run-env/harness/*.class
for f in /srv/shipped_classes/consumer/*.class /srv/shipped_classes/harness/*.class; do b=$(basename $f); n=$(ls /opt/simrs-khanza/consumer/$b /opt/simrs-khanza/run-env/harness/$b 2>/dev/null | head -1); echo "$b shipped=$(sha256sum <$f|cut -c1-12) new=$( [ -n "$n" ] && sha256sum <$n|cut -c1-12 )"; done
