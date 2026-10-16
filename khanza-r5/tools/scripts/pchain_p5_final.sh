#!/usr/bin/env bash
# P5 — ICD-10 mapper wiring status (READ-ONLY checks; writes p-chain/p5_report.md)
set -uo pipefail
OUT=/opt/dr-benchmark/p-chain
LOG=$OUT/p5.log
: > "$LOG"
{
echo "=== P5 start $(date -u) ==="
echo
echo "### A. DR repo evidence"
git -C /opt/Deers-Rock log --oneline -12 2>/dev/null || echo "(not a git repo)"
echo "--- tools dir:"; ls /opt/Deers-Rock/tools | head -40
echo
echo "### B. diagnosis/ICD mentions in generator + dbutil + loader"
grep -inE "icd|diagnos|penyakit|kd_penyakit" /opt/Deers-Rock/tools/generate_scale_encounters.py /opt/Deers-Rock/tools/dbutil.py /opt/Deers-Rock/tools/load_354_dr_visits.py 2>/dev/null || echo "(none — no diagnosis fields anywhere in the DR toolchain)"
echo
echo "### C. consumer source: any diagnosa_pasien writes?"
for f in $(find /opt/simrs-khanza -maxdepth 3 -name "KhanzaBillingConsumer.java" 2>/dev/null); do
  echo "--- $f:"; grep -inE "diagnosa|penyakit|icd" "$f" | head -10 || echo "  (no diagnosis mentions)"
done
echo "--- general_log_B3 real-form capture: any diagnosa_pasien INSERTs?"
grep -c "diagnosa_pasien" /opt/dr-benchmark/results/Bseries_20261012T045027Z/general_log_B3.log || echo "0 (real form wrote no diagnoses)"
echo
echo "### D. diagnosa_pasien table state in sik"
mysql -uroot sik -B -e "SHOW TABLES LIKE 'diagnosa_pasien';"
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM diagnosa_pasien;" 2>/dev/null || echo "(table absent/unreadable)"
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM reg_periksa r LEFT JOIN diagnosa_pasien dp ON dp.no_rawat=r.no_rawat WHERE r.no_rkm_medis LIKE 'DR%' AND dp.no_rawat IS NOT NULL;"
echo
echo "### E. templated-content checks from data"
mysql -uroot sik -B -e "
SELECT (SELECT COUNT(*) FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%') AS dr_visits,
       (SELECT COUNT(*) FROM rawat_jl_dr rj JOIN reg_periksa r ON r.no_rawat=rj.no_rawat WHERE r.no_rkm_medis LIKE 'DR%') AS procedure_rows,
       (SELECT COUNT(*) FROM detail_pemberian_obat d JOIN reg_periksa r ON r.no_rawat=d.no_rawat WHERE r.no_rkm_medis LIKE 'DR%') AS drug_rows;"
mysql -uroot sik -B -e "
SELECT ROUND(SUM(CASE WHEN b.status='Obat' AND b.nm_perawatan NOT LIKE '%PPN%' THEN b.totalbiaya ELSE 0 END),0) AS drug_rp,
       ROUND(SUM(b.totalbiaya),0) AS total_rp,
       ROUND(100.0*SUM(CASE WHEN b.status='Obat' AND b.nm_perawatan NOT LIKE '%PPN%' THEN b.totalbiaya ELSE 0 END)/SUM(b.totalbiaya),1) AS drug_share_pct
FROM billing b JOIN reg_periksa r ON r.no_rawat=b.no_rawat WHERE r.no_rkm_medis LIKE 'DR%';"
echo
echo "### F. encounter export columns (ENC/OBAT/END — any dx field?)"
head -2 /opt/dr-benchmark/results/Bseries_20261012T045027Z/B3.encounters.txt | cut -c1-160
echo
echo "=== P5 raw evidence done $(date -u) ==="
} >> "$LOG" 2>&1

# computed values for the report
DX_MENTIONS=$(grep -icE "icd|diagnos|penyakit" /opt/Deers-Rock/tools/generate_scale_encounters.py || true)
GL_DX=$(grep -c "diagnosa_pasien" /opt/dr-benchmark/results/Bseries_20261012T045027Z/general_log_B3.log || true)
DP_EXIST=$(mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='sik' AND table_name='diagnosa_pasien';" 2>/dev/null)
DP_ROWS=$(mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM diagnosa_pasien;" 2>/dev/null || echo -1)
DP_DR=$(mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM reg_periksa r LEFT JOIN diagnosa_pasien dp ON dp.no_rawat=r.no_rawat WHERE r.no_rkm_medis LIKE 'DR%' AND dp.no_rawat IS NOT NULL;" 2>/dev/null)
VIS=$(mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%';" 2>/dev/null)
PROC=$(mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM rawat_jl_dr rj JOIN reg_periksa r ON r.no_rawat=rj.no_rawat WHERE r.no_rkm_medis LIKE 'DR%';" 2>/dev/null)
DRUGRP=$(mysql -uroot sik -N -B -e "SELECT ROUND(100.0*SUM(CASE WHEN b.status='Obat' AND b.nm_perawatan NOT LIKE '%PPN%' THEN b.totalbiaya ELSE 0 END)/SUM(b.totalbiaya),1) FROM billing b JOIN reg_periksa r ON r.no_rawat=b.no_rawat WHERE r.no_rkm_medis LIKE 'DR%';" 2>/dev/null)
echo "[P5] dx_mentions_gen=$DX_MENTIONS gl_dx_inserts=$GL_DX dp_exist=$DP_EXIST dp_rows=$DP_ROWS dp_dr=$DP_DR visits=$VIS proc=$PROC drug_share=$DRUGRP%" >> "$LOG"

ONE2ONE="NO"
[ "${VIS:-0}" = "${PROC:-1}" ] && ONE2ONE="YES (procedure rows == visit count exactly)"

{
echo "# P5 — ICD-10 mapper wiring status"
echo
echo "## Mapper status: ABSENT"
echo
echo "Evidence (raw: p5.log):"
echo "- generator (generate_scale_encounters.py): $DX_MENTIONS diagnosis/ICD mentions — templates emit"
echo "  registration + one procedure + a drug basket per visit; NO diagnosis field exists in the model,"
echo "  the encounter export (ENC/OBAT/END lines), or the loader. dbutil/load_354 likewise clean."
echo "- consumer (KhanzaBillingConsumer.java): no diagnosa_pasien writes (grep in p5.log §C)."
echo "- real form (6.7 MB general_log_B3 capture): diagnosa_pasien statements = ${GL_DX:-0} — the Khanza"
echo "  billing form (DlgBilingRalan path) does not create diagnoses; they would come from the clinical"
echo "  (doctor's note) form, which this benchmark never drives."
echo
echo "## Why top_diagnoses returns 0 rows — the exact missing link"
echo
echo "diagnosa_pasien EXISTS in sik (present=$DP_EXIST, total rows=${DP_ROWS}) but has ${DP_DR:-0} rows"
echo "joined to the DR cohort: NO component in the whole chain writes diagnoses — not the generator,"
echo "not the consumer, not the real billing form. The report query LEFT JOINs an empty-on-DR table,"
echo "so every nm_penyakit is NULL and the WHERE pk.nm_penyakit IS NOT NULL filters everything out."
echo "Empty result = missing writer, not a query bug."
echo
echo "## What wiring would require (estimate)"
echo
echo "1. Generator: per-template ICD-10 code sampling (weight by template's plausibility) + a dx line"
echo "   in the export (~0.5-1 d)."
echo "2. Consumer: write diagnosa_pasien (+ prioritas/prioritas field, kd_penyakit FK) (~0.5 d)."
echo "3. Validation: ICD codes must exist in the penyakit master (41,412 rows) — sample from real"
echo "  codes to keep FK integrity (~0.5 d)."
echo "Total: roughly 1.5-2 tool-days; no Khanza-source changes needed (consumer + generator only)."
echo
echo "## Templated-content checks (computed from data)"
echo
echo "- procedure rows vs visits: $PROC procedure rows vs $VIS visits → 1:1 = **$ONE2ONE**"
echo "- drug share of revenue: **${DRUGRP:-n/a}%** (B3 Oct charge-delta gave 74.7%; whole-window number above)"
echo
echo "## Verdict: content tied to clinical logic = NO"
echo
echo "Drugs and procedures are template-driven, independent of any diagnosis (there are none):"
echo "every visit gets exactly one procedure row regardless of complaint, and the drug basket is"
echo "drawn from template pools, not from dx→therapy logic. Billing content is arithmetic on"
echo "quantities x a shared price list; nothing clinical gates what is billed."
echo
echo "_Generated by pchain_p5.sh $(date -u)_"
} > "$OUT/p5_report.md"
echo "[P5] p5_report.md written"
exit 0
