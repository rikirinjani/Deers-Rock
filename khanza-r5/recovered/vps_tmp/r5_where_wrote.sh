set -e
cd /opt/dr-benchmark
echo "=== did the form write ANYTHING to live sik during the clone demo? (should be stable if truly isolated) ==="
echo "live sik billing count/sum NOW (compare to pre 1464593/34895128580):"
mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(totalbiaya),0) FROM sik.billing;"
echo "=== sik_r5 billing rows for the 50 fresh visits (expected 0 = form did NOT save to clone) ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik_r5.billing WHERE no_rawat LIKE '____/__/__/8_____';"
echo "=== sik_r5: were the sampled visits ever consumer-billed on the clone? (their billing rows) ==="
python3 - <<PY
import os, subprocess
def q(sql):
    p=subprocess.run(["mysql","-uroot","-N","-B","sik_r5"],input=sql,capture_output=True,text=True,env=dict(os.environ))
    return [l for l in p.stdout.split("\n") if l!=""]
tot=0
for line in open("/tmp/r5_visits50_fresh.txt"):
    v=line.strip()
    if not v: continue
    r=q("SELECT COUNT(*) FROM billing WHERE no_rawat='%s'"%v)
    n=int(r[0]) if r else 0
    tot+=n
print("total sik_r5.billing rows across the 50 fresh visits:", tot)
PY
echo "=== re-read a harness log: what DB did the form connect to? ==="
HL=$(ls /opt/dr-benchmark/results/r5_p1_demo/B3_oracle_run_r5/harness_*.log 2>/dev/null | head -1)
grep -iE "koneksi|database|error|exception|gagal|berhasil" "$HL" 2>/dev/null | head -5
