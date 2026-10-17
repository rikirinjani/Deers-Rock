set -e
cd /opt/dr-benchmark
echo "=== clone ready? ==="
mysql -uroot -N -e "SELECT \"r5 billing\", COUNT(*) FROM sik_r5.billing;"
V=$(head -1 /tmp/r5h_visits3.txt 2>/dev/null)
[ -z "$V" ] && {
  python3 - <<PY
import hashlib, subprocess, os
def q(sql):
    p=subprocess.run(["mysql","-uroot","-N","-B","sik_r5"],input=sql,capture_output=True,text=True,env=dict(os.environ))
    return [l for l in p.stdout.split("\n") if l!=""]
cand=q("SELECT DISTINCT no_rawat FROM billing WHERE no_rawat LIKE \"____/__/__/8_____\" LIMIT 500")
sel=sorted(cand,key=lambda v:hashlib.md5(v.encode()).hexdigest())[:3]
open("/tmp/r5h_visits3.txt","w").write("\n".join(sel)+"\n")
print("3-visit set:",sel)
PY
  V=$(head -1 /tmp/r5h_visits3.txt)
}
echo "V=$V"
sed -i "s/^database=.*/database=sik_r5/" /opt/simrs-khanza/setting/database.ini
grep -E "^database=" /opt/simrs-khanza/setting/database.ini
DTE="${V%/*}"
cd /opt/simrs-khanza/run-env
echo "PRE billing rows for $V: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_r5.billing WHERE no_rawat='$V';")"
DISPLAY=:99 faketime "$DTE 08:00:00" timeout 120 java -cp ".:harness:shim:../dist/SIMRSKhanza.jar:../KhanzaSecurity16bit/dist/KhanzaSecurity16bit.jar:../lib/mariadb.jar:../resumepasien/lib/*" BilingHarness "$V" 2>&1 | grep -E "VISIT|sukses|reaper|DONE|click|payment"
echo "POST billing rows for $V: $(mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(totalbiaya),0) FROM sik_r5.billing WHERE no_rawat='$V';")"
