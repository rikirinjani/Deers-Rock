PW=$(cat /opt/simrs-khanza/run-env/benchmark_pw)
CP="/opt/simrs-khanza/consumer:/opt/simrs-khanza/KhanzaSecurity16bit/build/classes:/opt/simrs-khanza/lib/mariadb.jar:/opt/simrs-khanza/resumepasien/lib/commons-codec-1.10.jar"
flt() { grep -vF -e "$PW"; }
for x in /opt/simrs-khanza/setting/database.xml /opt/simrs-khanza/run-env/setting/database.xml; do java -cp "$CP" PatchDbXml $x benchmark "$PW" 2>&1 | flt | cut -c1-200; echo "patch rc=${PIPESTATUS[0]}"; done
java -cp "$CP" JdbcProbe 2>&1 | flt | head -5
mysql -ubenchmark -p"$PW" -N -e "select current_user(), count(*) from sik_bench.dr_charge_ledger" 2>&1 | flt
cd /opt/Deers-Rock/tools && python3 p6_dbxml.py probe 2>&1 | head -5
