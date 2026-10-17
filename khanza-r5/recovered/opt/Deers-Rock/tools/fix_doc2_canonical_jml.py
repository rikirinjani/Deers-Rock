#!/usr/bin/env python3
"""fix_doc2_canonical_jml.py — DOC-2 fix (determinism_audit_checklist §4).

Root defect: the DR generator re-picked a random quantity on each re-export of
the same prescription, so the same (no_resep, kode_brng) pair carries rows with
DIFFERENT jml (re-rolled re-sends). The consumer's MAX(jml) rule is a
deterministic stand-in; this fix makes the source itself canonical so re-sends
are byte-identical and the consumer's MAX dedup becomes a provable no-op.

What this tool does
  1. resep_dokter: for every (no_resep, kode_brng) pair with multiple rows,
     set ALL rows to the canonical value MAX(jml) (conservative choice, matches
     the consumer's MAX rule). Identical re-send pairs are already canonical
     (MAX == every row) — counted, left alone.
  2. resep_obat: has NO jml column (verified: no_resep, tgl_perawatan, jam,
     no_rawat, kd_dokter, tgl_peresepan, jam_peresepan, status, tgl_penyerahan,
     jam_penyerahan) — nothing to canonicalize; logged for the record.
  3. detail_pemberian_obat: report-only stability check restricted to DR
     visits. Seed-visit multi-rows (different tgl_perawatan) are genuine
     repeated dispenses, NOT re-rolled re-sends — never touched.

Idempotent: a second run finds 0 pairs with distinct jml and changes nothing.
Exit 0 on success, non-zero on failure (run_all.sh gate_fail catches it).
"""
import sys

sys.path.insert(0, "/opt/Deers-Rock/tools")
from dbutil import Tool, query, execute, scalar  # noqa: E402


def main():
    t = Tool("fix_doc2_canonical_jml")
    ok = True
    try:
        t.log("DOC-2: canonical jml per (no_resep, kode_brng) — MAX rule")

        # --- 1. duplicate pairs in resep_dokter -----------------------------
        pairs = query("sik", """
            SELECT no_resep, kode_brng, COUNT(*) AS c, COUNT(DISTINCT jml) AS dj,
                   MIN(jml), MAX(jml)
            FROM resep_dokter
            GROUP BY no_resep, kode_brng HAVING c > 1
            ORDER BY no_resep, kode_brng""")
        reread = [p for p in pairs if int(p[3]) > 1]
        identical = [p for p in pairs if int(p[3]) == 1]
        t.log("resep_dokter duplicate pairs: %d total | %d RE-ROLLED (distinct jml) | %d identical re-sends"
              % (len(pairs), len(reread), len(identical)))

        stmts = []
        samples = []
        for p in reread:
            no_resep, kode, _c, _dj, mn, mx = p
            stmts.append("UPDATE resep_dokter SET jml = %s WHERE no_resep = '%s' AND kode_brng = '%s';"
                         % (mx, no_resep, kode))
            samples.append((no_resep, kode, mn, mx))
        if stmts:
            execute("sik", "\n".join(stmts))
        t.log("pairs fixed (all rows set to canonical MAX jml): %d" % len(reread))
        for s in samples[:10]:
            t.log("  sample %s %s: jml %s -> %s" % s)
        if len(samples) > 10:
            t.log("  ... and %d more" % (len(samples) - 10))

        # --- 2. verify: no pair with distinct jml remains (idempotence) -----
        left = scalar("sik", """
            SELECT COUNT(*) FROM (
              SELECT no_resep, kode_brng FROM resep_dokter
              GROUP BY no_resep, kode_brng
              HAVING COUNT(*) > 1 AND COUNT(DISTINCT jml) > 1) x""")
        if int(left or 1) != 0:
            t.log("VERIFY FAIL: %s pairs still have distinct jml" % left)
            ok = False
        else:
            t.log("verify OK: 0 pairs with distinct jml remain — re-run is a no-op")

        # --- 3. resep_obat: informational (no jml column) --------------------
        cols = [r[0] for r in query("sik", "DESCRIBE resep_obat")]
        t.log("resep_obat columns: %s — no jml column; nothing to canonicalize"
              % ", ".join(cols))

        # --- 4. dpo DR-side stability (report only) --------------------------
        dpo = query("sik", """
            SELECT d.no_rawat, d.kode_brng, COUNT(DISTINCT d.jml)
            FROM detail_pemberian_obat d
            INNER JOIN reg_periksa r ON r.no_rawat = d.no_rawat
            WHERE r.no_rkm_medis LIKE 'DR%'
            GROUP BY d.no_rawat, d.kode_brng
            HAVING COUNT(DISTINCT d.jml) > 1""")
        if dpo:
            t.log("WARN: %d DR dpo pairs with distinct jml (review before G1)" % len(dpo))
            for d in dpo[:5]:
                t.log("  %s %s" % (d[0], d[1]))
        else:
            t.log("dpo DR-side check: 0 pairs with distinct jml (stable)")
        t.log("dpo seed-visit multi-rows are genuine multi-date dispenses — not modified")

        # --- 5. export-level proof: OBAT lines per (no_rawat,kode_brng) now identical
        # (deferred to verify_resend_idempotent.py which re-runs the export)

        if ok:
            t.log("RESULT: DOC-2 fix complete")
        t.close()
        return 0 if ok else 1
    except Exception as e:  # noqa: BLE001
        t.log("ERROR: %s" % e)
        t.close()
        return 1


if __name__ == "__main__":
    sys.exit(main())
