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
o.dbutil.RESULTS_ROOT = tempfile.mkdtemp()                 # exclusion markers go here
REAL_FENCE = o.fence_sessions
o.fence_sessions = lambda db, log, wait_s=10: (True, 0, [])   # restore cases: fencing mocked
o._bench_dml_privs = lambda db: []                           # restore cases: no grants held
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

# ---- writer exclusion around a restore (P10-B4) ----
GRANTS = [["DELETE", "INSERT", "UPDATE"]]
o._bench_dml_privs = lambda db: list(GRANTS[0])
write(meta)
del EXEC[:]
ok = restore()
seq_sql = [x.split(" ON ")[0] for x in EXEC if x.startswith(("REVOKE", "GRANT"))]
expect("B4 restore under exclusion: verified, REVOKE before and GRANT after",
       (ok, seq_sql), (True, ["REVOKE DELETE, INSERT, UPDATE", "GRANT DELETE, INSERT, UPDATE"]),
       "WRITER-EXCLUSION off")
first_dml = next(i for i, x in enumerate(EXEC) if x.startswith("DELETE"))
expect("B4 ... the restore DML ran only while revoked",
       0 < first_dml < EXEC.index(next(x for x in EXEC if x.startswith("GRANT"))), True)
expect("B4 ... and no exclusion marker is left after a clean exclusion",
       os.path.exists(o._exclusion_marker("fx")), False)
# a process that died inside the window left a marker: the next start grants back
with open(o._exclusion_marker("fx"), "w") as f:
    json.dump({"db": "fx", "privs": ["DELETE", "INSERT", "UPDATE"], "pid": 999999}, f)
del EXEC[:]
expect("B4 marker of a dead process -> grants given back, marker removed",
       (o.recover_writer_exclusion("fx", log), [x.split(" ON ")[0] for x in EXEC],
        os.path.exists(o._exclusion_marker("fx"))),
       (True, ["GRANT DELETE, INSERT, UPDATE"], False), "WRITER-EXCLUSION recovered")
o.fence_sessions = lambda db, log, wait_s=10: (False, 1, [99])
del EXEC[:]
expect("B4 fence fails -> restore refused, nothing deleted, grants given back",
       (restore(), [x for x in EXEC if x.startswith("DELETE")],
        [x.split(" ")[0] for x in EXEC if x.startswith(("REVOKE", "GRANT"))]),
       (False, [], ["REVOKE", "GRANT"]), "could not be fenced")
o.fence_sessions = lambda db, log, wait_s=10: (True, 0, [])
del EXEC[:]
r = o.stage_restore(NRS, "sik", rd, log, "u8", stage="B3", batch=BATCH)
expect("B4 live sik: exclusion skipped, no REVOKE/GRANT issued",
       [x for x in EXEC if x.startswith(("REVOKE", "GRANT"))], [], "WRITER-EXCLUSION skipped")
o._bench_dml_privs = lambda db: []

# ---- fence_sessions (P9-B4) ----
o.fence_sessions = REAL_FENCE
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

# ---- P11-T4 marker crash-safety (atomic write + fail-closed + operator fallback) ----
MARKER = o._exclusion_marker("fx")
# P15 E6: recovery now checks that the granted privileges are visible afterwards, so the
# T4 cases mock the benchmark account's privileges as present after a GRANT.
o._bench_dml_privs = lambda db: ["DELETE", "INSERT", "UPDATE"]

# (a) malformed / truncated marker -> refuse, marker KEPT, nothing granted (fail-closed)
with open(MARKER, "w") as f:
    f.write('{"db": "fx", "privs": ["DELETE", "INSERT", "UPDATE"], "pi')  # truncated JSON
del EXEC[:]
rm = o.recover_writer_exclusion("fx", log)
expect("T4 malformed marker -> refuse (False), marker KEPT, no GRANT issued (fail-closed)",
       (rm, os.path.exists(MARKER), [x.split(" ON ")[0] for x in EXEC if x.startswith("GRANT")]),
       (False, True, []), "WRITER-EXCLUSION marker unreadable")

# (b) a valid marker of a dead process -> grants the recorded privs back, marker removed
with open(MARKER, "w") as f:
    json.dump({"db": "fx", "privs": ["DELETE", "INSERT", "UPDATE"], "pid": 999999}, f)
del EXEC[:]
rm = o.recover_writer_exclusion("fx", log)
expect("T4 valid marker of a dead process -> grants back, marker removed",
       (rm, [x.split(" ON ")[0] for x in EXEC if x.startswith("GRANT")], os.path.exists(MARKER)),
       (True, ["GRANT DELETE, INSERT, UPDATE"], False), "WRITER-EXCLUSION recovered")

# (c) a marker whose recorded privs disagree with the operator's expectation -> refuse
with open(MARKER, "w") as f:
    json.dump({"db": "fx", "privs": ["INSERT"], "pid": 999999}, f)
del EXEC[:]
rm = o.recover_writer_exclusion("fx", log, expected_privs=["DELETE", "INSERT", "UPDATE"])
expect("T4 marker records INSERT only, operator expects D,I,U -> refuse (fail-closed)",
       (rm, os.path.exists(MARKER)), (False, True), "refusing to proceed")

# (d) operator fallback: unreadable marker + --recover-grants grants the expected set back
with open(MARKER, "w") as f:
    f.write('{"db": "fx", "privs": ["DELETE", "INS')  # truncated again
del EXEC[:]
rg = o._recover_grants_expected("fx", log, "DELETE,INSERT,UPDATE")
expect("T4 operator --recover-grants D,I,U on a fixture -> grants back, marker cleared",
       (rg, [x.split(" ON ")[0] for x in EXEC if x.startswith("GRANT")], os.path.exists(MARKER)),
       (True, ["GRANT DELETE, INSERT, UPDATE"], False), "recover-grants")

# (e) the pre-P11 fail-open path, shown by monkeypatching the old behaviour: an
#     unreadable marker was read as {} -> nothing granted and the marker DELETED.
old_recover = o.recover_writer_exclusion
def old_recover_fail_open(db, log, expected_privs=None):
    mp = o._exclusion_marker(db)
    if not os.path.exists(mp):
        return True
    try:
        m = json.load(open(mp))
    except Exception:
        m = {}
    privs = [p for p in (m.get("privs") or []) if p in ("INSERT", "UPDATE", "DELETE")]
    if privs:
        dbutil.execute(db, "GRANT %s ON `%s`.* TO %s" % (", ".join(privs), db, o.BENCH_ACCOUNT))
    os.remove(mp)
    return True
with open(MARKER, "w") as f:
    f.write('{"db": "fx", "privs": ["DELETE", "INS')  # truncated
del EXEC[:]
rm_old = old_recover_fail_open("fx", log)
expect("T4 OLD behaviour (monkeypatched fail-open): unreadable marker -> grants nothing, DELETED",
       (rm_old, os.path.exists(MARKER), [x.split(" ON ")[0] for x in EXEC if x.startswith("GRANT")]),
       (True, False, []))
# restore the real (P11) recover function for any later code
o.recover_writer_exclusion = old_recover
# and prove the NEW code (fail-closed) refuses the same marker the old code deleted
with open(MARKER, "w") as f:
    f.write('{"db": "fx", "privs": ["DELETE", "INS')
rm_new = o.recover_writer_exclusion("fx", log)
expect("T4 NEW behaviour: the same unreadable marker is REFUSED and KEPT (no fail-open)",
       (rm_new, os.path.exists(MARKER)), (False, True), "WRITER-EXCLUSION marker unreadable")

# ---- P15 E6: marker schema, grant verification, live holder ----
os.path.exists(MARKER) and os.remove(MARKER)
with open(MARKER, "w") as f:
    json.dump({}, f)
del EXEC[:]
expect("E6 marker {} -> unreadable: refuse, KEPT, no GRANT",
       (o.recover_writer_exclusion("fx", log), os.path.exists(MARKER),
        [x for x in EXEC if x.startswith("GRANT")]), (False, True, []), "lacks pid/privs")
with open(MARKER, "w") as f:
    json.dump({"db": "fx", "privs": ["DELETE", "INSERT", "UPDATE"], "pid": 999999}, f)
o._bench_dml_privs = lambda db: []          # the GRANT does not take effect
del EXEC[:]
expect("E6 grants not visible after GRANT -> refuse, marker KEPT",
       (o.recover_writer_exclusion("fx", log), os.path.exists(MARKER)), (False, True),
       "still missing after GRANT")
expect("E6 --recover-grants with grants not visible after GRANT -> refuse",
       o._recover_grants_expected("fx", log, "DELETE,INSERT,UPDATE"), False, "still missing")
o._bench_dml_privs = lambda db: ["DELETE", "INSERT", "UPDATE"]
with open(MARKER, "w") as f:
    json.dump({"db": "fx", "privs": ["DELETE", "INSERT", "UPDATE"], "pid": os.getppid()}, f)
del EXEC[:]
expect("E6 --recover-grants while the marker's holder is ALIVE -> refused, no GRANT, marker KEPT",
       (o._recover_grants_expected("fx", log, "DELETE,INSERT,UPDATE"),
        [x for x in EXEC if x.startswith("GRANT")], os.path.exists(MARKER)),
       (False, [], True), "held by live pid")
with open(MARKER, "w") as f:
    json.dump({"db": "fx", "privs": ["DELETE", "INSERT", "UPDATE"], "pid": 999999}, f)
expect("E6 --recover-grants on a READABLE marker -> granted, marker left for validation",
       (o._recover_grants_expected("fx", log, "DELETE,INSERT,UPDATE"), os.path.exists(MARKER)),
       (True, True), "left for validation")
expect("E6 ... then recover_writer_exclusion validates it against the expected set and deletes it",
       (o.recover_writer_exclusion("fx", log, expected_privs=["DELETE", "INSERT", "UPDATE"]),
        os.path.exists(MARKER)), (True, False), "WRITER-EXCLUSION recovered")

# ---- P15 E5: negative-control switches act only on the exact value 1, never on live ----
for _v, _want in (("0", False), ("", False), ("yes", False), ("1", True)):
    os.environ["R5_NEGCTL_BACKUP_NO_TXN"] = _v
    expect("E5 R5_NEGCTL_BACKUP_NO_TXN=%r on a fixture -> %s" % (_v, _want),
           o._negctl("R5_NEGCTL_BACKUP_NO_TXN", "fx"), _want)
os.environ["R5_NEGCTL_BACKUP_NO_TXN"] = "1"
try:
    o._negctl("R5_NEGCTL_BACKUP_NO_TXN", "sik")
    _live = "not refused"
except RuntimeError:
    _live = "refused"
expect("E5 switch=1 on live sik -> refused inside the helper", _live, "refused")
del os.environ["R5_NEGCTL_BACKUP_NO_TXN"]

# ---- P11-T6 stage-hash / live-hash coherence (two functions agree on identical data) ----
# _content_hash (live tables) and _stage_content_hash (stage tables) must give the
# SAME digest when the stage tables hold the same rows as the live tables — which is
# the invariant right after a stage_backup. The earlier monkeypatch that made
# _content_hash return GOOD is replaced here with the real function imported via
# a fresh import (importlib.reload is overkill; a second import of the module
# gives us the original, un-mocked names), and dbutil.query is mocked to return
# identical rows whether the query targets a live table or its staged variant.
CAPTURED_ROWS = [
    ["2026/10/01/800085", "Obat", "1000", "1", "1000"],
    ["2026/10/01/800085", "Prosedur", "500", "1", "500"],
    ["2026/10/01/800128", "Obat", "2000", "1", "2000"],
]
CAPTURED_REG = [
    ["2026/10/01/800085", "Belum Bayar"],
    ["2026/10/01/800128", "Belum Bayar"],
]
def _coherent_query(db, sql, **k):
    # Same rows whether the table is live or the staged variant; same for reg.
    if "status_bayar" in sql and "SELECT no_rawat" in sql:
        return CAPTURED_REG
    return CAPTURED_ROWS
# Restore the REAL _content_hash by reloading the module in a fresh namespace:
# the earlier monkeypatch replaced o._content_hash with a lambda, so we import
# the source directly and pull the original function out of it.
import importlib.util as _ilu, hashlib as _h, json as _j, os as _os
_spec = _ilu.spec_from_file_location(
    "srfdr5_real", _os.path.join(_os.path.dirname(_os.path.abspath(__file__)),
                                  "sampled_real_form_diff_r5.py"))
_real = _ilu.module_from_spec(_spec); _spec.loader.exec_module(_real)
orig_query = o.dbutil.query
o._content_hash       = _real._content_hash
o._stage_content_hash = _real._stage_content_hash
o.dbutil.query        = _coherent_query
h_live  = o._content_hash(NRS, "fx", log)
h_stage = o._stage_content_hash(NRS, "fx", pfx, log)
o.dbutil.query        = orig_query
expect("T6 _content_hash (live) and _stage_content_hash (staged) agree on identical data",
       h_live, h_stage)

print("P8/P9 recovery unit test: %d/%d cases %s" % (total - bad, total, "PASS" if bad == 0 else "FAIL"))
sys.exit(0 if bad == 0 else 1)
