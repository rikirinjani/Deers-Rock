#!/usr/bin/env python3
"""verify_resend_idempotent.py — re-send idempotency / replay determinism
check (determinism_audit_checklist §2, scoped to what is on-box today).

Full checklist §2 (run the DR engine twice from the same seed + clean
snapshot, diff event logs, per-table row counts and billing totals) requires
the DR engine, which is not yet deployed on this VPS. This tool verifies the
on-box determinism surface:

  1. resep_dokter: no (no_resep, kode_brng) pair with distinct jml remains
     (post DOC-2 fix) — the generator-side re-roll defect is closed at the
     data level.
  2. Double export: run dr_export.sh twice; /tmp/dr_encounters.txt must be
     byte-identical (sha256) across runs.
  3. Consumer MAX-rule no-op proof: in the export, every (no_rawat, kode_brng)
     pair must carry a single distinct jml across all its OBAT lines
     (re-rolled pairs must be 0).
  4. Table stability: per-table row counts for resep_obat / resep_dokter /
     detail_pemberian_obat / billing / nota_jalan / rawat_jl_dr identical
     before and after the double export (the export is read-only).
  5. Consumer double re-run: billing VALUE rows (Registrasi / Ralan Dokter /
     Obat / TtlObat / Tambahan / Potongan / Dokter statuses) must hash and
     total identically across two consecutive runs, and row counts must be
     identical. Known non-idempotent artifact (informational, not a failure):
     nota_jalan numbering drifts on re-runs without a clean-snapshot restore
     (MAX(no_nota)+1 depends on surviving rows) — checklist §2 restores a
     clean snapshot between runs, which makes it stable. Also the billing
     'Tanggal & Jam' display row embeds consumer wall-clock run time —
     excluded from the hash as a display-only row (logged by
     write_explicit_sim_dates.py).

Exit 0 when all checks pass; non-zero (with a difference report) otherwise.
"""
import hashlib
import os
import sys

sys.path.insert(0, "/opt/Deers-Rock/tools")
from dbutil import Tool, query, scalar, run_export, run_consumer  # noqa: E402

ENCOUNTERS = "/tmp/dr_encounters.txt"
VALUE_STATUSES = ("Registrasi", "Ralan Dokter", "Obat", "TtlObat", "Tambahan", "Potongan", "Dokter")


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def table_counts():
    tables = ("resep_obat", "resep_dokter", "detail_pemberian_obat",
              "billing", "nota_jalan", "rawat_jl_dr")
    return dict((tb, int(scalar("sik", "SELECT COUNT(*) FROM %s" % tb) or -1))
                for tb in tables)


def billing_value_digest():
    """Digest of billing VALUE rows (display rows excluded) + grand total."""
    rows = query("sik", """
        SELECT no_rawat, noindex, no, nm_perawatan, pemisah, biaya, jumlah,
               tambahan, totalbiaya, status
        FROM billing
        WHERE status IN ('Registrasi','Ralan Dokter','Obat','TtlObat','Tambahan','Potongan','Dokter')
        ORDER BY no_rawat, noindex, status""")
    h = hashlib.sha256()
    total = 0.0
    for r in rows:
        h.update("\x1f".join("" if c is None else str(c) for c in r).encode("utf-8"))
        total += float(r[8] or 0)  # totalbiaya (col 8; col 9 is status)
    return h.hexdigest(), len(rows), total


def export_reread_pairs():
    """(no_rawat, kode_brng) pairs in the export whose OBAT lines carry >1 distinct jml."""
    pairs = {}
    with open(ENCOUNTERS, "r", encoding="utf-8") as f:
        for line in f:
            if not line.startswith("OBAT "):
                continue
            p = line.split()
            if len(p) < 6:
                continue
            key = (p[1], p[2])
            pairs.setdefault(key, set()).add(p[-1])
    return dict((k, v) for k, v in pairs.items() if len(v) > 1)


def main():
    t = Tool("verify_resend_idempotent")
    try:
        t.log("re-send idempotency / replay determinism check (on-box scope; "
              "DR-engine replay deferred until the generator is deployed)")

        ok = True

        # --- 1. resep_dokter canonical (post DOC-2) ---------------------------
        reread = scalar("sik", """
            SELECT COUNT(*) FROM (
              SELECT no_resep, kode_brng FROM resep_dokter
              GROUP BY no_resep, kode_brng
              HAVING COUNT(*) > 1 AND COUNT(DISTINCT jml) > 1) x""")
        t.log("[1] resep_dokter pairs with distinct jml: %s (must be 0)" % reread)
        ok &= int(reread or 1) == 0

        # --- 2. double export byte-identical ------------------------------------
        counts_before = table_counts()
        rc, _ = run_export()
        if rc != 0:
            raise RuntimeError("export run 1 failed")
        run1_hash = sha256_file(ENCOUNTERS)
        rc, _ = run_export()
        if rc != 0:
            raise RuntimeError("export run 2 failed")
        run2_hash = sha256_file(ENCOUNTERS)
        t.log("[2] export sha256 run1=%s... run2=%s... identical=%s"
              % (run1_hash[:16], run2_hash[:16], run1_hash == run2_hash))
        ok &= run1_hash == run2_hash
        t.artifact("encounters.sha256", run1_hash + "\n")

        counts_after = table_counts()
        t.log("[4] per-table row counts before=%s" % counts_before)
        t.log("    per-table row counts after =%s identical=%s"
              % (counts_after, counts_before == counts_after))
        ok &= counts_before == counts_after

        # --- 3. consumer MAX-rule no-op proof (export-level) --------------------
        pairs = export_reread_pairs()
        t.log("[3] export OBAT pairs with distinct jml (MAX-rule non-no-op): %d (must be 0)"
              % len(pairs))
        for k in list(pairs)[:5]:
            t.log("    %s %s -> %s" % (k[0], k[1], sorted(pairs[k])))
        ok &= len(pairs) == 0

        # --- 5. consumer double re-run: value-row digest stable -----------------
        nota_before = int(scalar("sik", "SELECT COUNT(*) FROM nota_jalan") or -1)
        d1, n1, tot1 = billing_value_digest()
        rc, tail = run_consumer(os.path.join(t.dir, "consumer_idem_1.log"))
        if rc != 0:
            t.log("consumer run 1 tail:\n%s" % tail)
            raise RuntimeError("consumer run 1 failed")
        d2, n2, tot2 = billing_value_digest()
        rc, tail = run_consumer(os.path.join(t.dir, "consumer_idem_2.log"))
        if rc != 0:
            t.log("consumer run 2 tail:\n%s" % tail)
            raise RuntimeError("consumer run 2 failed")
        d3, n3, tot3 = billing_value_digest()
        t.log("[5] billing value rows: n %d/%d/%d | total Rp %.2f / %.2f / %.2f"
              % (n1, n2, n3, tot1, tot2, tot3))
        t.log("    value-row digest %s... / %s... / %s... stable=%s"
              % (d1[:16], d2[:16], d3[:16], d1 == d2 == d3))
        ok &= (d1 == d2 == d3) and (n1 == n2 == n3)

        # informational: nota numbering drift without clean-snapshot restore
        nota_after = int(scalar("sik", "SELECT COUNT(*) FROM nota_jalan") or -1)
        t.log("    nota_jalan rows %d -> %d (row count stable=%s; numbering can drift "
              "on re-runs without clean-snapshot restore — informational, checklist §2 "
              "restores a clean snapshot between runs)"
              % (nota_before, nota_after, nota_before == nota_after))
        ok &= nota_before == nota_after

        # export must be unchanged by the consumer runs (consumer writes DB only)
        final_hash = sha256_file(ENCOUNTERS)
        ok &= final_hash == run1_hash

        t.log("RESULT: %s" % ("ALL IDEMPOTENCY CHECKS PASS" if ok else "IDEMPOTENCY CHECK FAILED"))
        t.close()
        return 0 if ok else 1
    except Exception as e:  # noqa: BLE001
        t.log("ERROR: %s" % e)
        t.close()
        return 1


if __name__ == "__main__":
    sys.exit(main())
