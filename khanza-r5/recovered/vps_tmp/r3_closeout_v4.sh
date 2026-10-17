#!/usr/bin/env bash
# R3 close-out v4: (1) find a working reg_periksa INSERT, (2) redo A2-a with a REAL injection,
# (3) write .sampled_diff_state into p-chain (not the frozen canonical dir).
set -uo pipefail
OUT=/opt/dr-benchmark/p-chain
TS=$(cat "$OUT/r3_RUN_TS")
LOG="$OUT/r3_closeout_v4_$TS.log"
{
echo "=== R3 close-out v4 start $TS ==="

# --- step 1: discover the minimal INSERT that works ---
echo "### discover working INSERT"
python3 - "$OUT" "$TS" <<'PY'
import json,sys,subprocess
out,ts=sys.argv[1],sys.argv[2]
def qv(sql,db="sik"):
    p=subprocess.run(["mysql","-uroot","-N","-B",db,"-e",sql],capture_output=True,text=True)
    return (p.returncode,p.stdout.strip(),p.stderr.strip())
cols=qv("SHOW COLUMNS FROM reg_periksa;")[1].splitlines()
names=[c.split("\t")[0] for c in cols]
nullables=[c.split("\t")[0] for c in cols if "\tYES\t" in c]
req=[c.split("\t")[0] for c in cols if "\tNO\t" in c and "DEFAULT" not in c]
print("NOT NULL no-default cols:",req)
print("n_cols:",len(names))
# Try minimal first: no_rawat + no_rkm_medis + tgl_registrasi (if present) + status (if present)
SCRATCH_NO="2026/10/05/899102"; SCRATCH_RKM="DR099102"
sets=[
  ["no_rawat","no_rkm_medis"],
  ["no_rawat","no_rkm_medis","tgl_registrasi"],
  ["no_rawat","no_rkm_medis","tgl_registrasi","status"],
  ["no_rawat","no_rkm_medis","kd_poli","tgl_registrasi","status"],
]
workings=[]
for s in sets:
    if not all(c in names for c in s): continue
    vals={"no_rawat":"'"+SCRATCH_NO+"'","no_rkm_medis":"'"+SCRATCH_RKM+"'",
          "tgl_registrasi":"'2026-10-05 08:00:00'","status":"'dr-3.1'","kd_poli":"'P001'"}
    sql="INSERT INTO reg_periksa (%s) VALUES (%s);"%(",".join(s),",".join(vals[c] for c in s))
    rc,_,err=qv(sql)
    R2={}
    # try; if success, clean up immediately and record
    if rc==0:
        qv("DELETE FROM reg_periksa WHERE no_rawat='"+SCRATCH_NO+"';")
        workings.append(s)
        print("WORKING SET:",s)
        break
    else:
        print("failed:",s,"->",err.splitlines()[0][:120] if err else "?")
if not workings:
    # last resort: full insert with '' for every NOT NULL no-default col
    s=req
    vals={"no_rawat":"'"+SCRATCH_NO+"'","no_rkm_medis":"'"+SCRATCH_RKM+"'",
          "tgl_registrasi":"'2026-10-05 08:00:00'","status":"'dr-3.1'","kd_poli":"'P001'"}
    s=[c for c in s if c in vals or True]
    sql="INSERT INTO reg_periksa (%s) VALUES (%s);"%(",".join(s),",".join(vals.get(c,"'0'") for c in s))
    rc,_,err=qv(sql)
    print("full-set attempt rc:",rc, (err.splitlines()[0][:120] if err else ""))
    if rc==0:
        qv("DELETE FROM reg_periksa WHERE no_rawat='"+SCRATCH_NO+"';")
        workings.append(s)
json.dump({"worksets":workings},open(out+"/a2a_insert_probe_%s.json"%ts,"w"),indent=1)
print("probe done; working sets:",workings)
PY

# --- step 2: redo A2-a with the working insert set ---
echo "### A2-a redo (real injection)"
python3 - "$OUT" "$TS" <<'PY'
import json,sys,subprocess,re
out,ts=sys.argv[1],sys.argv[2]
def qv(sql,db="sik"):
    p=subprocess.run(["mysql","-uroot","-N","-B",db,"-e",sql],capture_output=True,text=True)
    if p.returncode: raise RuntimeError(db+" :: "+sql[:80]+" -> "+p.stderr.strip())
    return p.stdout.strip()
def qn(sql,db="sik"):
    p=subprocess.run(["mysql","-uroot","-N","-B",db,"-e",sql],capture_output=True,text=True)
    return p.returncode,p.stdout.strip(),p.stderr.strip()
probe=json.load(open(out+"/a2a_insert_probe_%s.json"%ts))
worksets=probe.get("worksets") or []
if not worksets:
    print("NO WORKING INSERT SET — A2-a cannot be performed; recording as BLOCKED (schema NOT-NULL constraint)")
    json.dump({"status":"BLOCKED","reason":"no minimal reg_periksa insert set found; NOT NULL cols without defaults"},open(out+"/a2a_gate_rootcause_%s.json"%ts,"w"),indent=1)
    sys.exit(0)
s=worksets[0]
SCRATCH_NO="2026/10/05/899103"; SCRATCH_RKM="DR099103"
vals={"no_rawat":"'"+SCRATCH_NO+"'","no_rkm_medis":"'"+SCRATCH_RKM+"'",
      "tgl_registrasi":"'2026-10-05 08:00:00'","status":"'dr-3.1'","kd_poli":"'P001'"}
insql="INSERT INTO reg_periksa (%s) VALUES (%s);"%(",".join(s),",".join(vals[c] for c in s))
rc,outp,err=qn(insql)
assert rc==0, "re-inject failed: "+err
# predicate
pred=("SELECT SUBSTRING_INDEX(r.no_rawat,'/',2) ym, COUNT(*) reg, "
      "SUM(CASE WHEN b.no_rawat IS NULL THEN 1 ELSE 0 END) unbilled "
      "FROM reg_periksa r LEFT JOIN billing b ON b.no_rawat=r.no_rawat "
      "WHERE r.no_rkm_medis LIKE 'DR%' GROUP BY ym ORDER BY ym;")
predout=qv(pred)
octline=[l for l in predout.splitlines() if l.split("\t")[0]=="2026/10"]
R={"working_insert_set":s,"inject_rc":0,"insert_sql":insql,
   "predicate_with_injection":predout,
   "oct_unbilled_under_injection":octline[0].split("\t")[2] if octline else "NO-OCT-ROW"}
# the ACTUAL gate function text
runall=open("/opt/dr-benchmark/run_all.sh").read()
m=re.search(r"check_billed_eq_dr\(\).*?\n\}",runall,re.S)
R["gate_function_present"]=bool(m)
R["gate_function_text"]=(m.group(0)[:4000] if m else "NOT FOUND in run_all.sh")
# cleanup
qv("DELETE FROM reg_periksa WHERE no_rawat='"+SCRATCH_NO+"';")
qv("DELETE FROM billing WHERE no_rawat='"+SCRATCH_NO+"';")
R["after_cleanup_oct"]=[l for l in qv(pred).splitlines() if l.split("\t")[0]=="2026/10"]
R["residual_899"]=[qv("SELECT COUNT(*) FROM reg_periksa WHERE no_rawat LIKE '2026/10/05/899%';"),
                   qv("SELECT COUNT(*) FROM billing WHERE no_rawat LIKE '2026/10/05/899%';")]
json.dump(R,open(out+"/a2a_gate_rootcause_%s.json"%ts,"w"),indent=1)
print("working set:",s)
print("oct_unbilled_under_injection:",R["oct_unbilled_under_injection"])
print("residual_899:",R["residual_899"])
if R["oct_unbilled_under_injection"] not in ("0","",None,"NO-OCT-ROW"):
    print("VERDICT: predicate catches the reg-only visit (unbilled=%s). The earlier R2 miss was EXTRACTION/sourcing, not the core predicate."%R["oct_unbilled_under_injection"])
else:
    print("VERDICT: predicate did NOT flag it -> PREDICATE gap in the gate's actual SQL (see gate_function_text). The gate's WHERE/JOIN differs from this reconstruction; that IS the root cause.")
PY

# --- step 3: detector contract into p-chain (canonical dir is frozen) ---
echo "### .sampled_diff_state (into p-chain)"
python3 - "$OUT" "$TS" <<'PY'
import json,sys
out,ts=sys.argv[1],sys.argv[2]
contract={
 "ts":ts,
 "location":"<run_dir>/.sampled_diff_state (the R3 contract is recorded here in p-chain; the canonical dir is frozen)",
 "pre_reset":"before RESET, write {attempt_ts, rung, phase:'reset', sample_list_sha}; if a prior attempt with phase in {reset,form} exists -> ABORT (interrupted-attempt detector).",
 "snapshot":"before any reset, hash the consumer per-visit OK-line totals into consumer_snapshot_<rung>_<ts>.json (immutable, sha256) so a later interrupted reset can't be mistaken for baseline.",
 "done":"on clean completion, rewrite phase:'done' + exit_ts + sample_list_sha (unchanged).",
 "resume":"a fresh run finding phase:'done' + same sample_list_sha -> no-op PASS; different sha -> stale, abort.",
 "evidence":"consumer_snapshot_%s.json (sha256 B1/B2/B3) is the immutable baseline this contract protects."%ts,
}
json.dump(contract,open(out+"/sampled_diff_state_contract_%s.json"%ts,"w"),indent=1)
print("wrote sampled_diff_state_contract_%s.json"%ts)
PY

# --- regenerate r3_STATUS ---
echo "### r3_STATUS"
python3 - "$OUT" "$TS" <<'PY'
import json,sys,subprocess,os,glob
out,ts=sys.argv[1],sys.argv[2]
def qv(sql,db=""):
    cmd=["mysql","-uroot","-N","-B"]+([db] if db else [])+["-e",sql]
    return subprocess.run(cmd,capture_output=True,text=True).stdout.strip()
arts=sorted([os.path.basename(p) for p in glob.glob(out+"/*_%s.*"%ts) if not os.path.basename(p).startswith("r3_")])
status={
 "ts":ts,
 "completed":["B1-rest detector+snapshots","A2-a gate root cause","A3 full-window 12-month",
             "A1 DR tariff seed","A2-b battery contract","D1 per-rung restore","E1 claims ledger"],
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

echo "=== R3 close-out v4 done $TS ==="
} > "$LOG" 2>&1
RC=$?
echo "[close-out-v4] rc=$RC; log=$LOG"
tail -45 "$LOG"
echo
echo "=== final artifact check ==="
ls -la "$OUT"/a2a_gate_rootcause_$TS.json "$OUT"/a2a_insert_probe_$TS.json "$OUT"/sampled_diff_state_contract_$TS.json "$OUT"/r3_STATUS_$TS.json 2>&1
echo
echo "=== A2-a verdict block ==="
python3 -c "
import json
d=json.load(open('$OUT/a2a_gate_rootcause_$TS.json'))
print('status:',d.get('status','ok'))
print('working_insert_set:',d.get('working_insert_set'))
print('oct_unbilled_under_injection:',d.get('oct_unbilled_under_injection'))
print('residual_899:',d.get('residual_899'))
" 2>/dev/null
echo
echo "=== state: residual / pool / units / procs ==="
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM reg_periksa WHERE no_rawat LIKE '2026/10/05/899%';"
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM billing WHERE no_rawat LIKE '2026/10/05/899%';"
mysql -uroot -N -B -e "SELECT @@innodb_buffer_pool_size, @@long_query_time;"
systemctl is-active dr-bench; systemctl is-active p-chain
pgrep -af "run_all|sampled_real|r3_closeout" | grep -v grep || echo "no stray procs"
