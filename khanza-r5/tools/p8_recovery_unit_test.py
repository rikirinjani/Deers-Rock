#!/usr/bin/env python3
"""P8/P9 unit test for the oracle's recovery decisions, with the database mocked.

The suite (A18-A25) exercises the real paths on a fixture; this test covers the branches
a fixture cannot reach on demand, the real functions running on fake data:
  stage_restore (P8-C1/P9-B1): garbled JSON, wrong pfx, wrong batch, wrong visit set,
      non-hex sha -> False (UNVERIFIED, no exception); matching sha -> True; differing
      sha -> False (MISMATCH); missing stage tables -> False before any DELETE (P9).
  current_matches_prereset (P9-B2): equal / changed current content.
  fence_sessions (P9-B4): refused on a live DB; sessions killed and gone -> ok;
      a session that survives KILL -> not ok, and reap_writers then says WRITER-ALIVE.
  reap_writers (P8-C2): unkillable harness group -> WRITER-ALIVE; output changing during
      the quiet interval -> WRITER-ALIVE; writers gone and quiet -> proof.
Runs without MySQL (Linux, for /proc and fcntl): python3 p8_recovery_unit_test.py
"""
import json
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sampled_real_form_diff_r5 as o  # noqa: E402

LOG = []
log = LOG.append
NRS = ["2026/10/01/800085", "2026/10/01/800128"]
BATCH = "2026-10-01"
EXEC = []
o.dbutil.execute = lambda db, sql, **k: EXEC.append(sql)   # SQL: recorded, not run
o.time.sleep = lambda s: None
pfx = o._stage_prefix("u8", "B3")
STAGE_TABLES = ["%s_%s" % (pfx, t) for t in o.RESET_TABLES] + ["%s_reg" % pfx]
o.dbutil.query = lambda db, sql, **k: [[t] for t in STAGE_TABLES]
bad = 0
total = 0


def expect(name, got, want, marker=None):
    global bad, total
    total += 1
    ok = got == want and (marker is None or any(marker in l for l in LOG))
    bad += 0 if ok else 1
    print("%s  %-64s got=%s want=%s%s" % ("PASS" if ok else "FAIL", name, got, want,
                                          "" if marker is None else " marker=%s" % marker))
    del LOG[:]


rd = tempfile.mkdtemp()
hp = o._hash_path(rd, pfx, BATCH)
GOOD = "a" * 64
o._content_hash = lambda nrs, db, log: GOOD


def write(meta_or_text):
    with open(hp, "w") as f:
        f.write(meta_or_text if isinstance(meta_or_text, str) else json.dumps(meta_or_text))


def restore():
    try:
        return o.stage_restore(NRS, "fx", rd, log, "u8", stage="B3", batch=BATCH)
    except Exception as e:  # any exception is a failure of P8-C1
        return "EXC:%s" % type(e).__name__


meta = {"pfx": pfx, "batch": BATCH, "nrs": NRS, "sha256": GOOD}
write('{"pfx": "%s", "sha2' % pfx)
expect("C1 truncated JSON -> unverified, no exception", restore(), False, "hash file unreadable")
write(dict(meta, pfx="r5_stage_B3_other"))
expect("C1 foreign pfx -> unverified", restore(), False, "does not describe this batch")
write(dict(meta, batch="2026-10-02"))
expect("B1 hash file of another batch -> unverified", restore(), False, "does not describe this batch")
write(dict(meta, nrs=NRS[:1]))
expect("C1 different visit set -> unverified", restore(), False, "does not describe this batch")
write(dict(meta, sha256="not-a-hash"))
expect("C1 non-hex sha256 -> unverified", restore(), False, "does not describe this batch")
write(dict(meta, sha256="b" * 64))
expect("C1 valid file, different content -> mismatch", restore(), False, "STAGE-RESTORE-MISMATCH")
write(meta)
expect("C1 valid file, same content -> verified", restore(), True, "STAGE-RESTORED-VERIFIED")
o.dbutil.query = lambda db, sql, **k: [[t] for t in STAGE_TABLES[:-2]]
del EXEC[:]
expect("P9 stage tables missing -> refused", restore(), False, "stage tables missing")
expect("P9 ... and nothing was deleted", [s for s in EXEC if s.startswith("DELETE")], [])
o.dbutil.query = lambda db, sql, **k: [[t] for t in STAGE_TABLES]
os.remove(hp)
expect("P7 missing hash file -> unverified", restore(), False, "pre-reset hash file absent")

# ---- current_matches_prereset (P9-B2) ----
write(meta)
expect("B2 current content equals pre-reset hash",
       o.current_matches_prereset(NRS, "fx", rd, log, "u8", "B3", BATCH)[0], True)
o._content_hash = lambda nrs, db, log: "c" * 64
expect("B2 current content changed since verification",
       o.current_matches_prereset(NRS, "fx", rd, log, "u8", "B3", BATCH)[0], False)
o._content_hash = lambda nrs, db, log: GOOD

# ---- fence_sessions (P9-B4) ----
o._mysql_clients = lambda db: []
expect("B4 fencing refused on live sik (no KILL issued)", o.fence_sessions("sik", log)[:2], (True, 0),
       "FENCE-SKIPPED")
seq = iter([[[11, "root", "Query", 5, "SELECT SLEEP(600)"]], []])
o._target_sessions = lambda db: next(seq)
del EXEC[:]
r = o.fence_sessions("sik_p6f", log)
expect("B4 session on the fixture KILLed and gone -> ok", (r[0], r[1], EXEC), (True, 1, ["KILL 11"]),
       "sessions_killed=1 remaining=0")
o._target_sessions = lambda db: [[12, "root", "Query", 5, "SELECT SLEEP(600)"]]
expect("B4 session survives KILL -> not ok", o.fence_sessions("sik_p6f", log, wait_s=1)[0], False)

# ---- reap_writers ----
st = {"batches": {BATCH: {"visits": NRS, "status": "RESET"}}}
pidf = os.path.join(rd, "harness_2026_10_01.log.pid")
with open(pidf, "w") as f:
    f.write("424242")
o._harness_writers = lambda nrs: {}
o._group_alive = lambda g: False
expect("B4 reap with a surviving server session -> WRITER-ALIVE",
       o.reap_writers(st, rd, "sik_p6f", log, [BATCH], 0), False, "fence_ok=False")
o._target_sessions = lambda db: []
o._group_alive = lambda g: True                   # a group that never dies
o._kill_pgid = lambda g, grace_s=10: False
expect("C2 unkillable harness group -> WRITER-ALIVE", o.reap_writers(st, rd, "sik_p6f", log, [BATCH], 0),
       False, "WRITER-ALIVE")
o._group_alive = lambda g: False
seq2 = iter(["h1", "h2"])                         # output changes between the two reads
o._content_hash = lambda nrs, db, log: next(seq2)
expect("C2 writers gone but output still changing -> WRITER-ALIVE",
       o.reap_writers(st, rd, "sik_p6f", log, [BATCH], 0), False, "quiet=False")
o._content_hash = lambda nrs, db, log: GOOD
expect("C2 writers gone, fenced, output quiet -> proof",
       o.reap_writers(st, rd, "sik_p6f", log, [BATCH], 0), True, "WRITER-DEAD-PROOF (resume, P8-C2)")
expect("C2 pid file removed only after the proof", os.path.exists(pidf), False)

print("P8/P9 recovery unit test: %d/%d cases %s" % (total - bad, total, "PASS" if bad == 0 else "FAIL"))
sys.exit(0 if bad == 0 else 1)
