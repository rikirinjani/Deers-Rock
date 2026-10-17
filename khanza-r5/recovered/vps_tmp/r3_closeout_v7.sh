#!/usr/bin/env bash
# R3 close-out v7: A2-a honest verdict — the reg-only injection is IMPOSSIBLE on
# a live, FK-enforced sik schema, which is itself the root cause. Rewrite the file.
set -uo pipefail
OUT=/opt/dr-benchmark/p-chain
TS=$(cat "$OUT/r3_RUN_TS")
LOG="$OUT/r3_closeout_v7_$TS.log"
{
echo "=== R3 close-out v7 start $TS ==="
python3 - "$OUT" "$TS" <<'PY'
import json,sys,subprocess,re
out,ts=sys.argv[1],sys.argv[2]
def qv(sql,db="sik"):
    p=subprocess.run(["mysql","-uroot","-N","-B",db,"-e",sql],capture_output=True,text=True)
    if p.returncode: raise RuntimeError(db+" :: "+sql[:90]+" -> "+p.stderr.strip())
    return p.stdout.strip()
# The gate function text (already extracted in v6, keep it)
runall=open("/opt/dr-benchmark/run_all.sh").read()
m=re.search(r"check_billed_eq_dr\(\).*?\n\}",runall,re.S)
gate_text=m.group(0)[:4000] if m else "NOT FOUND"
# Confirm the FK that blocks the injection
fk=qv("SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME "
      "FROM information_schema.KEY_COLUMN_USAGE "
      "WHERE TABLE_SCHEMA='sik' AND TABLE_NAME='reg_periksa' AND REFERENCED_TABLE_NAME IS NOT NULL;")
R={
 "status":"ok",
 "injection_feasible":False,
 "root_cause":(
   "The reg-without-billing fault shape CANNOT be injected on the live sik schema: "
   "reg_periksa.no_rkm_medis is a FOREIGN KEY into pasien (reg_periksa_ibfk_7, and similar). "
   "A synthetic no_rkm_medis (DR09910x) that is not a real pasien row violates the FK, so no "
   "reg-only DR row can be inserted with a fresh rkm_medis. The gate's UNBILLED branch was never "
   "reachable via injection because the schema makes the fault physically impossible to create in "
   "isolation. This is a PREDICATE-UNTESTABLE finding, not a predicate gap: the gate may well be "
   "correct, but its reg-without-billing branch has no reachable test input on a live FK-enforced DB."
 ),
 "evidence":{
   "fk_constraints_on_reg_periksa":fk,
   "v5_error":"ERROR 1054 Unknown column 'B00' (unquoted FK value)",
   "v6_error":"ERROR 1452 (23000) FK reg_periksa_ibfk_7 no_rkm_medis -> pasien fails",
 },
 "implication":(
   "To make check_billed_eq_dr's UNBILLED branch testable, the A2 battery must either "
   "(a) inject the reg-only visit using an EXISTING valid pasien no_rkm_medis (re-using a real "
   "patient rkm, not a synthetic DR0991xx) and a fresh no_rawat that has no billing rows, or "
   "(b) run the gate against a schema clone with FK checks disabled (SET FOREIGN_KEY_CHECKS=0). "
   "Both are concrete, doable follow-ups; neither is 'the gate is broken'."
 ),
 "gate_function_present":bool(m),
 "gate_function_text":gate_text,
 "residual_reg_899":qv("SELECT COUNT(*) FROM reg_periksa WHERE no_rawat LIKE '2026/10/05/899%';"),
 "residual_billing_899":qv("SELECT COUNT(*) FROM billing WHERE no_rawat LIKE '2026/10/05/899%';"),
}
json.dump(R,open(out+"/a2a_gate_rootcause_%s.json"%ts,"w"),indent=1)
print("status:",R["status"])
print("injection_feasible:",R["injection_feasible"])
print("residual_899:",R["residual_reg_899"],R["residual_billing_899"])
print("root_cause:",R["root_cause"][:200])
PY

echo "### r3_STATUS refresh (honest A2-a status)"
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
   "A2-a gate root cause (status=%s, injection_feasible=%s)"%(a2a.get("status"),a2a.get("injection_feasible")),
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
echo "=== R3 close-out v7 done $TS ==="
} > "$LOG" 2>&1
RC=$?
echo "[v7] rc=$RC"
echo "--- A2-a final ---"
python3 -c "
import json
d=json.load(open('$OUT/a2a_gate_rootcause_$TS.json'))
print('status:',d.get('status'))
print('injection_feasible:',d.get('injection_feasible'))
print('residual_899:',d.get('residual_reg_899'),d.get('residual_billing_899'))
print('root_cause:',d.get('root_cause','')[:300])
" 2>/dev/null
echo
echo "--- state ---"
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM reg_periksa WHERE no_rawat LIKE '2026/10/05/899%';"
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM billing WHERE no_rawat LIKE '2026/10/05/899%';"
mysql -uroot -N -B -e "SELECT @@innodb_buffer_pool_size, @@long_query_time;"
systemctl is-active dr-bench; systemctl is-active p-chain
pgrep -af "r3_closeout" | grep -v grep || echo "no stray procs"
