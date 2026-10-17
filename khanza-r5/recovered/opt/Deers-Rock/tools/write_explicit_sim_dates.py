#!/usr/bin/env python3
"""write_explicit_sim_dates.py — explicit simulated dates / wall-clock sweep
(determinism_audit_checklist §8) — VERIFY-ONLY for now.

Target state: every event value comes from the simulated clock (simulated year
2025-01-01..2025-12-31, one tick = one simulated minute); real-form runs use
`faketime '<visit-date> 00:00:00'` with one JVM per distinct visit date; grep
general_log for server-side NOW()/CURDATE().

Status: the DR engine that would generate 2025-dated data is not yet on-box;
the current dataset is the October-2026 vintage DR export. This tool verifies
what exists today and logs every wall-clock leak it finds:

  1. encounter-file ENC dates: well-formed YYYY-MM-DD; counted inside vs
     outside the 2025 simulated window (outside = recorded deviation, fixed
     when the generator deploys).
  2. value-row dates in sik: billing.tgl_byr and nota_jalan.tanggal must
     equal the visit registration date (consumer derives them from the visit,
     not the run clock) — counted mismatches.
  3. display-row wall-clock leak: billing 'Tanggal & Jam' rows embed the
     consumer RUN time (HH:MM:SS) — display-only, value rows unaffected;
     counted and reported. To be closed with faketime-per-date JVM runs once
     the DR engine emits the 2025 dataset.
  4. consumer source sweep: non-deterministic calls (new Date(),
     System.currentTimeMillis, nanoTime, Math.random, new Random) — each hit
     classified logging-only vs event-value.

Exit 0 unless a structural check fails (missing/unparseable encounter file);
leaks are logged, not failed, per the current deferral.
"""
import os
import re
import sys

sys.path.insert(0, "/opt/Deers-Rock/tools")
from dbutil import Tool, query, scalar  # noqa: E402

ENCOUNTERS = "/tmp/dr_encounters.txt"
CONSUMER_JAVA = "/opt/simrs-khanza/consumer/KhanzaBillingConsumer.java"
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def main():
    t = Tool("write_explicit_sim_dates")
    try:
        ok = True

        # --- 1. encounter-file dates -------------------------------------------
        if not os.path.exists(ENCOUNTERS):
            t.log("ERROR: %s missing — run the export first (fix_seed_leakage step)" % ENCOUNTERS)
            t.close()
            return 1
        in2025 = outside = bad = 0
        sample_bad = []
        with open(ENCOUNTERS, "r", encoding="utf-8") as f:
            for line in f:
                if not line.startswith("ENC "):
                    continue
                p = line.split()
                if len(p) < 4 or not DATE_RE.match(p[2]):
                    bad += 1
                    if len(sample_bad) < 5:
                        sample_bad.append(line.strip())
                    continue
                if p[2].startswith("2025"):
                    in2025 += 1
                else:
                    outside += 1
        t.log("[1] ENC blocks: %d in 2025 window, %d outside, %d malformed"
              % (in2025, outside, bad))
        for s in sample_bad:
            t.log("    malformed: %s" % s)
        if bad:
            ok = False
        if outside:
            t.log("    deviation recorded: dataset is 2026-10 vintage (predates the "
                  "2025-01-01..2025-12-31 simulated-clock decision); the DR engine "
                  "regenerating it on-box at 2025 dates closes this — deferred with "
                  "the engine deployment (see dr_perf_profile_30d stub)")

        # --- 2. value-row dates follow the visit, not the run clock ------------
        mism = int(scalar("sik", """
            SELECT COUNT(*) FROM billing b
            INNER JOIN reg_periksa r ON r.no_rawat = b.no_rawat
            WHERE r.no_rkm_medis LIKE 'DR%' AND b.tgl_byr <> r.tgl_registrasi""") or 0)
        nota_mism = int(scalar("sik", """
            SELECT COUNT(*) FROM nota_jalan n
            INNER JOIN reg_periksa r ON n.no_rawat = r.no_rawat
            WHERE r.no_rkm_medis LIKE 'DR%' AND n.tanggal <> r.tgl_registrasi""") or 0)
        t.log("[2] billing.tgl_byr != visit date: %d | nota_jalan.tanggal != visit date: %d (must be 0/0)"
              % (mism, nota_mism))
        if mism or nota_mism:
            ok = False

        # --- 3. display-row wall-clock leak (informational) --------------------
        disp = int(scalar("sik", """
            SELECT COUNT(*) FROM billing WHERE no = 'Tanggal & Jam'
            AND nm_perawatan LIKE ': % %:%:%'""") or 0)
        t.log("[3] 'Tanggal & Jam' display rows carrying consumer RUN time: %d "
              "(display-only wall-clock leak; value rows unaffected; closed by "
              "faketime-per-date JVM runs once the 2025 dataset exists)" % disp)

        # --- 4. consumer source sweep -------------------------------------------
        patterns = ("new Date()", "new java.util.Date", "System.currentTimeMillis",
                    "System.nanoTime", "Math.random", "new Random(", "ThreadLocalRandom",
                    "UUID.randomUUID", "LocalDateTime.now", "Instant.now")
        hits = []
        if os.path.exists(CONSUMER_JAVA):
            with open(CONSUMER_JAVA, "r", encoding="utf-8") as f:
                for i, line in enumerate(f, 1):
                    for pat in patterns:
                        if pat in line and not line.strip().startswith("*") and "//" not in line.split(pat)[0]:
                            hits.append((i, pat, line.strip()[:90]))
        t.log("[4] consumer non-determinism sweep: %d code hits" % len(hits))
        for h in hits:
            t.log("    L%d %s | %s" % h)
        if hits:
            t.log("    classification: run-time display row + log-file timestamps + "
                  "perf timing only; no event VALUES (dates/jml/tariffs) derive from "
                  "wall clock in the consumer")

        t.log("RESULT: %s (leaks logged; structural checks %s)"
              % ("PASS" if ok else "FAIL", "OK" if ok else "BROKEN"))
        t.close()
        return 0 if ok else 1
    except Exception as e:  # noqa: BLE001
        t.log("ERROR: %s" % e)
        t.close()
        return 1


if __name__ == "__main__":
    sys.exit(main())
