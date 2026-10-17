set -e
cd /opt/dr-benchmark
# restore live sik for the live-visit we unbilled (re-bill via consumer to return to canonical)
export DBUTIL_FORCE_ROOT=0
V="2026/10/01/800190"
# The consumer can re-bill: build a single-visit encounter and run KhanzaBillingConsumer
python3 - <<PY
import subprocess, os
def q(db, sql):
    p = subprocess.run(["mysql","-uroot","-N","-B",db], input=sql,
                       capture_output=True, text=True, env=dict(os.environ))
    return [l for l in p.stdout.split("\n") if l!=""]
# rebuild encounter file for the visit from reg_periksa + detail_pemberian_obat
tp = q("sik", "SELECT tgl_registrasi, COALESCE(jam_reg,'08:00:00') FROM reg_periksa WHERE no_rawat='2026/10/01/800190'")[0].split("\t")
lines = ["ENC 2026/10/01/800190 %s %s" % (tp[0], tp[1])]
for row in q("sik", "SELECT d.kode_brng, COALESCE(b.nama_brng,d.kode_brng), d.h_beli, d.jml FROM detail_pemberian_obat d LEFT JOIN databarang b ON b.kode_brng=d.kode_brng WHERE d.no_rawat='2026/10/01/800190' ORDER BY d.kode_brng"):
    k,nm,h,j = row.split("\t")
    h = int(float(h or 0)); j = int(float(j or 0))
    lines.append("OBAT 2026/10/01/800190 %s %s %d %d" % (k, nm.replace(" ","_"), h, j))
lines.append("END")
open("/tmp/dr_rebill_800190.txt","w").write("\n".join(lines)+"\n")
print("rebuilt encounter, %d obat lines" % (len(lines)-2))
PY
cd /opt/simrs-khanza
java -cp "consumer:KhanzaSecurity16bit/dist/KhanzaSecurity16bit.jar:lib/mariadb.jar:resumepasien/lib/commons-codec-1.10.jar:resumepasien/lib/org-apache-commons-codec.jar" KhanzaBillingConsumer /tmp/dr_rebill_800190.txt /tmp/dr_rebill_800190.log 2>&1 | tail -3
echo "rebill rc=$?"
cd /opt/dr-benchmark
echo "live sik billing for $V after consumer rebill: $(mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(totalbiaya),0) FROM sik.billing WHERE no_rawat='$V';")"
# restore the ini to live
sed -i "s/^database=.*/database=sik/" /opt/simrs-khanza/setting/database.ini
echo "ini now: $(grep -E '^database=' /opt/simrs-khanza/setting/database.ini)"
# drop the scratch clone
mysql -uroot -e "DROP DATABASE IF EXISTS sik_r5;" 2>&1
echo "=== final live gate check ==="
cd /opt/Deers-Rock/tools
RUN_ID=r5h_postcheck python3 charge_delta_per_component.py --stage A 2>&1 | tail -1
RUN_ID=r5h_postcheck python3 three_count_reconcile.py --stage A 2>&1 | tail -1
