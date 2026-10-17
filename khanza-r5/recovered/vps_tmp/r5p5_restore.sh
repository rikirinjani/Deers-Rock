set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=0
echo "=== 1. delete tampered billing rows for the 2 visits ==="
mysql -uroot sik -e "DELETE FROM billing WHERE no_rawat IN ('2026/10/01/000254','2026/10/01/000289');"
mysql -uroot sik -e "UPDATE reg_periksa SET status_bayar='Belum Bayar' WHERE no_rawat IN ('2026/10/01/000254','2026/10/01/000289');"
echo "rows now: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik.billing WHERE no_rawat IN ('2026/10/01/000254','2026/10/01/000289');")"
echo "=== 2. consumer rebill (canonical restore at reverted price) ==="
python3 - <<PY
import sys
sys.path.insert(0, "/opt/Deers-Rock/tools")
import dbutil
db = "sik"
def rebill(nr):
    tgl = jam = None
    for r in dbutil.query(db, "SELECT tgl_registrasi, COALESCE(jam_reg,'08:00:00') FROM reg_periksa WHERE no_rawat='%s'" % nr):
        tgl, jam = r[0], r[1]
    lines = ["ENC %s %s %s" % (nr, tgl, jam)]
    for kode, nama, hbeli, jml in dbutil.query(db,
        "SELECT d.kode_brng, COALESCE(b.nama_brng,d.kode_brng), d.h_beli, d.jml "
        "FROM detail_pemberian_obat d LEFT JOIN databarang b ON b.kode_brng=d.kode_brng "
        "WHERE d.no_rawat='%s' ORDER BY d.kode_brng" % nr):
        h = float(hbeli or 0); j = float(jml or 0)
        hs = str(int(h)) if h == int(h) else repr(h)
        js = str(int(j)) if j == int(j) else repr(j)
        lines.append("OBAT %s %s %s %s %s" % (nr, kode, str(nama).replace(" ", "_"), hs, js))
    lines.append("END")
    mini = "/tmp/r5p5_rebill_%s.txt" % nr.replace("/", "_")
    open(mini, "w").write("\n".join(lines) + "\n")
    import subprocess
    p = subprocess.run(["java", "-cp", dbutil.CONSUMER_CP, "KhanzaBillingConsumer", mini,
                        "/tmp/r5p5_rebill_%s.log" % nr.replace("/", "_")],
                       cwd=dbutil.KHANZA_DIR, capture_output=True, text=True, timeout=300)
    print(nr, "rc=", p.returncode)
for v in ["2026/10/01/000254", "2026/10/01/000289"]:
    rebill(v)
PY
echo "rows after rebill: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik.billing WHERE no_rawat IN ('2026/10/01/000254','2026/10/01/000289');")"
echo "=== 3. gate check (expect PASS = canonical restored) ==="
env RUN_ID=r5p5_gate2 python3 charge_delta_per_component_p2.py --stage A >/tmp/p5d_gate2.log 2>&1
echo "charge_delta rc=$? $(grep -oE 'gate \(all deltas == 0, other == 0\): (PASS|FAIL)' /tmp/p5d_gate2.log | head -1)"
