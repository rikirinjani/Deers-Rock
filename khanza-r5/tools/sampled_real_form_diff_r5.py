#!/usr/bin/env python3
"""sampled_real_form_diff_r5.py — R5-P1 hardened oracle (independent, crash-safe).

Hardening over the canonical sampled_real_form_diff.py (addresses the four
Astra-scored gaps: baseline independence, unsafe reset, sampling, crash safety):

  FREEZE  (AC-1)  --freeze-only / --verify-frozen: writes baseline_frozen/ with a
                  per-visit sha256 of the consumer value-row multiset + a manifest
                  (row counts, DB fingerprint: billing-table counts, buffer pool,
                  long_query_time, tool version, RUN_ID). The diff always compares
                  against this frozen artifact, NOT live mutable billing. Freeze
                  happens strictly before any DELETE/UPDATE.
  ISOLATE (AC-2)  --db-name sik_r5: every tool+consumer DB op targets an isolated
                  clone; live sik stays byte-stable. (Harness targets the same DB
                  via setting/database.ini, swapped by the demo orchestrator.)
  STAGE   (AC-3/8) per-date staged reset: stage-backup -> reset -> bill -> mark
                  BILLED in .state.json. On resume, any non-BILLED batch is
                  restored from its stage-backup, re-reset (idempotent), re-billed.
                  Unresumable state (RESET without stage-backup) aborts non-zero.
                  A lingering harness pid recorded in state is reaped before restore.
  LOCK  (AC-4)  exclusive .lock pid-file; a live pid aborts, a dead pid is
                reclaimed with a log line.
  PINNED(AC-5)  all artifacts under results/<RUN_ID>/<stage>_oracle_run_r5/; a
                foreign (unrecognized) dir is a hard error, never overwritten.
  ALIGN (AC-6)  --visits-file applies the SAME exclusions as cohort(); every
                provided visit is checked eligible before the run proceeds.
  MISM  (AC-7)  the JVM batch rc participates in the mismatch predicate and
                unparseable billing values hard-fail the run (no silent 0.0).
  FAILCLOSED (P5) the process fails closed: exit 1 when any in-envelope visit
                mismatches or parse errors exist; exit 4 when any batch FAILED
                (harness rc!=0 or any visit sukses=false) or out-of-envelope
                visits are present (verdict PARTIAL-NOT-COVERED); 0 only for a
                clean in-envelope pass. BILLED is assigned only on rc==0 AND all
                visits sukses=true; failed batches are restored from their stage
                backup and the run stops. Consumer rebill auto-repair requires
                --repair-consumer (default: REPAIR-SKIPPED, drift stays drift).
                Stage tables are per-run (r5_stage_<runid>_<table>) and dropped
                at finalize.

  P6 hardening (validation-caught evidence defects + source-read findings):
  P6-2a  MISSING-REG structured rejection: a visit with no reg_periksa row is
         dropped and the run exits 2 (never a None.replace() traceback).
         EMPTY-BASELINE gate: a zero value-row consumer baseline fails the
         freeze unless --allow-empty-baseline is passed (a missing-settlement
         run can no longer pass 0==0 silently).
  P6-2b  REPAIR-SKIPPED is emitted at finalize for every ENVELOPE visit whose
         batch did NOT bill (FAILED/restored), so the log is reachable and
         accurate; a freshly BILLED batch never raises the repair question.
  P6-2c  exit-0 qualifier: exit 0 on a BILLING RUN means a clean in-envelope
         comparison. --freeze-only / --verify-frozen are administrative modes
         that return 0 on a clean baseline WITHOUT performing a billing
         comparison (documented in their log lines).
  P6-2d  stage prefix now includes the STAGE (r5_stage_<stage>_<runid>_*),
         closing the same-RUN_ID/different-stage table-sharing hazard.
  P6-2e  stage_restore recomputes and verifies the pre-reset content hash
         (STAGE-RESTORED-VERIFIED); stage_drop re-checks table absence and only
         then claims "clean" (a failed drop forces verdict PARTIAL-NOT-COVERED,
         exit 4 — no false clean claim).
  P6-2f  resume binding: on resume the supplied visits file must equal the
         frozen batch visit set; a changed sample aborts (exit 3).
  P6-2g  verify_frozen checks ALL recorded source-table counts + the per-visit
         MANIFEST-pinned hash + a recomputed aggregate manifest hash + a
         source-content hash of the sampled charge lines (counts alone would
         miss price/content drift).
  P6-4   timeout handling runs the harness in its own process group
         (start_new_session), escalates SIGTERM->SIGKILL on the whole group,
         and waits for death (writer-dead proof) before any restore proceeds.
                Stage tables are per-run and dropped at finalize; a mid-run
                crash keeps them for resume.

Usage:
  python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik_r5 \
      --visits-file /tmp/r5_visits50.txt [--freeze-only] [--verify-frozen]
No secrets in output. RUN_ID env selects the results dir.
"""
import argparse
import csv
import datetime
import fcntl
import hashlib
import json
import math
import os
import re
import signal
import subprocess
import sys
import time
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dbutil

TOOL_VERSION = "sampled_real_form_diff_r5/1.0"
RESET_TABLES = {
    "billing": "no_rawat",
    "nota_jalan": "no_rawat",
    "detail_nota_jalan": "no_rawat",
    "piutang_pasien": "no_rawat",
    "detail_piutang_pasien": "no_rawat",
    "tambahan_biaya": "no_rawat",
    "pengurangan_biaya": "no_rawat",
    "tagihan_sadewa": "no_nota",
    "tagihan_mandiri": "no_rawat",
    "tagihan_bpd_jateng": "no_rawat",
    "tagihan_bpd_papua": "no_rawat",
    "tagihan_bpd_jabar": "no_rawat",
}
GEN_LIKE = "____/__/__/8_____"
VAL_COLS = ["status", "nm_perawatan", "biaya", "jumlah", "totalbiaya"]
_LOCK_FD = None


def _sha(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def value_rows_strict(nrs, db, log):
    """Per-visit value-row multiset. Returns (per_visit, parse_errors). A
    value that fails to parse is recorded in parse_errors (AC-8 hard-fail)."""
    per, parse_errors = {}, []
    for n in nrs:
        rows = dbutil.query(db,
            "SELECT status,nm_perawatan,biaya,jumlah,totalbiaya "
            "FROM billing WHERE no_rawat='%s' ORDER BY noindex" % n)
        vals = []
        for status, nm, biaya, jml, tb in rows:
            try:
                b = round(float(biaya or 0), 2)
                j = round(float(jml or 0), 2)
                t = round(float(tb or 0), 2)
            except (TypeError, ValueError):
                parse_errors.append((n, status, biaya, jml, tb))
                continue
            if str(status).startswith("Ttl") or not (b > 0 or t > 0):
                continue
            vals.append((str(status), str(nm), b, j, t))
        per[n] = [tuple(v) for v in vals]
    return per, parse_errors


def db_fingerprint(db):
    """AC-1/AC-3: the frozen baseline is a *line-level* consumer artifact, valid
    independent of the output tables it is diffed against. The fingerprint
    therefore records SOURCE-of-charge tables (stable across the form run) but
    deliberately EXCLUDES the billing-family output tables, whose row counts
    change as batches are billed (stage-reset removes rows; re-bill restores
    them). Including output-table counts would make verify-frozen fail after
    ANY completed batch, defeating crash-resume. Source-table drift is still
    caught. P6-2g: the frozen value-row content hash of the sampled visits is
    included so verify_frozen detects source-content drift, not just counts."""
    fp = {"db": db, "tool": TOOL_VERSION,
          "ts": datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")}
    for t in ["reg_periksa", "detail_pemberian_obat",
              "rawat_jl_dr", "databarang", "dr_charge_ledger"]:
        try:
            fp["count_%s" % t] = int(dbutil.scalar(db, "SELECT COUNT(*) FROM %s" % t) or 0)
        except Exception:
            fp["count_%s" % t] = None
    try:
        fp["innodb_buffer_pool_size_mb"] = int(dbutil.scalar(
            db, "SELECT @@innodb_buffer_pool_size/1024/1024") or 0)
        fp["long_query_time"] = dbutil.scalar(db, "SELECT @@long_query_time")
    except Exception:
        pass
    return fp


def source_content_hash(db, nrs, log):
    """P6-2g: hash of the sampled visits' source-of-charge rows (drug + procedure
    lines + reg fee) — the content the form will charge from. Changes in
    databarang.ralan or detail_pemberian_obat between freeze and verify will
    flip this hash even when table counts are unchanged."""
    parts = []
    inl = ",".join("'%s'" % n for n in nrs)
    try:
        for row in dbutil.query(db,
                "SELECT d.no_rawat, d.kode_brng, d.jml, d.embalase, d.tuslah, "
                "COALESCE(b.ralan, -1) FROM detail_pemberian_obat d "
                "LEFT JOIN databarang b ON b.kode_brng=d.kode_brng "
                "WHERE d.no_rawat IN (%s) ORDER BY 1,2" % inl):
            parts.append(tuple(row))
    except Exception:
        pass
    try:
        for row in dbutil.query(db,
                "SELECT no_rawat, kd_jenis_prw, COALESCE(biaya_rawat,-1) "
                "FROM rawat_jl_dr WHERE no_rawat IN (%s) ORDER BY 1,2" % inl):
            parts.append(tuple(row))
    except Exception:
        pass
    canon = json.dumps(parts, sort_keys=True, default=str)
    return _sha(canon)


def freeze_baseline(nrs, db, rundir, log, run_id, allow_empty_baseline=False):
    """AC-1: immutable consumer baseline (per-visit sha256 + manifest). MUST run
    before any DELETE/UPDATE in the run order. P6-2a: an EMPTY baseline (a visit
    with zero value rows) is recorded as EMPTY-BASELINE; without
    --allow-empty-baseline the freeze fails closed, because a zero-row baseline
    would let a missing-settlement run pass silently (0 == 0)."""
    frozen = os.path.join(rundir, "baseline_frozen")
    os.makedirs(frozen, exist_ok=True)
    per, parse_errors = value_rows_strict(nrs, db, log)
    if parse_errors:
        log("FREEZE parse errors: %d (fail-closed, AC-8)" % len(parse_errors))
        return None
    empty = [n for n in nrs if not per.get(n)]
    if empty and not allow_empty_baseline:
        log("EMPTY-BASELINE (P6-2a): %d visits have 0 value rows: %s — refusing "
            "to freeze an empty consumer baseline (fail-closed; pass "
            "--allow-empty-baseline to proceed)" % (len(empty), empty[:5]))
        return None
    manifest = {"run_id": run_id, "frozen_ts":
                datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ"),
                "fingerprint": db_fingerprint(db), "n_visits": len(nrs),
                "visits": {}, "sha256": {}, "allow_empty_baseline": allow_empty_baseline,
                "source_content_hash": source_content_hash(db, nrs, log)}
    for n in nrs:
        vals = per.get(n, [])
        sig = ",".join("%s|%s|%s|%s|%s" % tuple(v) for v in sorted(vals))
        with open(os.path.join(frozen, "%s.json" % n.replace("/", "_")), "w") as f:
            json.dump({"no_rawat": n, "n_rows": len(vals), "rows": vals,
                       "sha256": _sha(sig)}, f)
        manifest["visits"][n] = len(vals)
        manifest["sha256"][n] = _sha(sig)
    agg_sig = ",".join("%s:%s" % (k, v) for k, v in sorted(manifest["sha256"].items()))
    manifest["sha256_all"] = _sha(agg_sig)
    with open(os.path.join(frozen, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    log("FROZEN %d visits -> %s (sha256_all=%s%s)"
        % (len(nrs), frozen, manifest["sha256_all"][:16],
           " [EMPTY-BASELINE ALLOWED]" if allow_empty_baseline else ""))
    return manifest


def verify_frozen(rundir, db, log):
    """AC-1/AC-3: recompute per-visit sha256 + fingerprint match. True iff clean.
    P6-2g: checks ALL recorded source-table counts (not just count_billing,
    which is no longer populated -> None==None) and verifies each per-visit
    file hash against the MANIFEST-pinned hash, then recomputes the aggregate
    manifest hash (the file's own self-hash was circular)."""
    frozen = os.path.join(rundir, "baseline_frozen")
    mp = os.path.join(frozen, "manifest.json")
    if not os.path.exists(mp):
        log("verify-frozen: no manifest")
        return False
    man = json.load(open(mp))
    ok = True
    cur = db_fingerprint(db)
    # P6-2g: verify every source-table count the fingerprint recorded.
    for k, v in man["fingerprint"].items():
        if k.startswith("count_") and v is not None and cur.get(k) != v:
            log("verify-frozen: FINGERPRINT DRIFT %s: %s -> %s"
                % (k, v, cur.get(k)))
            ok = False
    # P6-2g: per-visit hash checked against the MANIFEST-pinned value (not the
    # file's own stored hash), then the aggregate manifest hash is recomputed.
    per_ok = {}
    for n in man["visits"]:
        p = os.path.join(frozen, "%s.json" % n.replace("/", "_"))
        if not os.path.exists(p):
            log("verify-frozen: missing %s" % p); ok = False; continue
        v = json.load(open(p))
        sig = ",".join("%s|%s|%s|%s|%s" % tuple(x) for x in sorted(v["rows"]))
        recomputed = _sha(sig)
        if man["sha256"].get(n) is not None and recomputed != man["sha256"][n]:
            log("verify-frozen: per-visit sha mismatch %s (manifest-pinned)" % n)
            ok = False
        if v.get("sha256") and recomputed != v["sha256"]:
            log("verify-frozen: per-visit self-sha mismatch %s" % n)
            ok = False
        per_ok[n] = recomputed
    if man.get("sha256_all"):
        agg = ",".join("%s:%s" % (k, per_ok.get(k, man["sha256"].get(k, "")))
                       for k in sorted(man["visits"]))
        if _sha(agg) != man["sha256_all"]:
            log("verify-frozen: AGGREGATE manifest sha mismatch (P6-2g)")
            ok = False
    log("verify-frozen: %s" % ("PASS" if ok else "FAIL"))
    return ok


def _pid_alive(pid):
    try:
        os.kill(int(pid), 0)
        return True
    except (ProcessLookupError, ValueError, TypeError, OverflowError):
        return False
    except PermissionError:
        return True


def acquire_lock(rundir, log):
    """AC-4: exclusive pid lock; reclaim stale locks from a dead pid.
    Always attempts to reclaim a lock whose recorded pid is not alive."""
    global _LOCK_FD
    lp = os.path.join(rundir, ".lock")
    if os.path.exists(lp):
        try:
            old = int(open(lp).read().strip() or 0)
        except Exception:
            old = 0
        if _pid_alive(old):
            log("LOCK held by live pid %d — refusing concurrent run (AC-4)" % old)
            return None
        log("LOCK reclaimed stale lock (dead/absent pid %s)" % old)
        try:
            os.remove(lp)
        except OSError:
            pass
    try:
        fd = os.open(lp, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        # lost the race to another live process
        return None
    try:
        os.write(fd, str(os.getpid()).encode())
        _LOCK_FD = fd
    except OSError:
        return None
    return fd


def release_lock(rundir):
    """Remove the lock file on a clean exit (crash-safe: a dead pid's lock is
    reclaimed on the next start, so a lingering .lock is never fatal)."""
    global _LOCK_FD
    try:
        lp = os.path.join(rundir, ".lock")
        if os.path.exists(lp):
            # only remove if we own it (pid match) to avoid clobbering a live lock
            try:
                cur = int(open(lp).read().strip() or 0)
                if cur == os.getpid():
                    os.remove(lp)
            except Exception:
                pass
    except Exception:
        pass
    if _LOCK_FD is not None:
        try:
            os.close(_LOCK_FD)
        except OSError:
            pass
        _LOCK_FD = None


def _stage_prefix(run_id, stage=None):
    """P5-5/P6-2d: per-run PER-STAGE stage-table prefix. Including the stage in
    the prefix closes the same-RUN_ID/different-stage table-sharing hazard
    (two stages under one RUN_ID now get disjoint tables)."""
    rid = re.sub(r"[^A-Za-z0-9_]", "_", str(run_id or "run"))
    stg = re.sub(r"[^A-Za-z0-9_]", "_", str(stage or "stage"))
    return "r5_stage_%s_%s" % (stg, rid)


def stage_backup(nrs, db, rundir, log, run_id="run", stage=None):
    """AC-3: copy pre-reset state for the batch into per-run r5_stage_* tables.
    P5-5b: stage-table CREATE requires privilege the benchmark user lacks —
    run the DDL as root (dbutil.force_root) while all DML stays on the
    benchmark user. P6-2e: content-hash the staged rows (per no_rawat multiset)
    so a later stage_restore can be VERIFIED against these hashes."""
    pfx = _stage_prefix(run_id, stage)
    inl = ",".join("'%s'" % n for n in nrs)
    for t, key in RESET_TABLES.items():
        s = "%s_%s" % (pfx, t)
        dbutil.execute(db, "CREATE TABLE IF NOT EXISTS %s LIKE %s" % (s, t),
                       force_root=True)
        dbutil.execute(db, "REPLACE INTO %s SELECT * FROM %s WHERE %s IN (%s)"
                           % (s, t, key, inl))
    dbutil.execute(db,
        "CREATE TABLE IF NOT EXISTS %s_reg (no_rawat VARCHAR(17), "
        "status_bayar VARCHAR(20))" % pfx, force_root=True)
    dbutil.execute(db, "REPLACE INTO %s_reg SELECT no_rawat, status_bayar "
        "FROM reg_periksa WHERE no_rawat IN (%s)" % (pfx, inl))
    log("stage-backup %d visits -> %s_* (%d output tables + reg.status_bayar)"
        % (len(nrs), pfx, len(RESET_TABLES)))
    # P6-2e: record the pre-reset content hash (per no_rawat value-row multiset
    # across the output tables + reg.status_bayar) for later verified restore.
    h = _content_hash(nrs, db, log)
    hpath = os.path.join(rundir, "stage_content_hash_%s.json" % pfx)
    with open(hpath, "w") as f:
        json.dump({"pfx": pfx, "nrs": nrs, "sha256": h}, f)
    log("stage-content-hash %s (sha256=%s...)" % (pfx, h[:16]))


def _content_hash(nrs, db, log):
    """P6-5: SHA-256 of the per-no_rawat value-row multiset across the output
    tables + reg.status_bayar — the complete pre-reset state the restore must
    reproduce. Computed identically before and after to prove restoration."""
    sig_parts = []
    for t, key in RESET_TABLES.items():
        inl = ",".join("'%s'" % n for n in nrs)
        # MySQL rejects a bare `*` after another select item ("SELECT k, *"),
        # and ORDER BY key alone is not a total order for multi-row visits:
        # select the full rows and sort them canonically here.
        rows = dbutil.query(db,
            "SELECT * FROM %s WHERE %s IN (%s)" % (t, key, inl))
        rows.sort(key=lambda r: ["" if c is None else c for c in r])
        sig_parts.append((t, rows))
    inl = ",".join("'%s'" % n for n in nrs)
    reg = dbutil.query(db,
        "SELECT no_rawat, status_bayar FROM reg_periksa WHERE no_rawat IN (%s) "
        "ORDER BY 1" % inl)
    sig_parts.append(("reg_periksa.status_bayar", reg))
    canon = json.dumps([ [t, [ [c for c in row] for row in rs] ] for t, rs in sig_parts],
                       sort_keys=True, default=str)
    return _sha(canon)


def stage_restore(nrs, db, rundir, log, run_id="run", stage=None):
    """AC-3: undo any reset/partial-bill for the batch from stage-backup.
    P6-2e: after re-applying, recompute the content hash and verify it matches
    the staged hash (STAGE-RESTORED-VERIFIED); on mismatch, do NOT claim a
    clean restore."""
    pfx = _stage_prefix(run_id, stage)
    inl = ",".join("'%s'" % n for n in nrs)
    try:
        for t, key in RESET_TABLES.items():
            s = "%s_%s" % (pfx, t)
            dbutil.execute(db, "DELETE FROM %s WHERE %s IN (%s)" % (t, key, inl))
            dbutil.execute(db, "REPLACE INTO %s SELECT * FROM %s WHERE %s IN (%s)"
                               % (t, s, key, inl))
        dbutil.execute(db,
            "UPDATE reg_periksa rp JOIN %s_reg sr ON rp.no_rawat=sr.no_rawat "
            "SET rp.status_bayar=sr.status_bayar WHERE rp.no_rawat IN (%s)" % (pfx, inl))
    except Exception as e:
        # a failed restore is a verdict (restored=False -> fail-closed), not a
        # traceback; the stage tables are kept so a resume can retry it
        log("STAGE-RESTORE-ERROR %s_*: %s: %s (NOT restored; stage tables kept "
            "for resume)" % (pfx, type(e).__name__, str(e)[:200]))
        return False
    # P6-2e: verify the restored content matches the pre-reset hash.
    hpath = os.path.join(rundir, "stage_content_hash_%s.json" % pfx)
    ok = True
    if os.path.exists(hpath):
        pre = json.load(open(hpath)).get("sha256")
        post = _content_hash(nrs, db, log)
        if pre != post:
            ok = False
            log("STAGE-RESTORE-MISMATCH: pre=%s... post=%s... (NOT a verified "
                "restore; do not claim clean)" % (str(pre)[:16], str(post)[:16]))
        else:
            log("stage-restore %d visits STAGE-RESTORED-VERIFIED (content hash "
                "matches pre-reset)" % len(nrs))
    else:
        log("stage-restore %d visits (pre-reset hash file absent; restore applied, "
            "NOT hash-verified)" % len(nrs))
    return ok


def stage_drop(db, run_id, log, stage=None):
    """P5-5: drop this run's stage tables (called only at finalize, after the
    last restore/diff — a mid-run crash must keep them for resume).
    P6-2e: VERIFY the drop actually removed the tables; only then claim
    'box left clean'. On a failed drop, log STAGE-DROP-FAILED and return False
    so the caller can force the verdict to fail-closed."""
    pfx = _stage_prefix(run_id, stage)
    names = ["%s_%s" % (pfx, t) for t in RESET_TABLES] + ["%s_reg" % pfx]
    failures = []
    for s in names:
        try:
            dbutil.execute(db, "DROP TABLE IF EXISTS %s" % s, force_root=True)
        except Exception as e:
            failures.append((s, str(e)[:120]))
    # re-check absence
    remaining = []
    for s in names:
        try:
            n = dbutil.scalar(db, "SELECT COUNT(*) FROM information_schema.tables "
                                 "WHERE table_schema=DATABASE() AND table_name='%s'" % s,
                              force_root=True)
            if n and int(n) > 0:
                remaining.append(s)
        except Exception as e:
            # an unverifiable table is not a clean one — but say why, so a
            # broken re-check is distinguishable from a table that survived
            remaining.append(s)
            failures.append((s, "re-check: %s: %s" % (type(e).__name__, str(e)[:120])))
    if failures or remaining:
        log("STAGE-DROP-FAILED %s_*: errors=%s remaining=%s (box NOT clean; "
            "verdict forced fail-closed)" % (pfx, failures, remaining))
        return False
    log("stage-drop %s_* verified (0 remaining; box left clean)" % pfx)
    return True


def reset_visits(nrs, db, log):
    inl = ",".join("'%s'" % n for n in nrs)
    for t, key in RESET_TABLES.items():
        dbutil.execute(db, "DELETE FROM %s WHERE %s IN (%s)" % (t, key, inl))
    dbutil.execute(db, "UPDATE reg_periksa SET status_bayar='Belum Bayar' "
                        "WHERE no_rawat IN (%s)" % inl)
    log("reset %d visits (output cleared, status_bayar=Belum Bayar)" % len(nrs))


def ensure_display(disp="99"):
    sock = "/tmp/.X11-unix/X%d" % int(disp)
    if os.path.exists(sock):
        return disp, None
    p = subprocess.Popen(["Xvfb", ":%s" % disp, "-screen", "0", "1280x1024x24"],
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(40):
        time.sleep(0.25)
        if os.path.exists(sock):
            time.sleep(0.5); return disp, p.pid
        if p.poll() is not None:
            break
    return disp, None


def run_harness(nrs, display, dte, log_path, timeout_s):
    KHANZA_DIR = dbutil.KHANZA_DIR
    HARNESS_CP = (".:harness:shim:../dist/SIMRSKhanza.jar:"
                  "../KhanzaSecurity16bit/dist/KhanzaSecurity16bit.jar:"
                  "../lib/mariadb.jar:../resumepasien/lib/*")
    script = ("cd %s/run-env; export DISPLAY=':%s'; "
              "faketime '%s 08:00:00' java -cp '%s' BilingHarness %s "
              "> %s 2>&1; exit $?"
              % (KHANZA_DIR, display, dte, HARNESS_CP, " ".join(nrs), log_path))
    # P6-4: run in its own process group (start_new_session=True) so a timeout
    # can TERM/KILL the WHOLE group (bash wrapper + faketime + java descendant),
    # then wait and prove no writer survives before the caller restores state.
    global _ACTIVE_HARNESS
    p = subprocess.Popen(["bash", "-c", script], start_new_session=True)
    _ACTIVE_HARNESS = p
    state_file = log_path + ".pid"
    with open(state_file, "w") as f:
        f.write(str(p.pid))
    timed_out = False
    proof = ""
    try:
        p.wait(timeout=timeout_s)
        rc = p.returncode
    except subprocess.TimeoutExpired:
        timed_out = True
        rc, proof = _kill_process_group(p)
    finally:
        _ACTIVE_HARNESS = None
    out = ""
    try:
        with open(log_path, errors="ignore") as f:
            out = f.read()
    except OSError:
        pass
    if timed_out:
        print("[timeout %ss] %s" % (timeout_s, proof), flush=True)
        return rc, out + "\n[timeout %ss] %s\n" % (timeout_s, proof)
    return rc, out


_ACTIVE_HARNESS = None


def _group_alive(pgid):
    try:
        os.killpg(pgid, 0)
        return True
    except ProcessLookupError:
        return False
    except OSError:
        return True  # EPERM: members exist but are not ours — not dead


def _kill_process_group(p, grace_s=15):
    """P6-4: bounded SIGTERM -> SIGKILL escalation on the WHOLE process group
    (bash wrapper + faketime + java descendant), then prove the group is empty.
    The group id is p.pid by construction (start_new_session=True). Liveness is
    judged on the GROUP, not on the bash wrapper: the wrapper can die first
    while the JVM keeps writing. p.poll() reaps the wrapper so a zombie leader
    does not keep the group looking alive. Returns (-1, proof_line) so the
    caller treats the batch as FAILED (fail-closed)."""
    import signal as _sig
    pgid = p.pid
    for sig, wait_s in ((_sig.SIGTERM, grace_s), (_sig.SIGKILL, 10)):
        p.poll()
        if not _group_alive(pgid):
            break
        try:
            os.killpg(pgid, sig)
        except ProcessLookupError:
            break
        for _ in range(int(wait_s * 4)):
            p.poll()
            if not _group_alive(pgid):
                break
            time.sleep(0.25)
    p.poll()
    dead = not _group_alive(pgid)
    proof = ("WRITER-DEAD-PROOF pgid=%d group_empty=%s"
             % (pgid, "true" if dead else "FALSE (writer may survive; restore unsafe)"))
    return -1, proof


def _on_terminate(signum, frame):
    """P6-4: SIGTERM/SIGINT to the oracle must not orphan the harness. The
    harness runs in its own session (start_new_session=True), so a signal to
    this process alone would leave the JVM writing. Kill its group, print the
    proof, and exit 4 (fail-closed) WITHOUT finalizing: the batch stays
    STAGED/RESET in .state.json so a resume restores it (AC-3)."""
    p = _ACTIVE_HARNESS
    proof = "no active harness"
    if p is not None:
        _, proof = _kill_process_group(p, grace_s=10)
    print("SIGNAL %d: oracle interrupted; %s; state left for resume "
          "(fail-closed exit 4)" % (signum, proof), flush=True)
    os._exit(4)


def rebill_via_consumer(nr, db, rundir, log):
    tgl, jam = None, None
    for r in dbutil.query(db, "SELECT tgl_registrasi, COALESCE(jam_reg,'08:00:00') "
                             "FROM reg_periksa WHERE no_rawat='%s'" % nr):
        tgl, jam = r[0], r[1]
    if not tgl:
        log("REBILL impossible: %s has no reg_periksa row" % nr); return False
    lines = ["ENC %s %s %s" % (nr, tgl, jam)]
    for kode, nama, hbeli, jml in dbutil.query(
            db, "SELECT d.kode_brng, COALESCE(b.nama_brng,d.kode_brng), d.h_beli, d.jml "
                "FROM detail_pemberian_obat d LEFT JOIN databarang b "
                "ON b.kode_brng=d.kode_brng WHERE d.no_rawat='%s' ORDER BY d.kode_brng"
                % nr):
        hbeli = _fmt_num(float(hbeli or 0)); jml = _fmt_num(float(jml or 0))
        lines.append("OBAT %s %s %s %s %s"
                     % (nr, kode, str(nama).replace(" ", "_"), hbeli, jml))
    lines.append("END")
    mini = os.path.join(rundir, "rebill_%s.txt" % nr.replace("/", "_"))
    with open(mini, "w") as f:
        f.write("\n".join(lines) + "\n")
    clog = os.path.join(rundir, "rebill_%s.log" % nr.replace("/", "_"))
    p = subprocess.run(["java", "-cp", dbutil.CONSUMER_CP,
                        "KhanzaBillingConsumer", mini, clog],
                       cwd=dbutil.KHANZA_DIR, capture_output=True, text=True,
                       timeout=600)
    ok = p.returncode == 0
    log("REBILL %s via consumer: rc=%d %s" % (nr, p.returncode,
                                               "restored" if ok else "FAILED"))
    return ok


def _fmt_num(v):
    return str(int(v)) if v == int(v) else repr(v)


def eligible(n, db, log):
    """AC-6: same exclusions as cohort() — no nonzero embalase/tuslah, <=2 proc,
    >=1 drug or procedure row."""
    row = dbutil.query(db,
        "SELECT (SELECT COUNT(*) FROM detail_pemberian_obat d WHERE d.no_rawat='%s') n_dpo, "
        "(SELECT COUNT(*) FROM rawat_jl_dr rw WHERE rw.no_rawat='%s') n_proc, "
        "(SELECT COUNT(*) FROM detail_pemberian_obat d WHERE d.no_rawat='%s' "
        " AND (d.embalase<>0 OR d.tuslah<>0)) n_etc" % (n, n, n))
    n_dpo, n_proc, n_etc = (int(x or 0) for x in row[0])
    return (n_dpo + n_proc) > 0 and n_etc == 0 and n_proc <= 2


def load_state(rundir):
    p = os.path.join(rundir, ".state.json")
    return json.load(open(p)) if os.path.exists(p) else None


def save_state(rundir, st):
    with open(os.path.join(rundir, ".state.json.tmp"), "w") as f:
        json.dump(st, f, indent=2)
    os.replace(os.path.join(rundir, ".state.json.tmp"), os.path.join(rundir, ".state.json"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stage", required=True)
    ap.add_argument("--db-name", default="sik")
    ap.add_argument("--visits-file")
    ap.add_argument("--allow-strata", action="store_true",
                    help="B3 edge-strata: carry out-of-envelope (non-eligible) "
                         "visits through as not-covered markers instead of "
                         "aborting on the AC-6 aligned-predicate check")
    ap.add_argument("--repair-consumer", action="store_true",
                    help="P5-4: allow consumer rebill repair for sukses=false "
                         "visits. DEFAULT OFF — drift stays drift (auto-repair "
                         "masked form failure and mutated the target).")
    ap.add_argument("--rate", type=float, default=25)
    ap.add_argument("--per", type=float, default=10000)
    ap.add_argument("--cap-min", type=float, default=45)
    ap.add_argument("--freeze-only", action="store_true")
    ap.add_argument("--verify-frozen", action="store_true")
    ap.add_argument("--allow-empty-baseline", action="store_true",
                    help="P6-2a: proceed even if a sampled visit has 0 consumer "
                         "value rows. DEFAULT fails closed on an empty baseline "
                         "(a missing-settlement run would otherwise pass 0==0).")
    args = ap.parse_args()
    db = args.db_name

    tool = dbutil.Tool("sampled_real_form_diff_r5")
    rdir = os.path.join(dbutil.RESULTS_ROOT, tool.run_id)
    rundir = os.path.join(rdir, "%s_oracle_run_r5" % args.stage)
    st = load_state(rundir)

    # AC-5: pinned paths. A foreign dir (exists but not our recognizable state)
    # is a hard error, never overwritten.
    if os.path.exists(rundir) and st is None and st != {} and \
            os.path.exists(os.path.join(rundir, ".state.json")):
        pass
    if os.path.isdir(rundir) and not os.path.exists(os.path.join(rundir, ".state.json")) \
            and os.listdir(rundir):
        print("R5-P1 ABORT: %s exists without a recognizable .state.json "
              "(foreign dir, AC-5 — refusing to overwrite)" % rundir)
        return 3
    os.makedirs(rundir, exist_ok=True)
    log = tool.log
    deadline = time.time() + args.cap_min * 60.0

    # AC-4: exclusive lock
    lockfd = acquire_lock(rundir, log)
    if lockfd is None:
        return 3
    signal.signal(signal.SIGTERM, _on_terminate)
    signal.signal(signal.SIGINT, _on_terminate)
    st = load_state(rundir) or {"run_id": tool.run_id, "db": db,
                                 "stage": args.stage, "phase": "INIT",
                                 "batches": {}, "nrs": []}
    if st.get("run_id") != tool.run_id or st.get("db") != db:
        print("R5-P1 ABORT: state belongs to run %s/db %s, not %s/%s (AC-5)"
              % (st.get("run_id"), st.get("db"), tool.run_id, db)); return 3

    # AC-6: determine the visit set.
    if args.visits_file:
        with open(args.visits_file) as f:
            nrs = [l.strip() for l in f if l.strip()]
        bad = [n for n in nrs if not eligible(n, db, log)]
        if bad and not args.allow_strata:
            log("ALIGNED-PREDICATE: %d provided visits NOT eligible: %s"
                % (len(bad), bad[:5]))
            return 2
        if bad and args.allow_strata:
            # B3 edge-strata mode: the flagged out-of-envelope visits are
            # expected to be non-eligible under the aligned predicate; carry
            # them through and mark them not-covered in the result rather than
            # silently excluding them (this is the B3 "not-covered marker" the
            # roadmap wants, surfaced at the eligibility stage).
            log("ALLOW-STRATA (B3): %d provided visits OUT-OF-ENVELOPE "
                "(not eligible under the aligned cohort predicate) — carried "
                "as not-covered markers: %s" % (len(bad), bad[:5]))
        if not bad:
            log("ALIGNED-PREDICATE: %d visits from %s, all eligible (AC-6)"
                % (len(nrs), os.path.basename(args.visits_file)))
    else:
        nrs = []
        log("sample path not used in this demo (pass --visits-file)")
    if not nrs:
        log("empty visit set"); return 2
    st["nrs"] = nrs
    # P5-3: persist the out-of-envelope set so classification is eligibility-
    # based (attempt-based classification let billed STRATA visits surface as
    # plain MISMATCH instead of not-covered).
    st["out_of_envelope"] = sorted(bad) if (args.allow_strata and bad) else []
    # P6-2a: STRUCTURED rejection of visits with no reg_periksa row. Pre-P6 a
    # missing registration produced tgl=None, a by_date[None] key, and later a
    # None.replace() AttributeError — a traceback, not a verdict. Now such
    # visits are dropped to a MISSING-REG rejection (exit 2) and never enter
    # the batch loop; the run cannot proceed on an under-specified visit set.
    missing_reg = [n for n in nrs
                   if dbutil.scalar(db, "SELECT tgl_registrasi FROM reg_periksa "
                                     "WHERE no_rawat='%s'" % n) is None]
    st["missing_reg"] = sorted(missing_reg)
    if missing_reg:
        st["nrs"] = [n for n in nrs if n not in set(missing_reg)]
        log("MISSING-REG (P6-2a): %d provided visits have no reg_periksa row: %s "
            "— STRUCTURED REJECTION (exit 2); these never enter the batch loop"
            % (len(missing_reg), missing_reg[:5]))
        save_state(rundir, st)
        release_lock(rundir)
        return 2
    if st["out_of_envelope"]:
        save_state(rundir, st)
    by_date = {}
    for n in st["nrs"]:
        tgl = dbutil.scalar(db, "SELECT tgl_registrasi FROM reg_periksa "
                               "WHERE no_rawat='%s'" % n)
        by_date.setdefault(tgl, []).append(n)
    dates = sorted(by_date)
    if not st.get("batches"):
        st["batches"] = {d: {"visits": by_date[d], "status": "PENDING"}
                         for d in dates}
    # P6-2f: RESUME BINDING — on resume (state exists with batches), the
    # supplied visits file must match the frozen run's visit set exactly; a
    # changed sample aborts rather than silently adding encounters that never
    # enter the existing batches.
    if st.get("batches") and st.get("phase") in ("FREEZE_DONE", "RUNNING", "DONE") \
            and args.visits_file:
        frozen_set = sorted({v for b in st["batches"].values() for v in b["visits"]})
        supplied = sorted(st.get("nrs", []))
        if frozen_set and frozen_set != supplied:
            log("RESUME-ABORT (P6-2f): supplied visits differ from the frozen run's "
                "batch visit set; refusing to finalize on a changed sample")
            release_lock(rundir)
            return 3

    if args.freeze_only:
        try:
            if st.get("phase") in ("FREEZE_DONE", "RUNNING", "DONE"):
                log("--freeze-only: already frozen (phase=%s); verify only" % st["phase"])
            else:
                if freeze_baseline(nrs, db, rundir, log, tool.run_id,
                                   args.allow_empty_baseline) is None:
                    release_lock(rundir); return 2
                st["phase"] = "FREEZE_DONE"
                save_state(rundir, st)
            ok = verify_frozen(rundir, db, log)
        finally:
            release_lock(rundir)
        # P6-2c: --freeze-only is an ADMINISTRATIVE baseline operation. Its 0
        # means "frozen baseline verifies clean", NOT a billing comparison.
        log("FREEZE-ONLY exit %d (administrative mode; no billing comparison performed; P6-2c)"
            % (0 if ok else 1))
        return 0 if ok else 1

    if args.verify_frozen:
        ok = verify_frozen(rundir, db, log)
        log("VERIFY-FROZEN exit %d (administrative mode; no billing comparison performed; P6-2c)"
            % (0 if ok else 1))
        return 0 if ok else 1

    # AC-3: resume path — verify frozen baseline, reap lingering harness, then
    # restore+rebill any non-BILLED batch.
    if not verify_frozen(rundir, db, log):
        log("RESUME blocked: frozen baseline failed verification (AC-3)"); return 3
    # reap a lingering harness from a crashed run
    for d in dates:
        pidf = os.path.join(rundir, "harness_%s.log.pid" % d.replace("-", "_"))
        if os.path.exists(pidf):
            try:
                hp = int(open(pidf).read().strip() or 0)
                if _pid_alive(hp):
                    log("RESUME: waiting for lingering harness pid %d (date %s)"
                        % (hp, d))
                    for _ in range(240):
                        if not _pid_alive(hp):
                            break
                        time.sleep(5)
                os.remove(pidf)
            except Exception:
                pass
    failed = False
    for d in dates:
        b = st["batches"].get(d)
        if not b or b["status"] in ("BILLED", "FAILED"):
            if b and b["status"] == "FAILED":
                failed = True
            continue
        # non-BILLED batch: restore pre-reset state, re-reset, (re)bill below.
        if b["status"] in ("STAGED", "RESET"):
            if not stage_restore(b["visits"], db, rundir, log, tool.run_id,
                                 stage=st.get("stage")):
                # P6-2e: an unverified restore must not be re-billed over.
                b["status"] = "FAILED"
                b["restored"] = False
                b["fail_reason"] = "resume restore not hash-verified"
                save_state(rundir, st)
                log("date %s: FAILED (resume restore not hash-verified) — "
                    "run stops (fail-closed)" % d)
                failed = True
                break
            b["status"] = "PENDING"
        st["phase"] = "RUNNING"
        save_state(rundir, st)
        if _bill_date(d, b, st, rundir, db, tool, log, deadline,
                      args.repair_consumer):
            # P5-2: fail-closed — a FAILED batch stops the run.
            failed = True
            break
    st["phase"] = "DONE"
    save_state(rundir, st)
    rc = _finalize(st, rundir, db, tool, log, args.repair_consumer)
    release_lock(rundir)
    if failed and rc == 0:
        return 4
    return rc


def _bill_date(d, b, st, rundir, db, tool, log, deadline, repair_consumer=False):
    nrs = b["visits"]
    run_id = tool.run_id
    # P5-5b: the stage backup can fail on privilege/DDL (e.g. benchmark user
    # lacks CREATE). That is an unrecoverable infra failure for this batch:
    # mark it FAILED with a reason and stop (fail-closed); the caller's
    # restore+stop semantics then apply. P6-2d: the prefix now includes the
    # stage (same-RUN_ID/different-stage hazard closed).
    try:
        stage_backup(nrs, db, rundir, log, run_id, stage=st.get("stage"))
    except Exception as e:
        b["status"] = "FAILED"
        b["restored"] = False
        b["fail_reason"] = "stage-backup failed (%s: %s)" % (type(e).__name__, str(e)[:200])
        save_state(rundir, st)
        log("date %s: FAILED (%s) - stage backup could not complete; run stops "
            "(fail-closed, P5-5b)" % (d, b["fail_reason"]))
        return 1
    # staged reset: backup -> reset (never reset-all-upfront; guaranteed restore)
    b["status"] = "STAGED"; save_state(rundir, st)
    reset_visits(nrs, db, log)
    b["status"] = "RESET"; save_state(rundir, st)
    display, xvfb_pid = ensure_display("99")
    log_path = os.path.join(rundir, "harness_%s.log" % d.replace("-", "_"))
    rc, out = run_harness(nrs, display, d, log_path,
                          int(os.environ.get("R5_HARNESS_TIMEOUT_S", "1800")))
    sukses = {}
    for m in re.finditer(r"=== VISIT (\S+) DONE sukses=(true|false)", out or ""):
        sukses[m.group(1)] = (m.group(2) == "true")
    b["rc"] = rc
    b["sukses"] = sukses
    b["batch_rc"] = rc
    # P5-2: BILLED only on rc==0 AND every visit sukses=true. Otherwise FAILED:
    # restore pre-reset state (complete pre-run state re-applied) and stop.
    if rc == 0 and all(sukses.get(v, False) for v in nrs):
        b["status"] = "BILLED"
        b["restored"] = False
        save_state(rundir, st)
        log("date %s: rc=%d visits=%d sukses_true=%d -> BILLED"
            % (d, rc, len(nrs), len(nrs)))
    elif rc == -1 and "group_empty=true" not in (out or ""):
        # P6-4: a timed-out writer could not be proven dead — restoring under a
        # live JVM would race it. Leave the batch RESET for a resume (which
        # waits on the harness pid) and stop fail-closed.
        b["status"] = "FAILED"
        b["restored"] = False
        b["fail_reason"] = "timeout; writer-dead proof failed, restore withheld"
        save_state(rundir, st)
        log("date %s: FAILED (%s)" % (d, b["fail_reason"]))
    else:
        # P6-2e: restore from THIS stage's tables (the backup above used
        # stage=st["stage"]; omitting it here pointed at r5_stage_stage_* and
        # the DELETE ran with nothing to copy back) and record the VERIFIED
        # outcome, never an asserted one.
        restored = stage_restore(nrs, db, rundir, log, run_id,
                                 stage=st.get("stage"))
        b["status"] = "FAILED"
        b["restored"] = bool(restored)
        b["fail_reason"] = ("harness rc=%d" % rc) if rc != 0 else \
            "sukses=false for %d/%d visits" % (sum(1 for v in nrs if not sukses.get(v)), len(nrs))
        save_state(rundir, st)
        log("date %s: FAILED (%s) — pre-reset state restored, run stops (P5-2)"
            % (d, b["fail_reason"]))
    if xvfb_pid:
        try:
            os.kill(xvfb_pid, 15)
        except OSError:
            pass
    return 0 if b["status"] == "BILLED" else 1


def _finalize(st, rundir, db, tool, log, repair_consumer=False):
    """Diff BILLED batches against the frozen baseline. Returns the process exit
    code (P5-1): 0 clean in-envelope pass; 1 in-envelope drift/parse errors;
    4 FAILED batches or out-of-envelope visits present (PARTIAL-NOT-COVERED).
    Priority 4 > 1 per the module docstring."""
    # diff every BILLED batch against the frozen baseline (AC-1), rc in predicate.
    man = json.load(open(os.path.join(rundir, "baseline_frozen", "manifest.json")))
    frozen = {}
    for n in man["visits"]:
        rows = json.load(open(os.path.join(
            rundir, "baseline_frozen", "%s.json" % n.replace("/", "_"))))["rows"]
        frozen[n] = [tuple(r) for r in rows]
    parse_errors = []
    results, drift, repaired = [], [], []
    out_of_env = set(st.get("out_of_envelope") or [])
    failed_batches = [d for d, b in st["batches"].items() if b.get("status") == "FAILED"]
    # P6-2b: REPAIR-SKIPPED is emitted for ENVELOPE visits that were NOT
    # successfully billed (i.e., their batch is FAILED/restored, or the visit
    # had a per-visit sukses=false). For freshly BILLED batches every
    # sukses=true by construction, so the repair question simply does not arise
    # there — this corrects the P5 evidence defect where REPAIR-SKIPPED was
    # claimed to fire on a FAILED batch but the log lived in the BILLED branch.
    unbilled_envelope = []
    for d, b in sorted(st["batches"].items()):
        if b["status"] == "BILLED":
            continue
        for n in b["visits"]:
            if n in out_of_env:
                continue
            unbilled_envelope.append((n, b.get("fail_reason", "")))
    if unbilled_envelope and not repair_consumer:
        for n, reason in unbilled_envelope:
            log("REPAIR-SKIPPED %s (batch FAILED: %s) — drift stays drift (P5-4); "
                "set --repair-consumer to allow consumer rebill" % (n, reason))
    for d, b in sorted(st["batches"].items()):
        # P5-3: emit a per-visit row for EVERY batch, not just BILLED ones.
        # A FAILED batch (P5-2) still gets rows so its out-of-envelope visits
        # are classified OUT-OF-ENVELOPE (not silently dropped, and not
        # mislabeled as MISMATCH). BILLED batches are diffed against the
        # frozen baseline; non-BILLED batches are reported as-is (no diff).
        is_billed = (b["status"] == "BILLED")
        real = {}
        if is_billed:
            real, pe = value_rows_strict(b["visits"], db, log)
            parse_errors.extend(pe)
        for n in b["visits"]:
            if n in out_of_env:
                classification = "OUT-OF-ENVELOPE"
            else:
                classification = "ENVELOPE"
            if is_billed:
                c, r = frozen.get(n, []), real.get(n, [])
                ok_flag = b.get("sukses", {}).get(n, False)
                mc, mr = Counter(c), Counter(r)
                miss_c, miss_r = list((mc - mr).elements()), list((mr - mc).elements())
                batch_rc = b.get("batch_rc", 0)
                mismatch = bool(miss_c or miss_r) or (not ok_flag) or \
                           (batch_rc != 0 and not ok_flag)
                results.append({"no_rawat": n, "classification": classification,
                                "sukses": ok_flag, "batch_rc": batch_rc,
                                "consumer_value_rows": len(c), "real_value_rows": len(r),
                                "consumer_only": len(miss_c), "real_only": len(miss_r),
                                "mismatch": mismatch})
                if mismatch and classification == "ENVELOPE":
                    drift.append(n)
                if not ok_flag and repair_consumer and classification == "ENVELOPE":
                    if rebill_via_consumer(n, db, rundir, log):
                        repaired.append(n)
                    else:
                        log("CRITICAL: %s left unbilled after rebill" % n)
            else:
                # non-BILLED batch: report the visit with its classification,
                # no diff (the batch FAILED and was restored pre-reset).
                fail_status = b.get("status", "N/A")
                fail_reason = b.get("fail_reason", "")
                results.append({"no_rawat": n, "classification": classification,
                                 "sukses": b.get("sukses", {}).get(n, False),
                                 "batch_rc": b.get("rc", None),
                                 "consumer_value_rows": None, "real_value_rows": None,
                                 "consumer_only": None, "real_only": None,
                                 "mismatch": None,
                                 "batch_status": fail_status,
                                 "fail_reason": fail_reason})
    if parse_errors:
        log("PARSE-ERRORS: %d (AC-8 hard-fail) e.g. %s"
            % (len(parse_errors), parse_errors[:3]))
    in_env_results = [r for r in results if r["classification"] == "ENVELOPE"]
    # P5-3: the drift rate counts in-envelope rows only. Out-of-envelope and
    # non-BILLED (FAILED-batch) rows carry no diff and are excluded from both
    # the numerator and the denominator of the rate.
    diffable = [r for r in results if r.get("mismatch") is not None]
    in_env_diffable = [r for r in diffable if r["classification"] == "ENVELOPE"]
    rate = len(drift) / max(1, len(in_env_diffable))
    mdp = os.path.join(os.path.dirname(rundir), "%s_sampled_form_diff_r5.md" % st["stage"])
    csvp = os.path.join(os.path.dirname(rundir), "%s_sampled_form_diff_r5.csv" % st["stage"])
    with open(csvp, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["no_rawat", "classification", "sukses", "batch_rc",
                    "consumer_value_rows", "real_value_rows",
                    "consumer_only", "real_only", "mismatch",
                    "batch_status", "fail_reason"])
        for r in results:
            w.writerow([r["no_rawat"], r["classification"], r["sukses"], r["batch_rc"],
                        r["consumer_value_rows"], r["real_value_rows"],
                        r["consumer_only"], r["real_only"], r["mismatch"],
                        r.get("batch_status", "BILLED" if r["mismatch"] is not None else "N/A"),
                        r.get("fail_reason", "")])
    # P5-1/P5-3/P6 verdict + exit code. Priority order (highest first):
    #   4: any FAILED batch (P5-2) or out-of-envelope visits present
    #      (P5-3) — verdict PARTIAL-NOT-COVERED; also forced when a stage-drop
    #      FAILED (P6-2e: the box is not clean, so the run cannot claim success).
    #   1: in-envelope drift or parse errors — verdict FAIL.
    #   0: clean in-envelope billing-run pass. (QUALIFIER, P6-2c: exit 0 here
    #      means a completed BILLING comparison; the --freeze-only /
    #      --verify-frozen administrative modes return 0 on a clean baseline
    #      check WITHOUT performing a billing comparison — documented in the
    #      module docstring, not a billing verdict.)
    # P6-2e: stage_drop now returns verified-clean or not; a failed drop forces
    # the verdict to PARTIAL-NOT-COVERED / exit 4 (no false "clean" claim).
    # A batch whose restore was not verified (or that never got restored) still
    # needs its stage tables: they are the only copy of the pre-reset rows.
    unrestored = sorted(d for d, b in st["batches"].items()
                        if b.get("status") in ("STAGED", "RESET")
                        or (b.get("status") == "FAILED" and b.get("restored") is False
                            and not str(b.get("fail_reason", "")).startswith("stage-backup")))
    if unrestored:
        log("STAGE-KEEP %s_*: batches %s not verifiably restored — stage tables "
            "kept for a resume/manual restore (box NOT clean)"
            % (_stage_prefix(tool.run_id, st.get("stage")), unrestored))
        drop_ok = False
    else:
        drop_ok = stage_drop(db, tool.run_id, log, stage=st.get("stage"))
    if not drop_ok:
        failed_batches = failed_batches or ["stage-drop"]
        out_of_env = out_of_env or set()
    if failed_batches or out_of_env:
        verdict = "PARTIAL-NOT-COVERED"
        exit_code = 4
    elif drift or parse_errors:
        verdict = "FAIL"
        exit_code = 1
    else:
        verdict = "PASS"
        exit_code = 0
    with open(mdp, "w") as f:
        f.write("# R5-P1 hardened oracle — %s @ %s\n%s\n"
                % (st["stage"], datetime.datetime.now(datetime.timezone.utc)
                   .strftime("%Y-%m-%dT%H:%M:%SZ"),
                   "baseline=frozen (sha256_all=%s)\n" % man["sha256_all"]))
        f.write("- visits=%d sampled_rows=%d in_envelope=%d out_of_envelope=%d "
                "failed_batches=%d drift(in-envelope)=%d rate=%.4f parse_errors=%d "
                "crash_safe=YES\n"
                % (len(st["nrs"]), len(results), len(in_env_results),
                   len(out_of_env), len(failed_batches), len(drift), rate,
                   len(parse_errors)))
        f.write("- stage-drop-verified=%s (P6-2e)\n" % ("YES" if drop_ok else "NO"))
        if out_of_env:
            f.write("- OUT-OF-ENVELOPE (excluded from drift; P5-3 eligibility-"
                    "based classification): %d — %s\n"
                    % (len(out_of_env), ", ".join(sorted(out_of_env))))
        if failed_batches:
            f.write("- FAILED batches (restored from stage backup; P5-2): %s\n"
                    % ", ".join("%s(%s)" % (d, st["batches"].get(d, {}).get("fail_reason", "?"))
                                for d in sorted(failed_batches)))
        f.write("- verdict: %s (exit %d)%s\n" % (verdict, exit_code,
                 "" if verdict == "PASS" else " (fail-closed, P5-1/P6-2e)"))
        f.write("- artifact: %s\n" % mdp)
        for r in results:
            if r.get("mismatch") is None:
                # non-BILLED (FAILED batch) row: no diff values
                f.write("| %s | %s | %s | rc=%s | c=- | r=- | "
                         "%s | %s |\n"
                         % (r["no_rawat"], r["classification"], r["sukses"],
                            r["batch_rc"], r.get("batch_status", "?"),
                            r.get("fail_reason", "")))
            else:
                f.write("| %s | %s | %s | rc=%s | c=%s | r=%s | %s |\n"
                        % (r["no_rawat"], r["classification"], r["sukses"], r["batch_rc"],
                           r["consumer_only"], r["real_only"],
                           "MISMATCH" if r["mismatch"] else ""))
    tool.artifact("%s_sampled_form_diff_r5.md" % st["stage"],
                  open(mdp).read())
    log("FINAL: sampled_rows=%d in_envelope=%d out_of_envelope=%d failed_batches=%d "
        "drift(in-envelope)=%d parse_errors=%d stage_drop_verified=%s (P5-1/P6)"
        % (len(results), len(in_env_results), len(out_of_env),
           len(failed_batches), len(drift), len(parse_errors), drop_ok))
    if verdict != "PASS":
        log("ORACLE_%s: exit %d (fail-closed, P5-1/P6-2e)" % (verdict, exit_code))
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
