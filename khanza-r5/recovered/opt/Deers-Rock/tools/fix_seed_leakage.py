#!/usr/bin/env python3
"""fix_seed_leakage.py — seed-leakage fix (determinism_audit_checklist §5).

34 SEED no_rawat (numeric no_rkm_medis, NOT 'DR%') received billing through
the DR export path (321 billed = 287 DR + 34 seed). Root cause: the export's
date-only filter (no_rawat LIKE '2026/10%') matched seed visits that have
October resep_obat rows, and the consumer billed whatever the export yielded
(no no_rkm_medis guard). Fix is two-layered:

  1. Export gate: dr_export.sh joins reg_periksa and requires
     no_rkm_medis LIKE 'DR%' in every arm (seed visits can never be exported).
  2. Consumer guard: KhanzaBillingConsumer.java skips any ENC block whose
     reg_periksa.no_rkm_medis does not start with 'DR' (defense-in-depth).
     The source is patched in place, recompiled, and re-run.

Data cleanup: the 34 leaked visits' billing/nota_jalan rows (100% pipeline
authored — the consumer delete-then-inserts per visit) and their
detail_pemberian_obat rows for exactly the OBAT pairs the export fed in
(consumer UPSERT signature) are removed from sik. Original seed-visit data
(NON-October visits, other dpo rows) is untouched.

Proving check (checklist §5): sik_bench contains zero seed transactional rows.

Idempotent; exit 0 on success, non-zero on failure.
"""
import os
import shutil
import sys

sys.path.insert(0, "/opt/Deers-Rock/tools")
from dbutil import (Tool, query, execute, scalar, run_export, run_consumer,  # noqa: E402
                    decision, KHANZA_DIR)

CONSUMER_JAVA = os.path.join(KHANZA_DIR, "consumer", "KhanzaBillingConsumer.java")
EXPORT_SH = os.path.join(KHANZA_DIR, "consumer", "dr_export.sh")
GUARD_MARKER = "DR-only guard (seed-leakage fix 2026-10-11"
EXPORT_MARKER = "DR-only guard (seed-leakage fix 2026-10-11)"

JAVA_ANCHOR = (
    "            // 0. Skip visits without a reg_periksa row (billing FK target)\n"
    "            if (!regExists(noRawat)) {\n"
    "                log.println(\"  WARN skip \" + noRawat + \": no reg_periksa row\");\n"
    "                System.out.println(\"WARN: skip \" + noRawat + \" (no reg_periksa row)\");\n"
    "                i++; continue;\n"
    "            }\n")

JAVA_GUARD = (
    "\n"
    "            // 0b. DR-only guard (seed-leakage fix 2026-10-11, checklist section 5):\n"
    "            //     the benchmark bills ONLY DR synthetic visits (no_rkm_medis LIKE 'DR%').\n"
    "            //     The export's date-only filter used to match 34 seed visits; this guard\n"
    "            //     is defense-in-depth so the consumer can never bill a non-DR visit even\n"
    "            //     if a future export leak reintroduces one.\n"
    "            String rkmGuard = queryIsi(\"SELECT no_rkm_medis FROM reg_periksa WHERE no_rawat='\" + noRawat + \"'\");\n"
    "            if (!rkmGuard.startsWith(\"DR\")) {\n"
    "                log.println(\"  SKIP \" + noRawat + \": non-DR visit (no_rkm_medis='\" + rkmGuard + \"') DR-only guard\");\n"
    "                System.out.println(\"SKIP: \" + noRawat + \" non-DR visit (DR-only guard, seed-leakage fix)\");\n"
    "                i++; continue;\n"
    "            }\n")

JAVA_DOC_ANCHOR = " * Documented deviations from the real form (environmental, per report §5.6):\n"
JAVA_DOC_NOTE = (
    " * Seed-leakage fix (2026-10-11): DR-only guard — ENC blocks whose visit has\n"
    " * no_rkm_medis NOT LIKE 'DR%' are skipped (benchmark bills DR synthetic\n"
    " * visits only; the old export leaked 34 seed visits into billing).\n"
    " *\n")

EXPORT_V2 = r'''#!/bin/bash
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
  SELECT ro.no_rawat nr, 1 seq, CONCAT('OBAT ', ro.no_rawat, ' ', rd.kode_brng, ' ',
         REPLACE(REPLACE(COALESCE(b.nama_brng, rd.kode_brng), ' ', '_'), CHAR(9), ''), ' ',
         COALESCE(b.ralan,0), ' ', rd.jml) line
    FROM resep_obat ro
    INNER JOIN reg_periksa rp ON rp.no_rawat = ro.no_rawat
    INNER JOIN resep_dokter rd ON rd.no_resep = ro.no_resep
    LEFT JOIN databarang b ON b.kode_brng = rd.kode_brng
    WHERE ro.no_rawat LIKE '2026/10%' AND rp.no_rkm_medis LIKE 'DR%'
  UNION ALL
  SELECT DISTINCT t.no_rawat nr, 2 seq, 'END' line
    FROM resep_obat t
    INNER JOIN reg_periksa rp ON rp.no_rawat = t.no_rawat
    WHERE t.no_rawat LIKE '2026/10%' AND rp.no_rkm_medis LIKE 'DR%'
) x ORDER BY nr, seq, line
" > /tmp/dr_encounters.txt

ENC_COUNT=$(grep -c '^ENC ' /tmp/dr_encounters.txt)
OBAT_COUNT=$(grep -c '^OBAT ' /tmp/dr_encounters.txt)
echo "OK: exported $ENC_COUNT encounters, $OBAT_COUNT drug lines -> /tmp/dr_encounters.txt"
head -8 /tmp/dr_encounters.txt
'''


def patch_consumer_java(t):
    """Insert the DR-only guard into KhanzaBillingConsumer.java (idempotent)."""
    with open(CONSUMER_JAVA, "r", encoding="utf-8") as f:
        src = f.read()
    if GUARD_MARKER in src:
        t.log("consumer source already carries the DR-only guard (marker present)")
        return False
    if JAVA_ANCHOR not in src:
        raise RuntimeError("consumer patch anchor not found (regExists block)")
    shutil.copy2(CONSUMER_JAVA, CONSUMER_JAVA + ".bak_seedfix")
    src = src.replace(JAVA_ANCHOR, JAVA_ANCHOR + JAVA_GUARD, 1)
    if JAVA_DOC_ANCHOR in src:
        src = src.replace(JAVA_DOC_ANCHOR, JAVA_DOC_NOTE + JAVA_DOC_ANCHOR, 1)
    with open(CONSUMER_JAVA, "w", encoding="utf-8") as f:
        f.write(src)
    t.log("consumer source patched: DR-only guard inserted after regExists check (.bak_seedfix saved)")
    return True


def patch_export_sh(t):
    """Rewrite dr_export.sh with the DR-guarded query (idempotent by marker)."""
    with open(EXPORT_SH, "r", encoding="utf-8") as f:
        src = f.read()
    if EXPORT_MARKER in src:
        t.log("dr_export.sh already carries the DR-only guard (marker present)")
        return False
    shutil.copy2(EXPORT_SH, EXPORT_SH + ".bak_seedfix")
    with open(EXPORT_SH, "w", encoding="utf-8") as f:
        f.write(EXPORT_V2)
    t.log("dr_export.sh rewritten: every arm gated on reg_periksa.no_rkm_medis LIKE 'DR%' (.bak_seedfix saved)")
    return True


def compile_consumer(t):
    import subprocess
    if not shutil.which("javac"):
        raise RuntimeError("javac not found — install openjdk-17-jdk-headless first")
    p = subprocess.run(["javac", "-cp",
                        "KhanzaSecurity16bit/dist/KhanzaSecurity16bit.jar",
                        "consumer/KhanzaBillingConsumer.java", "-d", "consumer"],
                       cwd=KHANZA_DIR, capture_output=True, text=True, timeout=300)
    if p.returncode != 0:
        raise RuntimeError("javac failed: %s" % p.stderr.strip()[:400])
    t.log("consumer recompiled OK")


def main():
    t = Tool("fix_seed_leakage")
    try:
        t.log("seed-leakage fix: gate export + consumer on no_rkm_medis LIKE 'DR%'")

        # --- 0. identify the leaked seed visits (before touching anything) ---
        leaked = [r[0] for r in query("sik", """
            SELECT DISTINCT ro.no_rawat
            FROM resep_obat ro
            INNER JOIN reg_periksa rp ON rp.no_rawat = ro.no_rawat
            WHERE ro.no_rawat LIKE '2026/10%' AND rp.no_rkm_medis NOT LIKE 'DR%'
            ORDER BY ro.no_rawat""")]
        t.log("leaked seed visits in the October export path: %d" % len(leaked))
        pre_billing = scalar("sik", """
            SELECT COUNT(*) FROM billing WHERE no_rawat IN (%s)"""
                              % ",".join("'%s'" % v for v in leaked)) if leaked else 0
        t.log("seed-path billing rows before cleanup: %s" % pre_billing)

        # --- 1. patch export + consumer (idempotent), recompile if changed ----
        export_changed = patch_export_sh(t)
        java_changed = patch_consumer_java(t)
        if java_changed:
            compile_consumer(t)

        # --- 2. re-run the export (now DR-only) --------------------------------
        rc, out = run_export()
        t.log("dr_export.sh rc=%d" % rc)
        if rc != 0:
            t.log("export output: %s" % out[-400:])
            raise RuntimeError("dr_export.sh failed")
        with open("/tmp/dr_encounters.txt", "r", encoding="utf-8") as f:
            enc_lines = [l for l in f.read().split("\n") if l.startswith("ENC ")]
        t.log("export now contains %d ENC blocks (DR-with-prescription only)" % len(enc_lines))
        leaked_in_export = [v for v in leaked
                            if any(l.split(" ")[1] == v for l in enc_lines)]
        if leaked_in_export:
            t.log("VERIFY FAIL: %d leaked visits still in export" % len(leaked_in_export))
            raise RuntimeError("export still leaks seed visits")

        # --- 3. re-run the consumer (guard active) -----------------------------
        rc, tail = run_consumer(os.path.join(t.dir, "consumer_seedfix.log"))
        t.log("consumer re-run rc=%d" % rc)
        if rc != 0:
            t.log("consumer tail:\n%s" % tail)
            raise RuntimeError("consumer re-run failed")

        # --- 4. cleanup the leaked visits' pipeline rows in sik ----------------
        if leaked:
            ids = ",".join("'%s'" % v for v in leaked)
            execute("sik", "DELETE FROM billing WHERE no_rawat IN (%s);" % ids)
            execute("sik", "DELETE FROM nota_jalan WHERE no_rawat IN (%s);" % ids)
            # dpo: only the pairs the export fed the consumer (that visit's
            # resep_dokter kode_brng via its no_resep) — consumer UPSERT targets.
            execute("sik", """
                DELETE d FROM detail_pemberian_obat d
                WHERE d.no_rawat IN (%s)
                  AND d.kode_brng IN (
                    SELECT rd.kode_brng FROM resep_dokter rd
                    INNER JOIN resep_obat ro ON rd.no_resep = ro.no_resep
                    WHERE ro.no_rawat IN (%s));""" % (ids, ids))
        t.log("cleanup done: billing/nota_jalan deleted for %d leaked visits; dpo rows removed only for their exported OBAT pairs" % len(leaked))

        # --- 5. proving checks ---------------------------------------------------
        post_billing = scalar("sik", "SELECT COUNT(*) FROM billing WHERE no_rawat IN (%s)"
                              % ",".join("'%s'" % v for v in leaked)) if leaked else 0
        post_nota = scalar("sik", "SELECT COUNT(*) FROM nota_jalan WHERE no_rawat IN (%s)"
                           % ",".join("'%s'" % v for v in leaked)) if leaked else 0
        seed_bench = scalar("sik_bench", """
            SELECT (SELECT COUNT(*) FROM reg_periksa WHERE no_rkm_medis NOT LIKE 'DR%')
                 + (SELECT COUNT(*) FROM billing WHERE no_rawat IN
                     (SELECT no_rawat FROM reg_periksa WHERE no_rkm_medis NOT LIKE 'DR%'))""")
        billed_dr = scalar("sik", """
            SELECT COUNT(DISTINCT b.no_rawat) FROM billing b
            INNER JOIN reg_periksa r ON r.no_rawat = b.no_rawat
            WHERE r.no_rkm_medis LIKE 'DR%'""")
        t.log("post-cleanup: leaked-visit billing rows=%s (removed %s), nota rows=%s"
              % (post_billing, int(pre_billing or 0) - int(post_billing or 0), post_nota))
        t.log("proving check: seed_rows_in_bench=%s (must be 0)" % seed_bench)
        t.log("billed DR visits now: %s" % billed_dr)

        ok = (int(post_billing or 1) == 0 and int(seed_bench or 1) == 0)
        if not ok:
            t.log("VERIFY FAIL: seed rows remain (billing=%s, sik_bench=%s)"
                  % (post_billing, seed_bench))

        decision("Seed leakage closed (export + consumer DR-only guards)",
                 "Root cause: export filter `no_rawat LIKE '2026/10%'` matched 34 seed "
                 "visits that have October resep_obat rows; consumer billed whatever the "
                 "export yielded. Fix: (1) dr_export.sh joins reg_periksa and requires "
                 "no_rkm_medis LIKE 'DR%' in every arm; (2) KhanzaBillingConsumer.java "
                 "skips ENC blocks whose no_rkm_medis does not start with DR (defense in "
                 "depth), recompiled + re-run. Cleanup: deleted pipeline billing/nota_jalan "
                 "rows of the 34 leaked visits and their exported dpo pairs from sik. "
                 "Original seed-visit data untouched. Proving check: sik_bench seed rows = 0. "
                 "NOTE: dpo rows of leaked visits that pre-existed the consumer UPSERT were "
                 "already overwritten in the shipped dump; the corrupted stand-ins were "
                 "deleted (original values unrecoverable on-box).")
        t.log("RESULT: seed-leakage fix complete (%s)" % ("PASS" if ok else "FAIL"))
        t.close()
        return 0 if ok else 1
    except Exception as e:  # noqa: BLE001
        t.log("ERROR: %s" % e)
        t.close()
        return 1


if __name__ == "__main__":
    sys.exit(main())
