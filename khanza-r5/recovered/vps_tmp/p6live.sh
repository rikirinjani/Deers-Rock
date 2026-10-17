X=/opt/simrs-khanza/run-env/setting/database.xml
echo "database.xml keys: $(grep -oE 'key="[A-Z_]+"' $X | tr '\n' ' ' | cut -c1-400)"
grep -E 'key="DATABASE"' $X | sed -E 's/>[^<]{40,}</>(long-encrypted)</' | cut -c1-200
cd /opt/Deers-Rock/tools
python3 - <<'PY'
import sys, json, hashlib
sys.path.insert(0,'.')
import dbutil, importlib
o = importlib.import_module('sampled_real_form_diff_r5')
for v in ['2026/10/01/800085','2026/10/01/800128','2026/10/01/000254','2026/10/01/000289']:
    out=[]
    for db in ('sik','sik_p6f'):
        out.append(o._content_hash([v], db, print)[:16])
    st = [dbutil.scalar(db, "SELECT status_bayar FROM reg_periksa WHERE no_rawat='%s'" % v) for db in ('sik','sik_p6f')]
    print(v, "sik=%s sik_p6f=%s" % tuple(out), "EQUAL" if out[0]==out[1] else "DIFFER", "status_bayar", st)
PY
echo "live sik billing rows touched today (tgl_byr today?):"
mysql -uroot -N -e "SELECT no_rawat, COUNT(*), MAX(tgl_byr) FROM sik.billing WHERE no_rawat IN ('2026/10/01/800085','2026/10/01/800128','2026/10/01/000254','2026/10/01/000289') GROUP BY no_rawat"
