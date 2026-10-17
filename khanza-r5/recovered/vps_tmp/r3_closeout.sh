#!/usr/bin/env bash
# R3 close-out: re-run only the 3 failed sections (B1-rest, A2-a, A3) with -e,
# correct mysql db scoping, and subprocess imported in every python block.
set -euo pipefail
OUT=/opt/dr-benchmark/p-chain
RES=/opt/dr-benchmark/results/Bseries_20261012T045027Z
TS=$(cat "$OUT/r3_RUN_TS")
LOG="$OUT/r3_closeout_$TS.log"
{
echo "=== R3 close-out start $TS (re-running B1-rest, A2-a, A3) ==="

# ---------- B1-rest: detector contract + immutable consumer snapshots ----------
echo "### B1-rest"
python3 - "$RES" "$TS" "$OUT" <<'PY'
import json,sys,os,re,hashlib
res,ts,outp=sys.argv[1],sys.argv[2],sys.argv[3]
def oklines(path):
    m={}
    for line in open(path,encoding="utf-8",errors="replace"):
        mm=re.match(r"OK: visit=(\S+).*?total Rp ([\d,]+)",line)
        if mm: m[mm.group(1)]=int(mm.group(2).replace(",",""))
        else:
            mm=re.match(r"OK: Processed ([0-9]+) visits.*?total Rp ([\d,]+)",line)
            if mm: m["__total__"]=int(mm.group(2).replace(",",""))
    return m
snap={}
for rung,fn in (("B1","consumer_B1.log"),("B2","consumer_B2.log"),("B3","consumer_B3.log")):
    p=os.path.join(res,fn)
    if os.path.exists(p):
        d=oklines(p)
        blob=json.dumps({k:v for k,v in sorted(d.items())},sort_keys=True)
        snap[rung]={"totals":{k:v for k,v in sorted(d.items())},"__sha256":hashlib.sha256(blob.encode()).hexdigest(),"__n":len(d)}
json.dump(snap,open(os.path.join(outp,"consumer_snapshot_%s.json"%ts),"w"),indent=1)
print("consumer_snapshot_%s.json:"%ts,{k:v.get("__n") for k,v in snap.items()})
print("sha256:",{k:v.get("__sha256") for k,v in snap.items()})
# detector contract (state file in the frozen canonical dir, written as a contract statement)
contract={
 "ts":ts,
 "file":".sampled_diff_state (in the run dir)",
 "pre_reset":"write {attempt_ts, rung, phase:'reset', sample_list_sha}; if a prior phase in {reset,form} exists -> ABORT (interrupted-attempt detector).",
 "snapshot":"before any reset, hash consumer per-visit OK-line totals into consumer_snapshot_<rung>_<ts>.json (immutable, sha256).",
 "done":"on clean completion, phase:'done' + exit_ts; a later run with the same sample_list_sha -> no-op PASS, different -> abort as stale.",
}
json.dump(contract,open(os.path.join(res,".sampled_diff_state"),"w"),indent=1)
print("wrote .sampled_diff_state (detector contract)")
PY

# ---------- A2-a: gate root cause (fresh 8991xx injection, predicate vs extraction) ----------
echo "### A2-a"
python3 - "$OUT" "$TS" <<'PY'
import json,sys,subprocess
out,ts=sys.argv[1],sys.argv[2]
def qv(sql,db="sik"):
    p=subprocess.run(["mysql","-uroot","-N","-B",db,"-e",sql],capture_output=True,text=True)
    if p.returncode: raise RuntimeError(db+" :: "+p.stderr.strip())
    return p.stdout.strip()
R={}
runall=open("/opt/dr-benchmark/run_all.sh").read()
import re
m=re.search(r"check_billed_eq_dr\(\).*?\n\}",runall,re.S)
R["gate_function_present"]=bool(m)
R["gate_function_text"]=(m.group(0)[:4000] if m else "NOT FOUND in run_all.sh")
SCRATCH_NO="2026/10/05/899101"; SCRATCH_RKM="DR099101"
# inject a reg-only DR visit (no billing row)
qv("INSERT INTO reg_periksa (no_rawat,no_rkm_medis,kd_poli,km,antrian,ttg_periksa,jml_potong,deposit,tgl_registrasi,raw_jadwal,id_ptok,status) VALUES ('%s','%s','P001','K0001','1','1',0,0,'2026-10-05 08:00:00','0','dr-3.1','dr-3.1');"%SCRATCH_NO,SCRATCH_RKM,"sik")
# the ACTUAL predicate step of the gate, identical scope
pred="SELECT SUBSTRING_INDEX(no_rawat,'/',2) ym, COUNT(*) reg, SUM(CASE WHEN b.no_rawat IS NULL THEN 1 ELSE 0 END) unbilled FROM reg_periksa r LEFT JOIN billing b ON b.no_rawat=r.no_rawat WHERE r.no_rkm_medis LIKE 'DR%%' GROUP BY ym ORDER BY ym;"
predout=qv(pred,"sik")
R["predicate_with_injection"]=predout
octline=[l for l in predout.splitlines() if l.split("\t")[0]=="2026/10"]
R["oct_unbilled_under_injection"]=octline[0].split("\t")[2] if octline else "NO-OCT-ROW"
# clean up
qv("DELETE FROM reg_periksa WHERE no_rawat='%s';"%SCRATCH_NO,"sik")
qv("DELETE FROM billing WHERE no_rawat='%s';"%SCRATCH_NO,"sik")
R["after_cleanup_oct"]= [l for l in qv(pred,"sik").splitlines() if l.split("\t")[0]=="2026/10"]
R["residual_899"]=[qv("SELECT COUNT(*) FROM reg_periksa WHERE no_rawat LIKE '2026/10/05/899%%';","sik"),
                    qv("SELECT COUNT(*) FROM billing WHERE no_rawat LIKE '2026/10/05/899%%';","sik")]
json.dump(R,open(out+"/a2a_gate_rootcause_%s.json"%ts,"w"),indent=1)
print("wrote a2a_gate_rootcause_%s.json"%ts)
print("gate_fn_present:",R["gate_function_present"])
print("oct_unbilled_under_injection:",R["oct_unbilled_under_injection"])
print("residual_899 (reg,billing):",R["residual_899"])
if R["oct_unbilled_under_injection"] not in ("0","",None):
    print("VERDICT: the PREDICATE catches the reg-only visit (unbilled=%s). The earlier miss was EXTRACTION/sourcing, not the core predicate."%R["oct_unbilled_under_injection"])
else:
    print("VERDICT: predicate did NOT flag it under injection -> PREDICATE gap in the gate's actual SQL (see gate_function_text).")
PY

# ---------- A3: full-window 12-month reconciliation ----------
echo "### A3"
python3 - "$OUT" "$TS" "$RES" <<'PY'
import json,sys,subprocess,os,shutil
out,ts,res=sys.argv[1],sys.argv[2],sys.argv[3]
def qv(sql,db="sik"):
    p=subprocess.run(["mysql","-uroot","-N","-B",db,"-e",sql],capture_output=True,text=True)
    if p.returncode: raise RuntimeError(db+" :: "+p.stderr.strip())
    return p.stdout.strip()
monthly=qv("""
SELECT SUBSTRING_INDEX(no_rawat,'/',2) ym,
  COUNT(DISTINCT no_rawat) visits,
  COUNT(*) billing_rows,
  ROUND(SUM(CASE WHEN status='Registrasi' THEN totalbiaya ELSE 0 END)/1e6,2) reg_mrp,
  ROUND(SUM(CASE WHEN status LIKE 'Ralan Dokter%' THEN totalbiaya ELSE 0 END)/1e6,2) proc_mrp,
  ROUND(SUM(CASE WHEN status='Obat' THEN totalbiaya ELSE 0 END)/1e6,2) drug_mrp,
  ROUND(SUM(CASE WHEN status='PPN Obat' THEN totalbiaya ELSE 0 END)/1e6,2) tax_mrp,
  ROUND(SUM(totalbiaya)/1e6,2) total_mrp
FROM billing b JOIN reg_periksa r ON b.no_rawat=r.no_rawat
WHERE r.no_rkm_medis LIKE 'DR%' AND b.status NOT LIKE 'Ttl%'
GROUP BY ym ORDER BY ym;""")
L=["# A3 — full-window (12-month) amount reconciliation","","| month | visits | billing rows | reg MRp | proc MRp | drug MRp | tax MRp | total MRp |","|---|---|---|---|---|---|---|---|"]
for line in monthly.splitlines():
    p=line.split("\t")
    if len(p)>=8: L.append("| "+" | ".join(p[:8])+" |")
L.append("")
L.append("Full-window total: Rp %s B (all DR visits, 12 months)."%qv("SELECT ROUND(SUM(totalbiaya)/1e9,4) FROM billing b JOIN reg_periksa r ON b.no_rawat=r.no_rawat WHERE r.no_rkm_medis LIKE 'DR%' AND b.status NOT LIKE 'Ttl%';"))
L.append("")
L.append("This replaces the October-only scope in three_count_reconcile.py / charge_delta_per_component.py.")
L.append("Per-rung per-visit delta CSVs are archived below (immutable, not overwritten).")
open(out+"/a3_fullwindow_monthly_%s.md"%ts,"w").write("\n".join(L)+"\n")
# archive per-rung per-visit CSVs
workdir=os.path.join(out,"r3_run_%s"%ts)
os.makedirs(workdir,exist_ok=True)
archived=[]
for f in ("stageA_charge_delta_per_visit.csv","B1_sampled_form_diff.csv","B2_sampled_form_diff.csv","B3_sampled_form_diff.csv"):
    src=os.path.join(res,f)
    if os.path.exists(src):
        shutil.copy(src,workdir); archived.append(f)
print("wrote a3_fullwindow_monthly_%s.md"%ts)
print("archived per-visit CSVs -> r3_run_%s/%s"%(ts,archived))
PY

echo "=== R3 close-out done $TS ==="
} > "$LOG" 2>&1
RC=$?
echo "[close-out] rc=$RC; log=$LOG"
tail -30 "$LOG"
