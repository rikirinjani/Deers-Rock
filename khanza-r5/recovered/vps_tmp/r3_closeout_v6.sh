#!/usr/bin/env bash
# R3 close-out v6: quote ALL sourced values (B00 etc.) in the INSERT.
set -uo pipefail
OUT=/opt/dr-benchmark/p-chain
TS=$(cat "$OUT/r3_RUN_TS")
LOG="$OUT/r3_closeout_v6_$TS.log"
{
echo "=== R3 close-out v6 start $TS ==="
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
req=["no_rawat","stts_daftar","status_lanjut","kd_pj","status_bayar","status_poli"]
src=qv("SELECT no_rawat,kd_pj,stts_daftar,status_lanjut,status_bayar,status_poli FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%' LIMIT 1;")
sp=src.split("\t")
def q(v): return "NULL" if v in ("NULL","") else "'%s'"%v
kd_pj,stts_daftar,status_lanjut,status_bayar,status_poli=sp[1],sp[2],sp[3],sp[4],sp[5]
SCRATCH_NO="2026/10/05/899105"; SCRATCH_RKM="DR099105"
cols=["no_rawat","no_rkm_medis","kd_pj","stts_daftar","status_lanjut","status_bayar","status_poli","tgl_registrasi"]
vals={"no_rawat":"'"+SCRATCH_NO+"'","no_rkm_medis":"'"+SCRATCH_RKM+"'",
      "kd_pj":q(kd_pj),"stts_daftar":q(stts_daftar),
      "status_lanjut":q(status_lanjut),"status_bayar":q(status_bayar),"status_poli":q(status_poli),
      "tgl_registrasi":"'2026-10-05 08:00:00'"}
insql="INSERT INTO reg_periksa (%s) VALUES (%s);"%(",".join(cols),",".join(vals[c] for c in cols))
rc,outp,err=qn(insql)
print("insert rc:",rc,(err.splitlines()[0][:140] if err else ""))
R={"insert_cols":cols,"insert_rc":rc,"insert_sql":insql,"sourced_from":sp[0]}
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
        R["verdict"]=(("PREDICATE CATCHES it (unbilled=%s): the R2 gate miss was EXTRACTION/sourcing, "
                      "not the core predicate; check_billed_eq_dr's predicate is sound and the failure mode is in the tool that called it."
                      )%R["oct_unbilled_under_injection"])
    else:
        R["verdict"]=("PREDICATE GAP: a live reg-only DR visit is NOT flagged by the reconstructed predicate. "
                      "The gate's actual SQL (gate_function_text) must differ (scope/join/NOT-NULL filter); "
                      "that difference is the root cause and the fix target for the A2 battery.")
    R["status"]="ok"
else:
    R["status"]="BLOCKED"; R["reason"]=err.strip().splitlines()[0][:200] if err else "unknown"
json.dump(R,open(out+"/a2a_gate_rootcause_%s.json"%ts,"w"),indent=1)
print("status:",R.get("status"))
print("oct_unbilled_under_injection:",R.get("oct_unbilled_under_injection"))
print("residual_899:",R.get("residual_899"))
print(R.get("verdict",R.get("reason","")))
PY

echo "### r3_STATUS refresh"
python3 - "$OUT" "$TS" <<'PY'
import json,sys,subprocess,os,glob
out,ts=sys.argv[1],sys.argv[2]
def qv(sql,db=""):
    cmd=["mysql","-uroot","-N","-B"]+([db] if db else [])+["-e",sql]
    return subprocess.run(cmd,capture_output=True,text=True).stdout.strip()
a2a=json.load(open(out+"/a2a_gate_rootcause_%s.json"%ts))
arts=sorted([os.path.basename(p) for p in glob.glob(out+"/*_%s.*"%ts) if not os.path.basename(p).startswith("r3_")])
status={
 "ts":ts,
 "completed":[
   "B1-rest detector+snapshots",
   "A2-a gate root cause (status=%s)"%a2a.get("status"),
   "A3 full-window 12-month",
   "A1 DR tariff seed",
   "A2-b battery contract",
   "D1 per-rung restore",
   "E1 claims ledger"],
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
PY
echo "=== R3 close-out v6 done $TS ==="
} > "$LOG" 2>&1
RC=$?
echo "[v6] rc=$RC"
echo "--- A2-a final ---"
python3 -c "
import json
d=json.load(open('$OUT/a2a_gate_rootcause_$TS.json'))
for k in ('status','sourced_from','oct_unbilled_under_injection','residual_899','verdict','reason'):
    if k in d: print(k,':',str(d[k])[:300])
" 2>/dev/null
echo
echo "--- state ---"
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM reg_periksa WHERE no_rawat LIKE '2026/10/05/899%';"
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM billing WHERE no_rawat LIKE '2026/10/05/899%';"
mysql -uroot -N -B -e "SELECT @@innodb_buffer_pool_size, @@long_query_time;"
systemctl is-active dr-bench; systemctl is-active p-chain
pgrep -af "r3_closeout" | grep -v grep || echo "no stray procs"
