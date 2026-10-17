set -e
cd /opt/dr-benchmark
echo "=== recreate sik_r5 (fresh clone) ==="
mysql -uroot -e "DROP DATABASE IF EXISTS sik_r5; CREATE DATABASE sik_r5;"
t0=$(date +%s)
mysqldump -uroot sik > /tmp/sik_r5_dump.sql 2>/dev/null
echo "dump $(($(date +%s)-t0))s size=$(stat -c%s /tmp/sik_r5_dump.sql)"
t1=$(date +%s)
mysql -uroot sik_r5 < /tmp/sik_r5_dump.sql
echo "restore $(($(date +%s)-t1))s"
rm -f /tmp/sik_r5_dump.sql
echo "=== pick 3 clone visits WITH consumer rows ==="
python3 - <<PY
import hashlib, subprocess, os
def q(sql):
    p=subprocess.run(["mysql","-uroot","-N","-B","sik_r5"],input=sql,capture_output=True,text=True,env=dict(os.environ))
    return [l for l in p.stdout.split("\n") if l!=""]
cand=q("SELECT DISTINCT no_rawat FROM billing WHERE no_rawat LIKE \"____/__/__/8_______\" LIMIT 500")
sel=sorted(cand,key=lambda v:hashlib.md5(v.encode()).hexdigest())[:3]
open("/tmp/r5h_visits3.txt","w").write("\n".join(sel)+"\n")
print("3-visit set:",sel)
for v in sel: print("  rows:",q("SELECT COUNT(*) FROM billing WHERE no_rawat=\"%s\""%v)[0])
PY
echo "=== point harness at clone, run 1 visit through the FIXED harness ==="
sed -i "s/^database=.*/database=sik_r5/" /opt/simrs-khanza/setting/database.ini
V=$(head -1 /tmp/r5h_visits3.txt)
DTE="${V%/*}"
cd /opt/simrs-khanza/run-env
echo "pre: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_r5.billing WHERE no_rawat='$V';")"
DISPLAY=:99 faketime "$DTE 08:00:00" timeout 120 java -cp ".:harness:shim:../dist/SIMRSKhanza.jar:../KhanzaSecurity16bit/dist/KhanzaSecurity16bit.jar:../lib/mariadb.jar:../resumepasien/lib/*" BilingHarness "$V" 2>&1 | grep -E "VISIT|sukses|reaper|DONE|click|payment"
cd /opt/dr-benchmark
echo "post: $(mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(totalbiaya),0) FROM sik_r5.billing WHERE no_rawat='$V';")"
