#!/usr/bin/env python3
"""
wire_icd10_content_mapper.py — Phase 2: ICD-10 diagnosis → (drugs, procedures)
content mapper. Replaces random picks so a visit's diagnosis determines plausible
drugs/procedures. WHO ICD-10 only; outpatient plausibility; unmappable codes →
rejects (never silent drops).

Starter/seed mapping: the bundle carries no full ICD-10 knowledge base, so this
builds a DETERMINISTIC mapping for common outpatient ICD-10 categories, resolving
preferred content to REAL codes present in `databarang` (drugs) and
`jns_perawatan` (procedures). This is a SEED to be replaced by the full WHO ICD-10
content model — recorded in DECISIONS.md.

Idempotent; logs to results/<RUN_ID>/icd10_content.log; exit 0 success.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dbutil

SINK = dbutil  # alias for brevity

# ICD-10 category stem → (label, preferred drug names, preferred procedure names).
# Only COMMON outpatient presentations; external-cause (V/W/X) stems excluded on purpose.
CATEGORIES = [
    ("A01", "Tuberculosis",            ["Isoniazid", "Rifampicin"],             ["Rontgen"]),
    ("A09", "Diarrhea/enteritis",      ["Oralit", "Antasida"],                 ["Lab Darah"]),
    ("J02", "Acute pharyngitis/tonsillitis", ["Amoxi", "Strepsil", "Vitamin C"], ["Lab Darah"]),
    ("J06", "Acute upper resp. infection",   ["Paracetamol", "Salbutamol", "Vitamin C"], []),
    ("J20", "Acute lower resp. infection",   ["Salbutamol", "Amoxi"],          ["Rontgen"]),
    ("M54", "Dorsopathies",            ["Celecoxib", "Vitamin C"],            []),
    ("B01", "Dermatosis",              ["Lokaten", "Obat Luka"],              []),
    ("R50", "Fever",                   ["Paracetamol"],                       []),
    ("R51", "Headache",                ["Paracetamol", "Vitamin C"],          []),
]


def stem_match(code):
    if not code:
        return None
    u = code.upper()
    for stem, label, drugs, procs in CATEGORIES:
        if u.startswith(stem):
            return (stem, label, drugs, procs)
    return None


def main():
    db = "sik_bench"
    tool = dbutil.Tool("icd10_content")
    log = tool.log

    # Ensure diagnosis tables exist in sik_bench (CREATE LIKE sik if missing).
    for t in ("diagnosa_pasien", "penyakit"):
        exists = dbutil.scalar(db, "SELECT COUNT(*) FROM information_schema.tables "
                                  "WHERE table_schema='sik_bench' AND table_name='%s'" % t)
        if not exists or int(exists or 0) == 0:
            dbutil.execute(db, "CREATE TABLE IF NOT EXISTS sik_bench.%s LIKE sik.%s" % (t, t))
            log("created sik_bench.%s (LIKE sik)" % t)

    # Preferred content → REAL codes present in the DB.
    def resolve_code(preferred_names, table, codecol, namecol):
        out, rejected = [], []
        for nm in preferred_names:
            like = nm.replace("'", "''")
            row = dbutil.scalar(db,
                "SELECT %s FROM %s WHERE %s LIKE '%%s%%' ORDER BY %s LIMIT 1" %
                (codecol, table, namecol, like))
            if row:
                out.append(row)
            else:
                rejected.append(nm)
        return out, rejected

    # Which ICD-10 codes are actually present on the DR visits? The Khanza diagnosis
    # table keys on kd_penyakit (disease/ICD code, validated against the penyakit master).
    codes = [r[0] for r in dbutil.query(db,
        "SELECT DISTINCT kd_penyakit FROM diagnosa_pasien "
        "WHERE no_rawat LIKE '2026/10/%' AND kd_penyakit IS NOT NULL AND kd_penyakit<>'' "
        "ORDER BY kd_penyakit") if r and r[0]]
    if not codes:
        # No per-visit ICD-10 codes persisted yet (DR generator side not deployed).
        # The starter mapper still stands up the category→content rules and logs the
        # candidate categories as seed content; rejects stay zero (nothing to map yet).
        log("no ICD-10 codes found in diagnosa_pasien for DR visits; "
            "standing up starter category rules (seed) — 0 codes to map yet")
        tool.artifact("icd10_starter_map.txt",
            "starter ICD-10 content mapping (SEED, replace with full WHO ICD-10 model):\n" +
            "\n".join("%s (%s): drugs=%s procs=%s" % c for c in CATEGORIES))

    mapped, rejects = 0, []
    for code in codes:
        hit = stem_match(code)
        if hit is None:
            rejects.append("%s UNMAPPABLE_ICD10 (no WHO ICD-10 starter category; rejected, not dropped)" % code)
            continue
        stem, label, drugs, procs = hit
        drug_codes, rej_d = resolve_code(drugs, "databarang", "kode_brng", "nama_brng")
        proc_codes, rej_p = resolve_code(procs, "jns_perawatan", "kd_jenis_prw", "nm_perawatan")
        for r in rej_d + rej_p:
            rejects.append("%s CONTENT_NOT_IN_DB (%s)" % (code, r))
        log("map %s (%s) -> drugs=%s procs=%s" % (code, label, drug_codes, proc_codes))
        mapped += 1

    # Record the seed-mapping caveat.
    dbutil.decision("Phase2 ICD-10 content mapper = STARTER/SEED mapping",
        "Common outpatient ICD-10 categories mapped to real DB drug/procedure codes. "
        "NOT the full WHO ICD-10 model; replace when the knowledge base is available. "
        "Unmappable codes are rejected (reason code), never silently dropped. "
        "See %s" % tool.log_path)

    tool.artifact("icd10_rejects.txt", "\n".join(rejects) if rejects else "(no rejects)")
    log("done: %d codes mapped, %d rejects (all logged, none dropped)" % (mapped, len(rejects)))
    tool.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
