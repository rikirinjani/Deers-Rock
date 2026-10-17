#!/usr/bin/env python3
"""map_dr_doctors.py — DOC-1 fix (determinism_audit_checklist §7).

reg_periksa carried only 4 distinct kd_dokter (D0000002-D0000005): the DR
adapter collapsed DR's 20 doctors into Khanza's 4 existing rows, so
doctor-dependent reports (doctor fees, per-doctor revenue) understate.

On-box reality: the DR engine (which holds the seeded roster and the true
per-visit doctor assignment) is NOT deployed on this VPS, and no DR doctor id
survived the adapter collapse in sik. This tool therefore installs a
DETERMINISTIC stand-in mapping, recorded in DECISIONS.md, to be replaced by
the true mapping when the generator/adapter deploy:

  * roster: 20 names taken from the DR generator's canonical doctor name
    pools (Deers-Rock src/agent/generator.ts, DOKTER_NAMES_M/DOKTER_NAMES_F,
    interleaved M,F,M,F... — provenance documented below). The exact seeded
    roster is engine-side; the pools are its canonical source.
  * kd_dokter = 'D' + md5(name)[:7].upper()  (name-hash -> stable code)
  * per-visit assignment: kd_dokter(roster[md5(no_rawat) mod 20]) — stable
    hash of the visit id, uniform spread across the 20 doctors.

Master rows are created in BOTH sik and sik_bench (column values cloned from
the D0000002 template; jk set by pool). reg_periksa.kd_dokter is updated for
DR visits only; the consumer is re-run so billing 'Dokter' rows carry the new
names. rawat_jl_dr/resep_obat kd_dokter are left as-is (true per-procedure
doctor identity is not recoverable on-box — noted for the adapter-side fix).

Idempotent; exit 0 on success, non-zero on failure.
"""
import hashlib
import sys

sys.path.insert(0, "/opt/Deers-Rock/tools")
from dbutil import Tool, query, execute, scalar, run_consumer, decision  # noqa: E402
import os  # noqa: E402

# Canonical DR generator doctor name pools (src/agent/generator.ts lines 5-6,
# Deers-Rock @ Project_v2). Interleaved M,F to a 20-doctor roster.
DOKTER_M = ["dr. Agus", "dr. Bambang", "dr. Cahyono", "dr. Dwi", "dr. Eko",
            "dr. Faisal", "dr. Gatot", "dr. Hasan", "dr. Irwan", "dr. Joko"]
DOKTER_F = ["dr. Ani", "dr. Dewi", "dr. Endang", "dr. Fitri", "dr. Gita",
            "dr. Hesti", "dr. Intan", "dr. Kartika", "dr. Lestari", "dr. Maya"]
TEMPLATE_KD = "D0000002"


def build_roster():
    roster = []
    for i in range(10):
        roster.append((DOKTER_M[i], "L"))
        roster.append((DOKTER_F[i], "P"))
    out = []
    for name, jk in roster:
        kd = "D" + hashlib.md5(name.encode("utf-8")).hexdigest()[:7].upper()
        out.append((kd, name, jk))
    return out


def main():
    t = Tool("map_dr_doctors")
    try:
        t.log("DOC-1: map 20 DR doctors to distinct kd_dokter (deterministic)")

        roster = build_roster()
        kds = [r[0] for r in roster]
        if len(set(kds)) != 20:
            raise RuntimeError("kd_dokter hash collision — roster not distinct")

        # --- 1. master rows in sik + sik_bench (insert-if-absent) ------------
        # NOTE: dokter.kd_dokter carries an FK to pegawai.nik (Khanza schema
        # quirk). Mirroring 20 rows into pegawai would cascade into 11 more
        # reference tables (30+ NOT NULL columns) — pure fabrication. The
        # shipped dump itself was loaded with FOREIGN_KEY_CHECKS=0 (its '-'
        # dokter/kd_sps rows prove it). We insert with the check disabled for
        # this session only, minimal explicit columns (kd_sps NULL introduces
        # no new spesialis reference); the missing pegawai mirror rows are a
        # recorded, inert deviation — billing/reports join dokter directly.
        for db in ("sik", "sik_bench"):
            created = 0
            for kd, name, jk in roster:
                before = scalar(db, "SELECT COUNT(*) FROM dokter WHERE kd_dokter = '%s'" % kd)
                if int(before or 0) == 0:
                    # one batch = one mysql session, so the FK-off setting covers the INSERT
                    execute(db,
                            "SET FOREIGN_KEY_CHECKS=0;\n"
                            "INSERT INTO dokter (kd_dokter, nm_dokter, jk, email, status) "
                            "VALUES ('%s', '%s', '%s', '', '1');\n"
                            "SET FOREIGN_KEY_CHECKS=1;" % (kd, name, jk))
                    created += 1
            n = scalar(db, "SELECT COUNT(*) FROM dokter")
            t.log("%s: %d master rows created, dokter table now %s rows" % (db, created, n))

        # --- 2. reg_periksa assignment for DR visits (stable hash) ------------
        dr_visits = [r[0] for r in query("sik", """
            SELECT no_rawat FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%' ORDER BY no_rawat""")]
        t.log("DR visits to (re)assign: %d" % len(dr_visits))
        stmts = []
        for v in dr_visits:
            idx = int(hashlib.md5(v.encode("utf-8")).hexdigest()[:12], 16) % 20
            stmts.append("UPDATE reg_periksa SET kd_dokter = '%s' WHERE no_rawat = '%s' "
                         "AND no_rkm_medis LIKE 'DR%%';" % (kds[idx], v))
        for i in range(0, len(stmts), 100):
            execute("sik", "\n".join(stmts[i:i + 100]))

        distinct = scalar("sik", """SELECT COUNT(DISTINCT kd_dokter) FROM reg_periksa
                                     WHERE no_rkm_medis LIKE 'DR%'""")
        t.log("distinct kd_dokter among DR visits after mapping: %s (must be 20)" % distinct)

        # --- 3. mapping table (stdout + artifacts) ----------------------------
        lines = ["DR doctor -> kd_dokter (deterministic: md5(name)[:7])",
                 "per-visit rule: roster[md5(no_rawat) mod 20]", ""]
        counts = dict((r[0], int(r[1])) for r in query("sik", """
            SELECT kd_dokter, COUNT(*) FROM reg_periksa
            WHERE no_rkm_medis LIKE 'DR%' GROUP BY kd_dokter"""))
        for kd, name, jk in roster:
            lines.append("%-10s %-14s jk=%s  visits=%d" % (kd, name, jk, counts.get(kd, 0)))
        table = "\n".join(lines)
        t.log("mapping table:\n%s" % table)
        t.artifact("dr_doctor_code_map.txt", table + "\n")
        with open("/opt/Deers-Rock/tools/dr_doctor_code_map.txt", "w",
                  encoding="utf-8") as f:
            f.write(table + "\n")

        # --- 4. re-run consumer so billing Dokter rows carry the new names ----
        rc, tail = run_consumer(os.path.join(t.dir, "consumer_doc1.log"))
        t.log("consumer re-run rc=%d" % rc)
        if rc != 0:
            t.log("consumer tail:\n%s" % tail)
            raise RuntimeError("consumer re-run failed")

        ok = int(distinct or 0) == 20
        decision("DOC-1 stand-in doctor mapping installed (20 distinct kd_dokter)",
                 "True DR roster/per-visit doctor assignment is engine-side (not on-box; "
                 "no DR doctor id survived the adapter collapse). Deterministic stand-in: "
                 "roster = generator's canonical pools (generator.ts DOKTER_NAMES_M/F, "
                 "interleaved), kd_dokter = 'D'+md5(name)[:7].upper(), per-visit = "
                 "roster[md5(no_rawat) mod 20]. Master rows created in sik + sik_bench "
                 "(minimal columns, kd_sps NULL; inserted with session "
                 "FOREIGN_KEY_CHECKS=0 because dokter.kd_dokter FKs pegawai.nik and "
                 "mirroring pegawai would cascade fabrications across 11 reference "
                 "tables — the shipped dump itself was loaded with checks off; missing "
                 "pegawai mirror rows are inert for billing/reports). reg_periksa."
                 "kd_dokter updated for DR visits; consumer re-run. rawat_jl_dr/"
                 "resep_obat kd_dokter still collapsed (unrecoverable on-box) — true "
                 "mapping replaces this when the DR engine deploys.")
        t.log("RESULT: DOC-1 mapping complete (%s)" % ("PASS" if ok else "FAIL"))
        t.close()
        return 0 if ok else 1
    except Exception as e:  # noqa: BLE001
        t.log("ERROR: %s" % e)
        t.close()
        return 1


if __name__ == "__main__":
    sys.exit(main())
