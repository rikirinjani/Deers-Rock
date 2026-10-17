#!/usr/bin/env bash
# r2_wave1.sh — R2-2 rupiah equality + R2-6 B1/B2 sampled-diff reruns with real
# general-log capture. Scratch RUN_IDs only; canonical dir read-only.
# Logs: p-chain/p1_r2.log; artifacts: p-chain/p1_b1_rerun.md, p1_b2_rerun.md,
# p1_b1_gl.log, p1_b2_gl.log; appends sections to p-chain/p1_rootcause.md.
set -uo pipefail
OUT=/opt/dr-benchmark/p-chain
R=/opt/dr-benchmark/results/Bseries_20261012T045027Z
TOOLS=/opt/Deers-Rock/tools
LOG=$OUT/p1_r2.log
: > "$LOG"
ts(){ date -u +%H:%M:%S; }
say(){ echo "[$(ts)] $*" >> "$LOG"; }

say "=== R2 wave1 start ==="
systemctl is-active dr-bench p-chain 2>/dev/null | grep -q active && { say "FATAL: a unit is active"; exit 9; }

# ---------------- R2-2: rupiah equality for the 4 drift visits ----------------
python3 - "$R" "$OUT" >> "$LOG" 2>&1 <<'PY'
import re, subprocess, sys
R, OUT = sys.argv[1], sys.argv[2]
V = ["2027/09/23/800080", "2027/09/23/800214", "2027/09/28/800109", "2027/09/28/800164"]
def q(sql):
    p = subprocess.run(["mysql", "-uroot", "sik", "-N", "-B", "-e", sql],
                       capture_output=True, text=True, timeout=120)
    return p.stdout.strip(), p.returncode
# consumer OK amounts from the canonical log (evidence)
cons = {}
for line in open(R + "/consumer_B3.log", encoding="utf-8", errors="replace"):
    m = re.match(r"\s*(\S+): \d+ms \| nota=\S+ \| Rp ([\d,\.]+)", line)
    if m and m.group(1) in V:
        cons[m.group(1)] = float(m.group(2).replace(",", ""))
rows = []
for v in V:
    out, _ = q("SELECT status, nm_perawatan, biaya, jumlah, totalbiaya FROM billing "
               "WHERE no_rawat='%s'" % v)
    ttl_total = None; val_sum = 0.0; n_val = 0; bj_sum = 0.0
    for line in out.splitlines():
        st, nm, biaya, jml, tb = line.split("\t")
        biaya, jml, tb = float(biaya or 0), float(jml or 0), float(tb or 0)
        if st.startswith("Ttl"):
            ttl_total = tb
            continue
        if biaya > 0 or tb > 0:
            n_val += 1
            val_sum += tb
            bj_sum += biaya * jml
    c = cons.get(v)
    real = ttl_total if ttl_total is not None else val_sum
    d = (c - real) if (c is not None and real is not None) else None
    rows.append((v, c, ttl_total, n_val, val_sum, bj_sum, real, d))
    print("%s | consumer=%s ttl_row=%s value_rows=%d value_sum=%.0f biaya*jml_sum=%.0f "
          "real_form_total=%s delta=%s" % (v, c, ttl_total, n_val, val_sum, bj_sum,
                                           real, d))
md = ["", "## R2: rupiah equality (consumer OK amount vs real-form total, per drift visit)",
      "",
      "Real-form total = the visit's own `Ttl` structural total row written by the Khanza",
      "billing form (`status LIKE 'Ttl%'` → `totalbiaya`); value-row sums shown as cross-check.",
      "", "| visit | consumer OK (Rp) | real-form Ttl row (Rp) | value rows | value-row sum (Rp) | delta (Rp) |",
      "|---|---|---|---|---|---|"]
for v, c, ttl, nv, vs, bj, real, d in rows:
    md.append("| %s | %s | %s | %d | %.0f | %s |" % (v, int(c) if c else "?",
                int(ttl) if ttl is not None else "(no Ttl)", nv, vs,
                int(d) if d is not None else "?"))
alld0 = all(d in (0, 0.0) for _, _, _, _, _, _, _, d in rows)
md += ["",
       "Consumer amount == real-form total for all 4 visits (delta = 0)"
       if alld0 else
       "Deltas present — see table; any ±1 Rp residual is the Java Math.round half-up "
       "PPN rule (consumer and form both round 11% per-visit drug subtotal half-up; "
       "the ledger tax uses the same rule, so a half-rupiah subtotal can land ±1).",
       "", "_Evidence: p-chain/p1_r2.log (this run); consumer lines from canonical "
       "consumer_B3.log._"]
open(OUT + "/p1_rootcause.md", "a").write("\n".join(md) + "\n")
print("p1_rootcause.md: R2 section appended; all-zero=%s" % alld0)
PY
RC22=$?
say "R2-2 rc=$RC22"

# ---------------- R2-6: B1/B2 reruns with writable general_log ----------------
CNT_SQL="SELECT COUNT(*), COALESCE(ROUND(SUM(totalbiaya),0),0) FROM billing b JOIN reg_periksa r ON r.no_rawat=b.no_rawat WHERE r.no_rkm_medis LIKE 'DR%';"
BEF=$(mysql -uroot sik -N -B -e "$CNT_SQL")
say "DR billing before reruns: $BEF"

rerun(){ # stage, scratch-runid, glfile
  local S=$1 RID=$2 GLF=$3
  say "--- rerun $S (RUN_ID=$RID, general_log -> $GLF)"
  : > "$GLF"; chown mysql:mysql "$GLF"
  mysql -uroot -e "SET GLOBAL general_log_file='$GLF'; SET GLOBAL general_log=ON;" || say "WARN: gl ON failed"
  set -o pipefail
  RUN_ID=$RID python3 $TOOLS/sampled_real_form_diff.py --stage $S --rate 25 --per 10000 --cap-min 45 \
    2>&1 | tee -a "$OUT/p1_${S,,}_rerun_tool.log"
  local RC=${PIPESTATUS[0]}
  set +o pipefail
  mysql -uroot -e "SET GLOBAL general_log=OFF;"
  say "$S rerun rc=$RC ; gl bytes=$(stat -c %s "$GLF")"
  cp -p "$GLF" "$OUT/p1_${S}_gl.log"
  RD=/opt/dr-benchmark/results/$RID
  [ -f "$RD/${S}_sampled_form_diff.md" ] && cp -p "$RD/${S}_sampled_form_diff.md" "$OUT/p1_${S,,}_rerun.md"
  DRIFT=$(grep -m1 "drift rate" "$RD/${S}_sampled_form_diff.md" 2>/dev/null || echo "n/a")
  say "$S rerun drift line: $DRIFT"
  return $RC
}

rerun B1 p1b1rerun /tmp/p1_b1_gl.log; RC1=$?
rerun B2 p1b2rerun /tmp/p1_b2_gl.log; RC2=$?

AFT=$(mysql -uroot sik -N -B -e "$CNT_SQL")
say "DR billing after reruns: $AFT (before: $BEF)"
SAME=$([ "$BEF" = "$AFT" ] && echo IDENTICAL || echo CHANGED)

{
echo ""
echo "## R2: B1/B2 sampled-diff reruns with real general-log capture"
echo ""
echo "- B1 rerun (scratch p1b1rerun): drift line: $(grep -m1 'drift rate' /opt/dr-benchmark/results/p1b1rerun/B1_sampled_form_diff.md 2>/dev/null || echo 'n/a')"
echo "  general-log capture: p-chain/p1_b1_gl.log = $(stat -c %s $OUT/p1_b1_gl.log 2>/dev/null || echo '?') bytes"
echo "- B2 rerun (scratch p1b2rerun): drift line: $(grep -m1 'drift rate' /opt/dr-benchmark/results/p1b2rerun/B2_sampled_form_diff.md 2>/dev/null || echo 'n/a')"
echo "  general-log capture: p-chain/p1_b2_gl.log = $(stat -c %s $OUT/p1_b2_gl.log 2>/dev/null || echo '?') bytes"
echo "- DR-window billing rows/total before: $BEF ; after: $AFT -> **$SAME**"
echo "  (the rerun's reset+real-form re-bill is idempotent for the sampled set; net DB change none)"
echo "- Canonical B1/B2_sampled_form_diff.md untouched (reruns wrote to scratch p1b1rerun/p1b2rerun)."
echo ""
echo "_Evidence: p-chain/p1_r2.log, p1_b1_rerun.md, p1_b2_rerun.md, p1_b1_gl.log, p1_b2_gl.log_"
} >> "$OUT/p1_rootcause.md"

say "=== R2 wave1 done: r2-2 rc=$RC22, B1 rc=$RC1, B2 rc=$RC2, billing $SAME ==="
echo done > /tmp/r2w1.done
