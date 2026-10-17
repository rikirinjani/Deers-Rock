#!/usr/bin/env python3
"""P8-C unit test for the oracle's recovery decisions, with the database mocked.

The suite (A18-A21) exercises the real paths on a fixture; this test covers the branches
a fixture cannot reach on demand, the real functions running on fake data:
  stage_restore (P8-C1): garbled JSON, wrong pfx, wrong visit set, non-hex sha -> False
      (UNVERIFIED, no exception); matching sha -> True; differing sha -> False (MISMATCH).
  reap_writers (P8-C2): a group that will not die -> False (WRITER-ALIVE);
      writers gone but output changing during the quiet interval -> False;
      writers gone and output quiet -> True.
Runs anywhere (no MySQL, no /proc dependency): python3 p8_recovery_unit_test.py
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
o.dbutil.execute = lambda *a, **k: None          # restore SQL: no-op
o.time.sleep = lambda s: None
bad = 0


def expect(name, got, want, marker=None):
    global bad
    ok = got == want and (marker is None or any(marker in l for l in LOG))
    bad += 0 if ok else 1
    print("%s  %-62s got=%s want=%s%s" % ("PASS" if ok else "FAIL", name, got, want,
                                          "" if marker is None else " marker=%s" % marker))
    del LOG[:]


rd = tempfile.mkdtemp()
pfx = o._stage_prefix("u8", "B3")
hp = os.path.join(rd, "stage_content_hash_%s.json" % pfx)
GOOD = "a" * 64
o._content_hash = lambda nrs, db, log: GOOD


def write(text):
    with open(hp, "w") as f:
        f.write(text)


def restore():
    try:
        return o.stage_restore(NRS, "fx", rd, log, "u8", stage="B3")
    except Exception as e:  # any exception is a failure of P8-C1
        return "EXC:%s" % type(e).__name__


write('{"pfx": "%s", "sha2' % pfx)
expect("C1 truncated JSON -> unverified, no exception", restore(), False, "hash file unreadable")
write(json.dumps({"pfx": "r5_stage_B3_other", "nrs": NRS, "sha256": GOOD}))
expect("C1 foreign pfx -> unverified", restore(), False, "does not describe this batch")
write(json.dumps({"pfx": pfx, "nrs": NRS[:1], "sha256": GOOD}))
expect("C1 different visit set -> unverified", restore(), False, "does not describe this batch")
write(json.dumps({"pfx": pfx, "nrs": NRS, "sha256": "not-a-hash"}))
expect("C1 non-hex sha256 -> unverified", restore(), False, "does not describe this batch")
write(json.dumps({"pfx": pfx, "nrs": NRS, "sha256": "b" * 64}))
expect("C1 valid file, different content -> mismatch", restore(), False, "STAGE-RESTORE-MISMATCH")
write(json.dumps({"pfx": pfx, "nrs": NRS, "sha256": GOOD}))
expect("C1 valid file, same content -> verified", restore(), True, "STAGE-RESTORED-VERIFIED")
os.remove(hp)
expect("P7 missing file -> unverified", restore(), False, "pre-reset hash file absent")

# ---- reap_writers ----
st = {"batches": {"2026-10-01": {"visits": NRS, "status": "RESET"}}}
with open(os.path.join(rd, "harness_2026_10_01.log.pid"), "w") as f:
    f.write("424242")
o._harness_writers = lambda nrs: {}
o._group_alive = lambda g: True                   # a group that never dies
o._kill_pgid = lambda g, grace_s=10: False
expect("C2 unkillable harness group -> WRITER-ALIVE", o.reap_writers(st, rd, "fx", log, ["2026-10-01"], 0),
       False, "WRITER-ALIVE")
o._group_alive = lambda g: False
seq = iter(["h1", "h2"])                          # output changes between the two reads
o._content_hash = lambda nrs, db, log: next(seq)
expect("C2 writers gone but output still changing -> WRITER-ALIVE",
       o.reap_writers(st, rd, "fx", log, ["2026-10-01"], 0), False, "quiet=False")
o._content_hash = lambda nrs, db, log: GOOD
expect("C2 writers gone, output quiet -> proof", o.reap_writers(st, rd, "fx", log, ["2026-10-01"], 0),
       True, "WRITER-DEAD-PROOF (resume, P8-C2)")
expect("C2 pid file removed only after the proof",
       os.path.exists(os.path.join(rd, "harness_2026_10_01.log.pid")), False)

print("P8 recovery unit test: %d/%d cases %s" % (11 - bad, 11, "PASS" if bad == 0 else "FAIL"))
sys.exit(0 if bad == 0 else 1)
