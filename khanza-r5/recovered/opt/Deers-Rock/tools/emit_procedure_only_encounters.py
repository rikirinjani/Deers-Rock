#!/usr/bin/env python3
"""emit_procedure_only_encounters.py — unbilled-67 fix (checklist §6).

67 DR visits are procedure-only (dpo=0 / proc=1): they have a rawat_jl_dr row
but no resep_obat row, so the prescription-event-driven export never emitted
an ENC block for them and the consumer never billed their registration +
procedure charges (~19% of DR visit charges lost).

Fix: extend the export (dr_export.sh) with a procedure-only arm — for each
such visit emit the visit header only:

    ENC <no_rawat> <tgl_registrasi> <jam_reg>
    END

(no OBAT lines; the consumer bills registration from reg_periksa.biaya_reg and
procedures from rawat_jl_dr regardless of drug lines). The consumer is then
re-run and the gate verified: billed DR visit count == DR visit count.

Idempotent; exit 0 on success, non-zero on failure.
"""
import os
import sys

sys.path.insert(0, "/opt/Deers-Rock/tools")
from dbutil import (Tool, query, scalar, run_export, run_consumer,  # noqa: E402
                    decision, KHANZA_DIR, ENCOUNTERS)

EXPORT_SH = os.path.join(KHANZA_DIR, "consumer", "dr_export.sh")
PROC_MARKER = "procedure-only ENC extension (unbilled-67 fix 2026-10-11"

EXPORT_V3 = r'''#!/bin/bash
# dr_export.sh — export DR encounters to line format for KhanzaBillingConsumer.
# Run from /opt/simrs-khanza/ (setting/ found relative, DB creds from database.ini).
# Output: /tmp/dr_encounters.txt
#   ENC <no_rawat> <tgl> <jam>
#   OBAT <no_rawat> <kode_brng> <nama_spaced->underscored> <h_beli=ralan> <jml>
#   END
#
# DR-only guard (seed-leakage fix 2026-10-11, checklist section 5): every arm
# joins reg_periksa and requires no_rkm_medis LIKE 'DR%'. The old date-only
# filter (no_rawat LIKE '2026/10%') also matched 34 seed visits with October
# prescriptions and leaked them into billing.
#
# procedure-only ENC extension (unbilled-67 fix 2026-10-11, checklist section 6):
# DR visits with a procedure (rawat_jl_dr) but no prescription (resep_obat) now
# get an ENC/END header block so registration + procedure charges reach Khanza.
set -e
cd /opt/simrs-khanza

INIFILE=setting/database.ini
DBUSER=$(grep -oiP '^user\s*=\s*\K.*' "$INIFILE" | tr -d '\r' | xargs)
DBPASS=$(grep -oiP '^(pass|password)\s*=\s*\K.*' "$INIFILE" | tr -d '\r' | xargs)
DBNAME=$(grep -oiP '^database\s*=\s*\K.*' "$INIFILE" | tr -d '\r' | xargs)
: "${DBUSER:=root}"; : "${DBNAME:=sik}"

MYSQLCMD="mysql -u $DBUSER"
[ -n "$DBPASS" ] && MYSQLCMD="$MYSQLCMD -p$DBPASS"

$MYSQLCMD $DBNAME -N -B -e "
SELECT line FROM (
  SELECT ro.no_rawat nr, 0 seq, CONCAT('ENC ', ro.no_rawat, ' ', ro.tgl_perawatan, ' ', COALESCE(ro.jam,'08:00:00')) line
    FROM resep_obat ro
    INNER JOIN reg_periksa rp ON rp.no_rawat = ro.no_rawat
    WHERE ro.no_rawat LIKE '2026/10%' AND rp.no_rkm_medis LIKE 'DR%'
    GROUP BY ro.no_rawat, ro.tgl_perawatan, ro.jam
  UNION ALL
  SELECT r.no_rawat nr, 0 seq, CONCAT('ENC ', r.no_rawat, ' ', r.tgl_registrasi, ' ', COALESCE(r.jam_reg,'08:00:00')) line
    FROM reg_periksa r
    WHERE r.no_rkm_medis LIKE 'DR%' AND r.no_rawat LIKE '2026/10%'
      AND NOT EXISTS (SELECT 1 FROM resep_obat ro WHERE ro.no_rawat = r.no_rawat)
      AND EXISTS (SELECT 1 FROM rawat_jl_dr j WHERE j.no_rawat = r.no_rawat)
  UNION ALL
  SELECT ro.no_rawat nr, 1 seq, CONCAT('OBAT ', ro.no_rawat, ' ', rd.kode_brng, ' ',
         REPLACE(REPLACE(COALESCE(b.nama_brng, rd.kode_brng), ' ', '_'), CHAR(9), ''), ' ',
         COALESCE(b.ralan,0), ' ', rd.jml) line
    FROM resep_obat ro
    INNER JOIN reg_periksa rp ON rp.no_rawat = ro.no_rawat
    INNER JOIN resep_dokter rd ON rd.no_resep = ro.no_resep
    LEFT JOIN databarang b ON b.kode_brng = rd.kode_brng
    WHERE ro.no_rawat LIKE '2026/10%' AND rp.no_rkm_medis LIKE 'DR%'
  UNION ALL
  SELECT v.no_rawat nr, 2 seq, 'END' line FROM (
    SELECT DISTINCT ro.no_rawat FROM resep_obat ro
      INNER JOIN reg_periksa rp ON rp.no_rawat = ro.no_rawat
      WHERE ro.no_rawat LIKE '2026/10%' AND rp.no_rkm_medis LIKE 'DR%'
    UNION
    SELECT r.no_rawat FROM reg_periksa r
      WHERE r.no_rkm_medis LIKE 'DR%' AND r.no_rawat LIKE '2026/10%'
        AND NOT EXISTS (SELECT 1 FROM resep_obat ro WHERE ro.no_rawat = r.no_rawat)
        AND EXISTS (SELECT 1 FROM rawat_jl_dr j WHERE j.no_rawat = r.no_rawat)
  ) v
) x ORDER BY nr, seq, line
" > /tmp/dr_encounters.txt

ENC_COUNT=$(grep -c '^ENC ' /tmp/dr_encounters.txt)
OBAT_COUNT=$(grep -c '^OBAT ' /tmp/dr_encounters.txt)
echo "OK: exported $ENC_COUNT encounters, $OBAT_COUNT drug lines -> /tmp/dr_encounters.txt"
head -8 /tmp/dr_encounters.txt
'''


def read_enc_set(path):
    """Set of no_rawat appearing as ENC lines in the export file."""
    s = set()
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("ENC "):
                    s.add(line.split()[1])
    return s


def main():
    t = Tool("emit_procedure_only_encounters")
    try:
        t.log("unbilled-67 fix: emit ENC blocks for procedure-only DR visits")

        # --- 0. DB truth --------------------------------------------------
        proc_only = [r[0] for r in query("sik", """
            SELECT r.no_rawat FROM reg_periksa r
            WHERE r.no_rkm_medis LIKE 'DR%'
              AND NOT EXISTS (SELECT 1 FROM resep_obat d WHERE d.no_rawat = r.no_rawat)
              AND EXISTS (SELECT 1 FROM rawat_jl_dr j WHERE j.no_rawat = r.no_rawat)
            ORDER BY r.no_rawat""")]
        dr_total = scalar("sik", "SELECT COUNT(*) FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%'")
        t.log("procedure-only DR visits in DB: %d | total DR visits: %s" % (len(proc_only), dr_total))

        # --- 1. patch dr_export.sh (idempotent) ----------------------------
        with open(EXPORT_SH, "r", encoding="utf-8") as f:
            src = f.read()
        if PROC_MARKER in src:
            t.log("dr_export.sh already carries the procedure-only arm (marker present)")
        else:
            import shutil
            shutil.copy2(EXPORT_SH, EXPORT_SH + ".bak_proc67")
            with open(EXPORT_SH, "w", encoding="utf-8") as f:
                f.write(EXPORT_V3)
            t.log("dr_export.sh rewritten: procedure-only ENC arm added (.bak_proc67 saved)")

        # --- 2. re-run export, diff ENC set ---------------------------------
        before = read_enc_set(ENCOUNTERS)
        rc, out = run_export()
        t.log("dr_export.sh rc=%d" % rc)
        if rc != 0:
            t.log("export output: %s" % out[-400:])
            raise RuntimeError("dr_export.sh failed")
        after = read_enc_set(ENCOUNTERS)
        newly = after - before
        t.log("newly-emitted procedure-only ENC blocks: %d (ENC total %d -> %d)"
              % (len(newly), len(before), len(after)))
        missing = set(proc_only) - after
        if missing:
            t.log("VERIFY FAIL: %d procedure-only visits still missing from export" % len(missing))
            raise RuntimeError("export incomplete")

        # artifact: the supplementary visit list
        t.artifact("proc_only_encounters.txt",
                   "\n".join(sorted(proc_only)) + "\n")

        # --- 3. re-run consumer so reg+procedure charges are billed ----------
        rc, tail = run_consumer(os.path.join(t.dir, "consumer_proc67.log"))
        t.log("consumer re-run rc=%d" % rc)
        if rc != 0:
            t.log("consumer tail:\n%s" % tail)
            raise RuntimeError("consumer re-run failed")

        # --- 4. gate: billed DR visits == DR visits ---------------------------
        billed = scalar("sik", """
            SELECT COUNT(DISTINCT b.no_rawat) FROM billing b
            INNER JOIN reg_periksa r ON r.no_rawat = b.no_rawat
            WHERE r.no_rkm_medis LIKE 'DR%'""")
        t.log("billed DR visits: %s / DR visits: %s (must be equal)" % (billed, dr_total))
        ok = int(billed or -1) == int(dr_total or -2)
        if not ok:
            t.log("VERIFY FAIL: unbilled DR remainder = %d"
                  % (int(dr_total or 0) - int(billed or 0)))

        decision("67 procedure-only DR visits now exported and billed",
                 "dr_export.sh gained a procedure-only ENC arm (DR visits with "
                 "rawat_jl_dr but no resep_obat emit ENC/END from "
                 "tgl_registrasi/jam_reg; no OBAT lines — consumer bills registration + "
                 "procedure from reg_periksa/rawat_jl_dr). Consumer re-run; gate: billed "
                 "DR visit count == DR visit count (%s == %s)." % (billed, dr_total))
        t.log("RESULT: unbilled-67 fix complete (%s)" % ("PASS" if ok else "FAIL"))
        t.close()
        return 0 if ok else 1
    except Exception as e:  # noqa: BLE001
        t.log("ERROR: %s" % e)
        t.close()
        return 1


if __name__ == "__main__":
    sys.exit(main())
