#!/usr/bin/env bash
# R3 close-out v5: A2-a with a REAL kd_pj (sourced from an existing DR row) so the FK holds.
set -uo pipefail
OUT=/opt/dr-benchmark/p-chain
TS=$(cat "$OUT/r3_RUN_TS")
LOG="$OUT/r3_closeout_v5_$TS.log"
{
echo "=== R3 close-out v5 start $TS (A2-a with valid FK) ==="
python3 - "$OUT" "$TS" <<'PY'
import json,sys,subprocess,re
out,ts=sys.argv[1],sys.argv[2]
def qv(sql,db="sik"):
    p=subprocess.run(["mysql","-uroot","-N","-B",db,"-e",sql],capture_output=True,text=True)
    if p.returncode: raise RuntimeError(db+" :: "+sql[:90]+" -> "+p.stderr.strip())
    return p.stdout.strip()
def qn(sql,db="sik"):
    p=subprocess.run(["mysql","-uroot","-N","-B",db,"-e",sql],capture_output=True,text=True)
    return p.returncode,p.stdout.strip(),p.stderr.strip()
# NOT NULL no-default cols from the earlier probe
req=["no_rawat","stts_daftar","status_lanjut","kd_pj","status_bayar","status_poli"]
names=[c.split("\t")[0] for c in qv("SHOW COLUMNS FROM reg_periksa;").splitlines()]
assert all(c in names for c in req), "schema changed?"
# Source REAL values for the FK + enum-ish cols from an existing DR row
src=qv("SELECT no_rawat,kd_pj,stts_daftar,status_lanjut,status_bayar,status_poli FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%' LIMIT 1;")
sp=src.split("\t")
print("source row no_rawat=",sp[0],"kd_pj=",sp[1])
kd_pj,stts_daftar,status_lanjut,status_bayar,status_poli=sp[1],sp[2],sp[3],sp[4],sp[5]
SCRATCH_NO="2026/10/05/899104"; SCRATCH_RKM="DR099104"
cols=["no_rawat","no_rkm_medis","kd_pj","stts_daftar","status_lanjut","status_bayar","status_poli","tgl_registrasi"]
vals={"no_rawat":"'"+SCRATCH_NO+"'","no_rkm_medis":"'"+SCRATCH_RKM+"'",
      "kd_pj":kd_pj,"stts_daftar":"'"+stts_daftar+"'",
      "status_lanjut":"'"+status_lanjut+"'" if status_lanjut!="NULL" else "NULL",
      "status_bayar":"'"+status_bayar+"'" if status_bayar!="NULL" else "NULL",
      "status_poli":"'"+status_poli+"'" if status_poli!="NULL" else "NULL",
      "tgl_registrasi":"'2026-10-05 08:00:00'"}
missing=[c for c in cols if c not in vals]
if missing:
    for c in missing:
        vals[c]="'0'" if c not in ("kd_pj",) else kd_pj
insql="INSERT INTO reg_periksa (%s) VALUES (%s);"%(",".join(cols),",".join(vals[c] for c in cols))
rc,outp,err=qn(insql)
print("insert rc:",rc, (err.splitlines()[0][:140] if err else ""))
R={"insert_cols":cols,"insert_rc":rc}
if rc==0:
    pred=("SELECT SUBSTRING_INDEX(r.no_rawat,'/',2) ym, COUNT(*) reg, "
          "SUM(CASE WHEN b.no_rawat IS NULL THEN 1 ELSE 0 END) unbilled "
          "FROM reg_periksa r LEFT JOIN billing b ON b.no_rawat=r.no_rawat "
          "WHERE r.no_rkm_medis LIKE 'DR%' GROUP BY ym ORDER BY ym;")
    predout=qv(pred)
    octline=[l for l in predout.splitlines() if l.split("\t")[0]=="2026/10"]
    R["predicate_with_injection"]=predout
    R["oct_unbilled_under_injection"]=octline[0].split("\t")[2] if octline else "NO-OCT-ROW"
    runall=open("/opt/dr-benchmark/run_all.sh").read()
    m=re.search(r"check_billed_eq_dr\(\).*?\n\}",runall,re.S)
    R["gate_function_present"]=bool(m)
    R["gate_function_text"]=(m.group(0)[:4000] if m else "NOT FOUND")
    qv("DELETE FROM reg_periksa WHERE no_rawat='"+SCRATCH_NO+"';")
    qv("DELETE FROM billing WHERE no_rawat='"+SCRATCH_NO+"';")
    R["after_cleanup_oct"]=[l for l in qv(pred).splitlines() if l.split("\t")[0]=="2026/10"]
    R["residual_899"]=[qv("SELECT COUNT(*) FROM reg_periksa WHERE no_rawat LIKE '2026/10/05/899%';"),
                       qv("SELECT COUNT(*) FROM billing WHERE no_rawat LIKE '2026/10/05/899%';")]
    if R["oct_unbilled_under_injection"] not in ("0","",None,"NO-OCT-ROW"):
        R["verdict"]="PREDICATE CATCHES it (unbilled=%s). The R2 miss was EXTRACTION/sourcing, not the core predicate."%R["oct_unbilled_under_injection"]
    else:
        R["verdict"]="PREDICATE GAP: even a live reg-only DR visit is not flagged -> the gate's actual SQL (gate_function_text) differs from the reconstructed predicate; THAT is the root cause."
    R["status"]="ok"
else:
    R["status"]="BLOCKED"
    R["reason"]=err.strip().splitlines()[0][:200] if err else "unknown"
json.dump(R,open(out+"/a2a_gate_rootcause_%s.json"%ts,"w"),indent=1)
print("wrote a2a_gate_rootcause_%s.json"%ts)
print("status:",R.get("status"))
print("oct_unbilled_under_injection:",R.get("oct_unbilled_under_injection"))
print("residual_899:",R.get("residual_899"))
print(R.get("verdict",R.get("reason")))
PY

echo "### r3_STATUS (refresh)"
python3 - "$OUT" "$TS" <<'PY'
import json,sys,subprocess,os,glob
out,ts=sys.argv[1],sys.argv[2]
def qv(sql,db=""):
    cmd=["mysql","-uroot","-N","-B"]+([db] if db else [])+["-e",sql]
    return subprocess.run(cmd,capture_output=True,text=True).stdout.strip()
arts=sorted([os.path.basename(p) for p in glob.glob(out+"/*_%s.*"%ts) if not os.path.basename(p).startswith("r3_")])
status={
 "ts":ts,
 "completed":["B1-rest detector+snapshots","A3 full-window 12-month","A1 DR tariff seed",
             "A2-b battery contract","D1 per-rung restore","E1 claims ledger",
             "A2-a gate root cause (status: %s)"%__import__("json").load(open(out+"/a2a_gate_rootcause_%s.json"%ts)).get("status","ok"))],
 "deferred_human_gated":["B2 1000-visit sample","B3 edge strata","C1-C4 calibration",
                        "D2 cross-machine","D3 release packaging","E2 burst+2nd HMS","pharmacist review"],
 "artifacts":arts,
 "pool_mb":int(float(qv("SELECT @@innodb_buffer_pool_size;")or 0))//1048576,
 "lqt":qv("SELECT @@long_query_time;"),
 "residual_reg_899":qv("SELECT COUNT(*) FROM reg_periksa WHERE no_rawat LIKE '2026/10/05/899%';","sik"),
 "residual_billing_899":qv("SELECT COUNT(*) FROM billing WHERE no_rawat LIKE '2026/10/05/899%';","sik"),
 "dr_tariff_rows":qv("SELECT COUNT(*) FROM dr_tariff;","sik_bench"),
}
json.dump(status,open(out+"/r3_STATUS_%s.json"%ts,"w"),indent=1)
print("wrote r3_STATUS_%s.json"%ts)
print(json.dumps({k:status[k] for k in ("pool_mb","lqt","residual_reg_899","residual_billing_899","dr_tariff_rows")},indent=1))
PY
echo "=== R3 close-out v5 done $TS ==="
} > "$LOG" 2>&1
RC=$?
echo "[v5] rc=$RC"
echo "--- tail ---"
tail -25 "$LOG"
echo
echo "--- A2-a final ---"
python3 -c "
import json
d=json.load(open('$OUT/a2a_gate_rootcause_$TS.json'))
for k in ('status','oct_unbilled_under_injection','residual_899','verdict','reason'):
    if k in d: print(k,':',str(d[k])[:200])
" 2>/dev/null
echo
echo "--- state ---"
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM reg_periksa WHERE no_rawat LIKE '2026/10/05/899%';"
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM billing WHERE no_rawat LIKE '2026/10/05/899%';"
mysql -uroot -N -B -e "SELECT @@innodb_buffer_pool_size, @@long_query_time;"
systemctl is-active dr-bench; systemctl is-active p-chain
pgrep -af "r3_closeout" | grep -v grep || echo "no stray procs"
