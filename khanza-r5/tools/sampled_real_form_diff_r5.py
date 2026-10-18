#!/usr/bin/env python3
"""sampled_real_form_diff_r5.py — R5-P1 hardened oracle (independent; recovers from the
fault modes the acceptance suite injects — not a general crash-safety claim, P8-A2).

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

  P8 recovery hardening:
  P8-C1  an unreadable, truncated or foreign stage hash file is STAGE-RESTORE-
         UNVERIFIED (fail-closed), never a traceback or a verified restore.
  P8-C2  resume first kills every recorded harness group and every BilingHarness
         process naming a run visit, then requires none left and the visits'
         output unchanged over a quiet interval (R5_WRITER_QUIET_S, default 5);
         otherwise WRITER-ALIVE, no restore, exit 4.
  P8-C3  restore is idempotent (DELETE+REPLACE from the kept stage tables, then
         hash-verified), so a restore killed half-way is redone on resume.
         R5_FAULT_RESTORE_PAUSE_S is a test-only hook that pauses mid-restore.
  P8-C4  --retry-failed re-bills a FAILED batch only from a hash-verified
         pre-reset state; without it FAILED batches stay failed.

  P9 recovery contract:
  P9-B1  one pre-reset hash file per BATCH (stage_content_hash_<pfx>_<date>.json).
  P9-B2  retry compares the batch's CURRENT content with that hash (never the stored
         restored=True flag); if it differs, it restores from the kept stage tables and
         verifies first, else RETRY-REFUSED. A FAILED batch keeps its stage tables until
         BILLED (--retry-failed) or released (--abandon-failed, current state verified).
         stage_restore refuses before deleting anything when stage tables are missing.
  P9-B3  a FAILED batch stops a resume too (later dates are not billed).
  P9-B4  before a restore, server-side fencing: stray mysql clients naming the target
         are killed and every other server session on the target is KILLed and waited
         out (FENCE line); never on the live databases (FENCE-SKIPPED).
  P9-A2  verify_frozen compares the source-content hash (SOURCE-CONTENT DRIFT).

  P10 recovery integrity:
  P10-B1 the source-content hash covers every billed amount column (biaya_obat, total,
         procedure tariffs) and a query error fails the freeze/verify (no silent pass).
  P10-B2 stage_backup replaces a batch's staged rows in ONE transaction; a failed
         re-backup rolls back and the earlier staged rows survive; a batch whose backup
         failed keeps its stage tables. R5_FAULT_BACKUP_FAIL is a test-only hook.
  P10-B3 FAILED batches about to be retried/abandoned get the quiet-interval proof.
  P10-B4 every restore on a fixture runs under writer exclusion (benchmark DML revoked,
         target fenced, restore as root, grants given back and re-checked); never on live.
  P10-A2 the result artifact states each FAILED batch's actual restore result.

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
    # P10-B1: every amount column the form can bill from (biaya_obat and total were
    # missing before P10), not the status columns the save itself updates
    # (detail_pemberian_obat.status, rawat_jl_dr.stts_bayar). A query error now
    # propagates (verify_frozen -> FAIL); before P10 it was swallowed and a failed
    # query hashed as "no rows". Rows are sorted here, so ties cannot reorder.
    inl = ",".join("'%s'" % n for n in nrs)
    drugs = dbutil.query(db,
        "SELECT 'drug', d.no_rawat, d.kode_brng, d.tgl_perawatan, d.jam, d.h_beli, "
        "d.biaya_obat, d.jml, d.embalase, d.tuslah, d.total, COALESCE(b.ralan, -1) "
        "FROM detail_pemberian_obat d LEFT JOIN databarang b ON b.kode_brng=d.kode_brng "
        "WHERE d.no_rawat IN (%s)" % inl)
    procs = dbutil.query(db,
        "SELECT 'proc', no_rawat, kd_jenis_prw, tgl_perawatan, jam_rawat, material, bhp, "
        "tarif_tindakandr, kso, menejemen, biaya_rawat "
        "FROM rawat_jl_dr WHERE no_rawat IN (%s)" % inl)
    parts = sorted([["" if c is None else str(c) for c in r] for r in drugs + procs])
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
    try:
        src_hash = source_content_hash(db, nrs, log)
    except Exception as e:
        log("FREEZE failed: source-content hash could not be computed (%s: %s; "
            "fail-closed, P10-B1)" % (type(e).__name__, str(e)[:200]))
        return None
    manifest = {"run_id": run_id, "frozen_ts":
                datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ"),
                "fingerprint": db_fingerprint(db), "n_visits": len(nrs),
                "visits": {}, "sha256": {}, "allow_empty_baseline": allow_empty_baseline,
                "source_content_hash": src_hash,
                "source_hash_version": "p10"}
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
    # P9-A2: the P6-2g docstring promised this comparison but the code never made it;
    # counts alone miss a changed quantity or price on a sampled visit
    if man.get("source_content_hash"):
        try:
            cur_src = source_content_hash(db, list(man["visits"]), log)
        except Exception as e:
            cur_src = "ERROR(%s)" % type(e).__name__
            log("verify-frozen: SOURCE-CONTENT CHECK ERROR (P10-B1): %s: %s"
                % (type(e).__name__, str(e)[:200]))
        if cur_src != man["source_content_hash"]:
            log("verify-frozen: SOURCE-CONTENT DRIFT (P9-A2): sampled visits' source "
                "lines changed since freeze (%s... -> %s...)"
                % (man["source_content_hash"][:16], cur_src[:16]))
            ok = False
    else:
        log("verify-frozen: no source_content_hash in manifest (pre-P6 freeze) — "
            "source content NOT verified")
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


def _hash_path(rundir, pfx, batch):
    """P9-B1: one pre-reset hash file PER BATCH. Before P9 the file was per run+stage,
    so a later batch's backup overwrote an earlier batch's hash."""
    if not batch:
        raise ValueError("stage hash needs a batch key (P9-B1)")
    return os.path.join(rundir, "stage_content_hash_%s_%s.json"
                        % (pfx, re.sub(r"[^A-Za-z0-9]", "_", str(batch))))


def stage_backup(nrs, db, rundir, log, run_id="run", stage=None, batch=None):
    """AC-3: copy pre-reset state for the batch into per-run r5_stage_* tables.
    P5-5b: stage-table CREATE requires privilege the benchmark user lacks —
    run the DDL as root (dbutil.force_root) while all DML stays on the
    benchmark user. P6-2e: content-hash the staged rows (per no_rawat multiset)
    so a later stage_restore can be VERIFIED against these hashes."""
    pfx = _stage_prefix(run_id, stage)
    inl = ",".join("'%s'" % n for n in nrs)
    for t, key in RESET_TABLES.items():
        dbutil.execute(db, "CREATE TABLE IF NOT EXISTS %s_%s LIKE %s" % (pfx, t, t),
                       force_root=True)
    dbutil.execute(db,
        "CREATE TABLE IF NOT EXISTS %s_reg (no_rawat VARCHAR(17), "
        "status_bayar VARCHAR(20)) ENGINE=InnoDB" % pfx, force_root=True)
    # P10-B2: replace this batch's staged rows in ONE transaction (the tables are
    # InnoDB). Before P10 the DELETE and REPLACE were separate autocommit statements,
    # so a failed re-backup on a retry destroyed the rows kept from the earlier
    # backup. Now any failure rolls back and the earlier staged rows survive.
    sql = ["START TRANSACTION;"]
    for t, key in RESET_TABLES.items():
        sql.append("DELETE FROM %s_%s WHERE %s IN (%s);" % (pfx, t, key, inl))
        sql.append("REPLACE INTO %s_%s SELECT * FROM %s WHERE %s IN (%s);"
                   % (pfx, t, t, key, inl))
    sql.append("DELETE FROM %s_reg WHERE no_rawat IN (%s);" % (pfx, inl))
    sql.append("REPLACE INTO %s_reg SELECT no_rawat, status_bayar FROM reg_periksa "
               "WHERE no_rawat IN (%s);" % (pfx, inl))
    if os.environ.get("R5_FAULT_BACKUP_FAIL"):
        # test hook (inert unless set): a failing statement before COMMIT
        sql.append("SELECT * FROM r5_fault_injected_missing_table;")
    sql.append("COMMIT;")
    sess = dbutil.session(db)
    sess.exec("\n".join(sql))
    if not sess.close():
        raise RuntimeError("stage backup transaction failed and was rolled back; "
                           "earlier staged rows kept (%s)" % sess.last_error[:200])
    log("stage-backup %d visits -> %s_* (%d output tables + reg.status_bayar)"
        % (len(nrs), pfx, len(RESET_TABLES)))
    # P6-2e: record the pre-reset content hash (per no_rawat value-row multiset
    # across the output tables + reg.status_bayar) for later verified restore.
    h = _content_hash(nrs, db, log)
    hpath = _hash_path(rundir, pfx, batch)
    with open(hpath, "w") as f:
        json.dump({"pfx": pfx, "batch": batch, "nrs": nrs, "sha256": h}, f)
    log("stage-content-hash %s batch %s (sha256=%s...)" % (pfx, batch, h[:16]))


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


def read_prereset_hash(nrs, rundir, pfx, batch):
    """P8-C1/P9-B1: (sha256, problem) from this batch's hash file. problem is None when
    the file exists and describes exactly this batch; sha256 is None when absent."""
    hpath = _hash_path(rundir, pfx, batch)
    if not os.path.exists(hpath):
        return None, "absent"
    try:
        meta = json.load(open(hpath))
        pre = meta.get("sha256")
        if meta.get("pfx") != pfx or str(meta.get("batch")) != str(batch)                 or sorted(meta.get("nrs") or []) != sorted(nrs)                 or not re.fullmatch(r"[0-9a-f]{64}", str(pre)):
            return None, "hash file does not describe this batch (pfx/batch/nrs/sha256 invalid)"
        return pre, None
    except Exception as e:
        return None, "hash file unreadable (%s)" % type(e).__name__


def current_matches_prereset(nrs, db, rundir, log, run_id, stage, batch):
    """P9-B2: is the batch's CURRENT content equal to its recorded pre-reset hash?"""
    pre, problem = read_prereset_hash(nrs, rundir, _stage_prefix(run_id, stage), batch)
    if problem:
        return False, problem
    cur = _content_hash(nrs, db, log)
    return cur == pre, ("current=%s... pre-reset=%s..." % (cur[:16], pre[:16]))


def _stage_restore_inner(nrs, db, rundir, log, run_id="run", stage=None, batch=None, fr=False):
    """AC-3: undo any reset/partial-bill for the batch from stage-backup.
    P6-2e: after re-applying, recompute the content hash and verify it matches
    the staged hash (STAGE-RESTORED-VERIFIED); on mismatch, do NOT claim a
    clean restore."""
    pfx = _stage_prefix(run_id, stage)
    inl = ",".join("'%s'" % n for n in nrs)
    pause = float(os.environ.get("R5_FAULT_RESTORE_PAUSE_S", "0") or 0)
    # P9: never DELETE the live rows when there is nothing to put back
    want = ["%s_%s" % (pfx, t) for t in RESET_TABLES] + ["%s_reg" % pfx]
    try:
        have = {r[0] for r in dbutil.query(db,
            "SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() "
            "AND table_name LIKE '%s\\_%%'" % pfx, force_root=True)}
    except Exception as e:
        have, want = set(), ["(stage table check failed: %s)" % type(e).__name__]
    missing = [t for t in want if t not in have]
    if missing:
        log("STAGE-RESTORE-ERROR %s_*: stage tables missing %s (nothing deleted, NOT "
            "restored)" % (pfx, missing[:3]))
        return False
    try:
        for i, (t, key) in enumerate(RESET_TABLES.items()):
            s = "%s_%s" % (pfx, t)
            dbutil.execute(db, "DELETE FROM %s WHERE %s IN (%s)" % (t, key, inl),
                           force_root=fr)
            dbutil.execute(db, "REPLACE INTO %s SELECT * FROM %s WHERE %s IN (%s)"
                               % (t, s, key, inl), force_root=fr)
            if pause and i == 0:
                # P8-C3 fault-injection hook (inert unless the env var is set): hold
                # the restore half-applied so a test can kill the process here
                log("RESTORE-FAULT-PAUSE %s_*: %s restored, %d tables pending; "
                    "sleeping %.0fs" % (pfx, t, len(RESET_TABLES) - 1, pause))
                time.sleep(pause)
        dbutil.execute(db,
            "UPDATE reg_periksa rp JOIN %s_reg sr ON rp.no_rawat=sr.no_rawat "
            "SET rp.status_bayar=sr.status_bayar WHERE rp.no_rawat IN (%s)" % (pfx, inl),
            force_root=fr)
    except Exception as e:
        # a failed restore is a verdict (restored=False -> fail-closed), not a
        # traceback; the stage tables are kept so a resume can retry it
        log("STAGE-RESTORE-ERROR %s_*: %s: %s (NOT restored; stage tables kept "
            "for resume)" % (pfx, type(e).__name__, str(e)[:200]))
        return False
    # P6-2e: verify the restored content matches the pre-reset hash.
    # P8-C1: a truncated/garbled/foreign hash file is unverifiable, not a crash.
    ok = True
    pre, bad = read_prereset_hash(nrs, rundir, pfx, batch)
    if bad == "absent":
        bad = None
    if bad:
        ok = False
        log("STAGE-RESTORE-UNVERIFIED %d visits: %s; data re-applied but NOT "
            "verified — treated as a failed restore" % (len(nrs), bad))
    elif pre is not None:
        post = _content_hash(nrs, db, log)
        if pre != post:
            ok = False
            log("STAGE-RESTORE-MISMATCH: pre=%s... post=%s... (NOT a verified "
                "restore; do not claim clean)" % (str(pre)[:16], str(post)[:16]))
        else:
            log("stage-restore %d visits STAGE-RESTORED-VERIFIED (content hash "
                "matches pre-reset)" % len(nrs))
    else:
        # P7-2: no pre-reset hash means the restore cannot be verified, so it does
        # not count as one (before P7 this returned True — fail-open).
        ok = False
        log("STAGE-RESTORE-UNVERIFIED %d visits: pre-reset hash file absent; data "
            "re-applied but NOT verified — treated as a failed restore" % len(nrs))
    return ok


BENCH_ACCOUNT = "'benchmark'@'localhost'"   # the harness/consumer DML account
BENCH_DML = ("INSERT", "UPDATE", "DELETE")


def _bench_dml_privs(db):
    """Schema-level DML privileges the benchmark account holds on db."""
    rows = dbutil.query(db,
        "SELECT privilege_type FROM information_schema.schema_privileges "
        "WHERE grantee = \"%s\" AND table_schema = DATABASE()" % BENCH_ACCOUNT,
        force_root=True)
    return sorted({r[0] for r in rows} & set(BENCH_DML))


def _exclusion_marker(db):
    return os.path.join(dbutil.RESULTS_ROOT, ".writer_exclusion_%s.json"
                        % re.sub(r"[^A-Za-z0-9_]", "_", db))


def recover_writer_exclusion(db, log):
    """P10-B4 (found by suite run 1, A20): a process killed while writer exclusion is on
    never runs its `finally`, so the benchmark account kept no DML on the target and every
    later billing run failed. The exclusion is therefore recorded in a marker file BEFORE
    the revoke; whoever starts next and finds a marker of a dead process grants the
    recorded privileges back. Returns False only when a LIVE process holds the exclusion."""
    mp = _exclusion_marker(db)
    if not os.path.exists(mp):
        return True
    try:
        m = json.load(open(mp))
    except Exception:
        m = {}
    if m.get("pid") and _pid_alive(m["pid"]) and int(m["pid"]) != os.getpid():
        log("WRITER-EXCLUSION held by live pid %s on %s — refusing to proceed" % (m["pid"], db))
        return False
    privs = [p for p in (m.get("privs") or []) if p in BENCH_DML]
    if privs:
        dbutil.execute(db, "GRANT %s ON `%s`.* TO %s" % (", ".join(privs), db, BENCH_ACCOUNT),
                       force_root=True)
    back = _bench_dml_privs(db)
    os.remove(mp)
    log("WRITER-EXCLUSION recovered (P10-B4): pid %s died with exclusion on; granted %s back "
        "on %s (now %s)" % (m.get("pid"), privs or "nothing", db, back))
    return True


def stage_restore(nrs, db, rundir, log, run_id="run", stage=None, batch=None):
    """AC-3: undo any reset/partial-bill for the batch from stage-backup, hash-verified.
    P10-B4: on a fixture the restore runs under WRITER EXCLUSION: the benchmark account's
    schema-level INSERT/UPDATE/DELETE on the target are revoked, the target is fenced
    (a schema-level revoke only reaches a session at its next USE, so existing sessions
    are KILLed), the restore DML runs as root, and the privileges are granted back in
    `finally` and re-checked. Never on the live databases (logged, plain restore)."""
    if db in LIVE_DBS:
        log("WRITER-EXCLUSION skipped (P10-B4): %s is live; grants are never changed there"
            % db)
        return _stage_restore_inner(nrs, db, rundir, log, run_id, stage, batch, fr=False)
    try:
        if not recover_writer_exclusion(db, log):
            log("STAGE-RESTORE-ERROR: another live process holds writer exclusion; NOT restored")
            return False
        privs = _bench_dml_privs(db)
    except Exception as e:
        log("STAGE-RESTORE-ERROR: writer exclusion could not read grants (%s); nothing "
            "deleted, NOT restored" % type(e).__name__)
        return False
    revoked = False
    marker = _exclusion_marker(db)
    try:
        if privs:
            # durable record FIRST: if this process dies inside the window, the next
            # start grants these back (recover_writer_exclusion)
            with open(marker, "w") as f:
                json.dump({"db": db, "privs": privs, "pid": os.getpid(),
                           "ts": datetime.datetime.now(datetime.timezone.utc).isoformat()}, f)
            dbutil.execute(db, "REVOKE %s ON `%s`.* FROM %s" % (", ".join(privs), db, BENCH_ACCOUNT),
                           force_root=True)
            revoked = True
        fence_ok, killed, _ = fence_sessions(db, log)
        log("WRITER-EXCLUSION on (P10-B4) %s: revoked=%s fence_ok=%s sessions_killed=%d"
            % (db, privs or "none held", fence_ok, killed))
        if not fence_ok:
            log("STAGE-RESTORE-ERROR: target could not be fenced; nothing deleted, NOT restored")
            return False
        return _stage_restore_inner(nrs, db, rundir, log, run_id, stage, batch, fr=True)
    finally:
        if revoked:
            try:
                dbutil.execute(db, "GRANT %s ON `%s`.* TO %s" % (", ".join(privs), db, BENCH_ACCOUNT),
                               force_root=True)
                back = _bench_dml_privs(db)
            except Exception as e:
                back = ["(re-grant failed: %s)" % type(e).__name__]
            log("WRITER-EXCLUSION off (P10-B4) %s: restored=%s%s"
                % (db, back, "" if back == privs else " MISMATCH - grants not as before"))
            if back == privs:
                try:
                    os.remove(marker)
                except OSError:
                    pass


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


def _harness_writers(nrs):
    """P8-C2: live processes that can write these visits' billing rows: any
    BilingHarness JVM (or its faketime/bash wrapper) whose command line names one
    of the visits. Returns {pid: pgid}. Linux /proc only."""
    want = set(nrs)
    found = {}
    for d in os.listdir("/proc"):
        if not d.isdigit() or int(d) == os.getpid():
            continue
        try:
            with open("/proc/%s/cmdline" % d, "rb") as f:
                argv = f.read().decode("utf-8", "replace").split("\0")
            if "BilingHarness" not in " ".join(argv) or not want & set(" ".join(argv).split()):
                continue
            found[int(d)] = os.getpgid(int(d))
        except (OSError, ValueError):
            continue
    return found


def _kill_pgid(pgid, grace_s=10):
    """SIGTERM -> SIGKILL on a process group we did not spawn in this process
    (a crashed run's harness); True when the group is proven empty."""
    for sig, wait_s in ((signal.SIGTERM, grace_s), (signal.SIGKILL, 10)):
        if not _group_alive(pgid):
            return True
        try:
            os.killpg(pgid, sig)
        except ProcessLookupError:
            return True
        except OSError:
            return False
        for _ in range(int(wait_s * 4)):
            if not _group_alive(pgid):
                return True
            time.sleep(0.25)
    return not _group_alive(pgid)


LIVE_DBS = ("sik", "sik_bench")


def _mysql_clients(db):
    """P9-B4: mysql CLI processes whose argv names the target database as a separate
    token (dbutil runs the CLI that way); a crashed oracle can leave one running."""
    found = []
    for d in os.listdir("/proc"):
        if not d.isdigit() or int(d) == os.getpid():
            continue
        try:
            with open("/proc/%s/cmdline" % d, "rb") as f:
                argv = f.read().decode("utf-8", "replace").split("\0")
        except OSError:
            continue
        if argv and os.path.basename(argv[0]) in ("mysql", "mariadb") and db in argv[1:]:
            found.append(int(d))
    return found


def _target_sessions(db):
    """P9-B4: server sessions using the target database (default db, or naming it in
    the running statement), other than the session asking."""
    return dbutil.query(db,
        "SELECT id, user, command, time, LEFT(COALESCE(info,''), 80) "
        "FROM information_schema.processlist WHERE id <> CONNECTION_ID() "
        "AND command NOT IN ('Daemon', 'Binlog Dump') "
        "AND (db = DATABASE() OR info LIKE CONCAT('%', DATABASE(), '.%'))",
        force_root=True)


def fence_sessions(db, log, wait_s=10):
    """P9-B4: server-side fencing before a restore. Killing a client process does not
    stop its statement on the server (seen 2026-10-18: a DELETE ran ~7 min after its
    client was killed). Kill stray mysql clients naming the target, then KILL every
    other server session on the target and wait until none remain.
    Returns (ok, n_killed, remaining). Refused on a live database."""
    if db in LIVE_DBS:
        log("FENCE-SKIPPED (P9-B4): %s is live; sessions are never killed there "
            "(process-level proof only)" % db)
        return True, 0, []
    for pid in _mysql_clients(db):
        try:
            os.kill(pid, signal.SIGKILL)
        except OSError:
            pass
    killed = 0
    for row in _target_sessions(db):
        try:
            dbutil.execute(db, "KILL %d" % int(row[0]), force_root=True)
            killed += 1
        except Exception:
            pass  # already gone
    remaining = []
    for _ in range(int(wait_s * 2)):
        remaining = [r[0] for r in _target_sessions(db)]
        if not remaining:
            break
        time.sleep(0.5)
    log("FENCE (P9-B4) %s: sessions_killed=%d remaining=%d" % (db, killed, len(remaining)))
    return not remaining, killed, remaining


def reap_writers(st, rundir, db, log, dates, quiet_s=None, include_failed=False):
    """P8-C2: before a resume restores anything, prove no writer survives from a
    crashed run. A SIGKILLed oracle cannot run its signal handler, so its harness
    (own session) keeps running. Kill every recorded harness group and every
    BilingHarness process naming a run visit, then require (a) none remain and
    (b) the visits' output content is unchanged over a quiet interval.
    Returns True (proof logged) or False (WRITER-ALIVE: caller must not restore)."""
    nrs = sorted({v for b in st["batches"].values() for v in b["visits"]})
    groups = set()
    pidfs = []
    for d in dates:
        pidf = os.path.join(rundir, "harness_%s.log.pid" % d.replace("-", "_"))
        if os.path.exists(pidf):
            pidfs.append(pidf)
            try:
                groups.add(int(open(pidf).read().strip() or 0))
            except ValueError:
                pass
    groups.discard(0)
    groups |= set(_harness_writers(nrs).values())
    killed = []
    for g in sorted(groups):
        if _group_alive(g):
            ok = _kill_pgid(g)
            killed.append("%d:%s" % (g, "dead" if ok else "ALIVE"))
    left = _harness_writers(nrs)
    alive_groups = [g for g in groups if _group_alive(g)]
    # P10-B3: a FAILED batch about to be retried or abandoned may be restored too, so
    # it gets the same quiet-interval proof (before P10 only STAGED/RESET did)
    restorable = ("STAGED", "RESET", "FAILED") if include_failed else ("STAGED", "RESET")
    pending = [v for b in st["batches"].values()
               if b.get("status") in restorable for v in b["visits"]]
    # P9-B4: fence the server before anything may be restored (a pending batch, or a
    # FAILED batch a retry may restore)
    fence_ok, fence_killed = True, 0
    if (pending or any(b.get("status") == "FAILED" for b in st["batches"].values()))             and not left and not alive_groups:
        fence_ok, fence_killed, _ = fence_sessions(db, log)
    quiet = True
    if pending and not left and not alive_groups and fence_ok:
        qs = float(os.environ.get("R5_WRITER_QUIET_S", "5") if quiet_s is None else quiet_s)
        h1 = _content_hash(pending, db, log)
        time.sleep(qs)
        quiet = h1 == _content_hash(pending, db, log)
    if left or alive_groups or not quiet or not fence_ok:
        log("WRITER-ALIVE (P8-C2/P9-B4): harness writers=%s groups_alive=%s quiet=%s "
            "fence_ok=%s killed=%s — restore withheld, run stops (fail-closed exit 4)"
            % (sorted(left), alive_groups, quiet, fence_ok, killed))
        return False
    for pidf in pidfs:
        try:
            os.remove(pidf)
        except OSError:
            pass
    log("WRITER-DEAD-PROOF (resume, P8-C2) groups_checked=%d killed=%s "
        "harness_writers=0 fence_sessions_killed=%d quiet=%s"
        % (len(groups), killed or "none", fence_killed, "true" if pending else "n/a"))
    return True


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
    ap.add_argument("--allow-live", action="store_true",
                    help="P7-6: permit a billing run (which resets and re-bills visits) "
                         "against the live database 'sik'. DEFAULT refuses.")
    ap.add_argument("--retry-failed", action="store_true",
                    help="P8-C4/P9-B2: on resume, re-bill a FAILED batch whose CURRENT "
                         "state equals its pre-reset hash (or can be restored and verified "
                         "from the kept stage tables). DEFAULT keeps FAILED batches failed.")
    ap.add_argument("--abandon-failed", action="store_true",
                    help="P9: release the stage tables of a FAILED batch whose current "
                         "state equals its pre-reset hash (no re-bill).")
    args = ap.parse_args()
    db = args.db_name
    # P7-6: a billing run DELETEs the sampled visits' output rows before re-billing
    # them. Against live `sik` that must be a deliberate choice, never a default.
    if db == "sik" and not (args.freeze_only or args.verify_frozen or args.allow_live):
        print("LIVE-TARGET-REFUSED: a billing run resets output rows; --db-name sik "
              "requires --allow-live (use a disposable clone for tests)")
        return 3

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
    # P10-B4: undo a writer exclusion left by a process that died inside it, before
    # anything (the harness included) needs the benchmark account's DML
    if db not in LIVE_DBS and not recover_writer_exclusion(db, log):
        release_lock(rundir)
        return 3
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
    # P8-C2: reap a lingering harness from a crashed run and PROVE no writer is
    # left before any restore (pre-P8 this waited on the bash wrapper's pid only,
    # then removed the pid file and restored even if the JVM was still running).
    if not reap_writers(st, rundir, db, log, dates,
                        include_failed=args.retry_failed or args.abandon_failed):
        release_lock(rundir)
        return 4
    failed = False
    for d in dates:
        b = st["batches"].get(d)
        if b and b["status"] == "FAILED" and (args.retry_failed or args.abandon_failed):
            # P9-B2: judge the batch by its CURRENT content against its own pre-reset
            # hash, never by the stored restored=True flag (state can change after the
            # original verification)
            same, why = current_matches_prereset(b["visits"], db, rundir, log, tool.run_id,
                                                 st.get("stage"), d)
            if args.abandon_failed:
                if same:
                    b["abandoned"] = True
                    log("date %s: ABANDON-FAILED (P9): current state equals the pre-reset "
                        "hash (%s); stage tables released at finalize" % (d, why))
                else:
                    log("date %s: ABANDON-REFUSED: current state is not the pre-reset "
                        "state (%s); stage tables kept" % (d, why))
                save_state(rundir, st)
                failed = True
                break
            if same:
                log("date %s: RETRY-FAILED (P9-B2): previous failure '%s'; current state "
                    "re-verified against the pre-reset hash (%s) -> re-billing"
                    % (d, b.get("fail_reason", "?"), why))
            else:
                log("date %s: RETRY: current state is not the pre-reset state (%s); "
                    "restoring from the kept stage tables first" % (d, why))
                if not stage_restore(b["visits"], db, rundir, log, tool.run_id,
                                     stage=st.get("stage"), batch=d):
                    log("date %s: RETRY-REFUSED (pre-reset state could not be restored "
                        "and verified; stays FAILED, nothing re-billed)" % d)
                    failed = True
                    break
                log("date %s: RETRY-FAILED (P9-B2): previous failure '%s'; pre-reset "
                    "state restored and verified -> re-billing"
                    % (d, b.get("fail_reason", "?")))
            b["restored"] = True
            b["retried_from"] = b.get("fail_reason", "?")
            b["status"] = "PENDING"
            save_state(rundir, st)
        if b and b["status"] == "FAILED":
            # P9-B3: a FAILED batch stops the run on resume too (before P9 the loop
            # continued and billed the later dates)
            log("date %s: FAILED batch — run stops here; later batches not billed "
                "(P9-B3; --retry-failed repairs it, --abandon-failed releases it)" % d)
            failed = True
            break
        if not b or b["status"] == "BILLED":
            continue
        # non-BILLED batch: restore pre-reset state, re-reset, (re)bill below.
        if b["status"] in ("STAGED", "RESET"):
            if not stage_restore(b["visits"], db, rundir, log, tool.run_id,
                                 stage=st.get("stage"), batch=d):
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
        stage_backup(nrs, db, rundir, log, run_id, stage=st.get("stage"), batch=d)
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
                                 stage=st.get("stage"), batch=d)
        b["status"] = "FAILED"
        b["restored"] = bool(restored)
        b["fail_reason"] = ("harness rc=%d" % rc) if rc != 0 else \
            "sukses=false for %d/%d visits" % (sum(1 for v in nrs if not sukses.get(v)), len(nrs))
        save_state(rundir, st)
        # P9-A1: say what actually happened to the pre-reset state
        log("date %s: FAILED (%s) — pre-reset state %s, run stops (P5-2)"
            % (d, b["fail_reason"], "restored (hash-verified)" if restored
               else "NOT restored (unverified/mismatch/error; stage tables kept)"))
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
                        or (b.get("status") == "FAILED" and b.get("restored") is False))
    # P10-B2: a batch whose stage backup FAILED is in this list too (before P10 it was
    # excluded, so its stage tables - possibly the rows kept from an earlier backup -
    # were dropped exactly when the backup failed)
    # P9-B2: a FAILED batch keeps its stage tables (the only copy of its pre-reset rows)
    # until it is BILLED by --retry-failed or released by --abandon-failed
    held = sorted(d for d, b in st["batches"].items()
                  if b.get("status") == "FAILED" and b.get("restored") is True
                  and not b.get("abandoned"))
    if unrestored:
        log("STAGE-KEEP %s_*: batches %s not verifiably restored — stage tables "
            "kept for a resume/manual restore (box NOT clean)"
            % (_stage_prefix(tool.run_id, st.get("stage")), unrestored))
        drop_ok = False
    elif held:
        log("STAGE-KEEP %s_*: FAILED batches %s restored but held for --retry-failed "
            "(--abandon-failed releases them; box NOT clean)"
            % (_stage_prefix(tool.run_id, st.get("stage")), held))
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
                "failed_batches=%d drift(in-envelope)=%d rate=%.4f parse_errors=%d\n"
                % (len(st["nrs"]), len(results), len(in_env_results),
                   len(out_of_env), len(failed_batches), len(drift), rate,
                   len(parse_errors)))
        # P8-A2: measured recovery properties of THIS run, not a blanket crash_safe
        f.write("- recovery: batches=%d billed=%d failed=%d failed_restored_verified=%d "
                "unrestored=%d retried=%d\n"
                % (len(st["batches"]),
                   sum(1 for b in st["batches"].values() if b.get("status") == "BILLED"),
                   sum(1 for b in st["batches"].values() if b.get("status") == "FAILED"),
                   sum(1 for b in st["batches"].values()
                       if b.get("status") == "FAILED" and b.get("restored") is True),
                   len(unrestored),
                   sum(1 for b in st["batches"].values() if b.get("retried_from"))))
        f.write("- stage-drop-verified=%s (P6-2e)\n" % ("YES" if drop_ok else "NO"))
        if out_of_env:
            f.write("- OUT-OF-ENVELOPE (excluded from drift; P5-3 eligibility-"
                    "based classification): %d — %s\n"
                    % (len(out_of_env), ", ".join(sorted(out_of_env))))
        if failed_batches:
            # P10-A2: state each FAILED batch's actual restore result (before P10 every
            # one was labelled "restored from stage backup")
            def _restore_state(b):
                if str(b.get("fail_reason", "")).startswith("stage-backup"):
                    return "backup failed; stage tables kept"
                if b.get("restored") is True:
                    return "restored, hash-verified"
                return "NOT restored; stage tables kept"
            f.write("- FAILED batches (P5-2): %s\n"
                    % ", ".join("%s(%s; %s)" % (d, st["batches"].get(d, {}).get("fail_reason", "?"),
                                                _restore_state(st["batches"][d]) if d in st["batches"]
                                                else "stage tables not dropped")
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
