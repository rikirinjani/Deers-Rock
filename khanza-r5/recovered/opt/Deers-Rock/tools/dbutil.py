#!/usr/bin/env python3
"""dbutil.py — shared helpers for the DR-benchmark Phase 1 tools.

DB access: mysql CLI as user `benchmark` (password read at runtime from
/opt/simrs-khanza/run-env/benchmark_pw, passed via MYSQL_PWD env — never on a
command line, never printed, never logged). SQL is delivered on stdin so no
shell-quoting issues and no secrets in process argv.

No third-party Python packages required (mysql-connector/pymysql absent on-box).
"""
import datetime
import os
import subprocess
import sys

TOOLS_DIR = "/opt/Deers-Rock/tools"
RESULTS_ROOT = "/opt/dr-benchmark/results"
DECISIONS = "/opt/dr-benchmark/DECISIONS.md"
PW_FILE = "/opt/simrs-khanza/run-env/benchmark_pw"
KHANZA_DIR = "/opt/simrs-khanza"
EXPORT_SH = "/opt/simrs-khanza/consumer/dr_export.sh"
ENCOUNTERS = "/tmp/dr_encounters.txt"
CONSUMER_CP = ("consumer:KhanzaSecurity16bit/dist/KhanzaSecurity16bit.jar:"
               "lib/mariadb.jar:resumepasien/lib/commons-codec-1.10.jar:"
               "resumepasien/lib/org-apache-commons-codec.jar")


def mysql_pw():
    with open(PW_FILE, "r", encoding="utf-8") as f:
        return f.read().strip()


def _mysql(db, sql, timeout=300, force_root=False):
    """Run SQL via the mysql CLI. Returns CompletedProcess. Raises on rc!=0.

    Privilege model (P5):
      - Default: the benchmark user performs the SQL (minimally-privileged
        data surface). For stage-table DDL the oracle passes force_root=True so
        CREATE/DROP escalate to root (the benchmark user lacks CREATE).
      - DBUTIL_FORCE_ROOT=1 (isolated-clone / scratch-fixture mode): EVERY
        operation — DDL and DML alike — routes through root, because scratch
        databases (e.g. sik_p2) have no grants for the benchmark user at all.
        This is the documented way to run the oracle against a non-live clone.
    """
    env = dict(os.environ)
    if os.environ.get("DBUTIL_FORCE_ROOT") == "1":
        force_root = True
    argv = ["mysql", "-N", "-B", "--default-character-set=utf8mb4", db]
    if force_root:
        argv.insert(1, "-uroot")
    else:
        env["MYSQL_PWD"] = mysql_pw()
        argv.insert(1, "-ubenchmark")
    p = subprocess.run(argv, input=sql, capture_output=True, text=True,
                       env=env, timeout=timeout)
    if p.returncode != 0:
        raise RuntimeError("mysql rc=%d: %s" % (p.returncode, p.stderr.strip()[:400]))
    return p


def query(db, sql, timeout=120, force_root=False):
    """SELECT → list of rows (each row = list of string cells; NULL -> None).
    force_root=True reads as root (e.g. information_schema rows for stage
    tables the benchmark user cannot see)."""
    p = _mysql(db, sql, timeout=timeout, force_root=force_root)
    rows = []
    for line in p.stdout.split("\n"):
        if line == "":
            continue
        rows.append([None if c == "NULL" else c for c in line.split("\t")])
    return rows


def scalar(db, sql, timeout=120, force_root=False):
    r = query(db, sql, timeout, force_root=force_root)
    return r[0][0] if r and r[0] else None


def execute(db, sql, timeout=300, force_root=False):
    """Multi-statement execute (UPDATE/DELETE/INSERT ...; joined by ;).
    force_root=True runs the DDL as root (privilege ops); otherwise the
    benchmark user (data surface kept minimally-privileged)."""
    return _mysql(db, sql, timeout=timeout, force_root=force_root).stdout


def session(db, force_root=False):
    """P6-3: a PERSISTENT mysql connection for a true multi-statement
    transaction.

    The default execute() spawns a NEW `mysql` process per call, so a
    `START TRANSACTION ... DELETE` on one connection and a `COMMIT` on another
    do NOT form one transaction — the uncommitted DELETE rolls back when the
    first connection closes. session() keeps a single `mysql` process alive
    and streams statements to it over a pipe, so the whole
    START/DELETE/INSERT/COMMIT runs in ONE session and is genuinely atomic.

    Usage:
        s = dbutil.session(LEDGER_DB)
        s.exec("START TRANSACTION; DELETE FROM t WHERE ...;")
        s.exec("REPLACE INTO t VALUES (...),(...);")
        s.exec("COMMIT;")
        ok = s.close()            # verifies mysql rc==0; False + s.last_error
        # mid-build failure: s.rollback()  then  s.close()
    """
    env = dict(os.environ)
    argv = ["mysql", "-N", "-B", "--default-character-set=utf8mb4", db]
    if force_root or os.environ.get("DBUTIL_FORCE_ROOT") == "1":
        argv.insert(1, "-uroot")
    else:
        env["MYSQL_PWD"] = mysql_pw()
        argv.insert(1, "-ubenchmark")
    p = subprocess.Popen(argv, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL,
                         stderr=subprocess.PIPE, text=True, env=env)

    class _S:
        proc = p
        last_error = ""
        _closed = False
        _failed = False

        def exec(self, sql, timeout=300):
            """Send one statement batch to the SAME session. True iff accepted;
            errors surface at close()/rollback() (streaming mode), so a failed
            statement here is detected when the session is closed."""
            if self._closed:
                self.last_error = "session already closed"
                return False
            try:
                p.stdin.write(sql if sql.endswith("\n") else sql + "\n")
                p.stdin.flush()
                return True
            except Exception as e:
                # A broken pipe means mysql already exited (batch mode aborts
                # on the first failing statement). Reap it so the error that
                # matters — mysql's own rc/stderr — reaches the log, not just
                # "Broken pipe". The server rolled back the open transaction
                # when the connection dropped.
                self._failed = True
                self._closed = True
                err = ""
                try:
                    _, err = p.communicate(timeout=30)
                except Exception:
                    pass
                self.last_error = "%s: %s; mysql rc=%s: %s" % (
                    type(e).__name__, str(e)[:120], p.returncode,
                    (err or "").strip()[:300])
                return False

        def rollback(self):
            """Fail-closed: roll back any open transaction on a mid-build error."""
            try:
                p.stdin.write("ROLLBACK;\n")
                p.stdin.flush()
            except Exception:
                pass

        def close(self):
            """Close the session and verify mysql rc==0. True iff the session
            ended cleanly; False + last_error otherwise (a partial build is
            never reported as committed)."""
            if self._closed:
                return self.last_error == ""
            self._closed = True
            # communicate() sends EOF itself and WAITS for mysql to finish the
            # streamed batch (incl. COMMIT). Closing stdin by hand first made
            # communicate() raise "I/O operation on closed file", so a clean
            # build was reported as failed while mysql was still committing.
            try:
                out, err = p.communicate(timeout=900)
            except subprocess.TimeoutExpired:
                p.kill()
                p.communicate()
                self.last_error = "close: mysql did not finish within 900s (killed; uncommitted work rolled back)"
                return False
            except Exception as e:
                self.last_error = "close: %s: %s" % (type(e).__name__, str(e)[:300])
                return False
            if p.returncode != 0:
                self.last_error = "mysql rc=%d: %s" % (
                    p.returncode, (err or "").strip()[:400])
                return False
            return True

    return _S()


def run_export():
    """Run the DR export script → /tmp/dr_encounters.txt. Returns (rc, output)."""
    p = subprocess.run(["bash", EXPORT_SH], capture_output=True, text=True,
                       timeout=300)
    return p.returncode, (p.stdout or "") + (p.stderr or "")


def run_consumer(log_path, timeout=1800):
    """Run KhanzaBillingConsumer over /tmp/dr_encounters.txt. Returns (rc, tail)."""
    with open(log_path, "w", encoding="utf-8") as lf:
        p = subprocess.run(["java", "-cp", CONSUMER_CP, "KhanzaBillingConsumer",
                            ENCOUNTERS, log_path],
                           cwd=KHANZA_DIR, stdout=lf, stderr=subprocess.STDOUT,
                           timeout=timeout)
    tail = ""
    try:
        with open(log_path, "r", encoding="utf-8", errors="replace") as lf:
            tail = "".join(lf.readlines()[-15:])
    except OSError:
        pass
    return p.returncode, tail


def decision(title, body=""):
    """Append a dated entry to DECISIONS.md (title-marker-guarded: idempotent)."""
    existing = ""
    if os.path.exists(DECISIONS):
        with open(DECISIONS, "r", encoding="utf-8") as f:
            existing = f.read()
    if title in existing:
        return False
    ts = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with open(DECISIONS, "a", encoding="utf-8") as f:
        f.write("\n## %s — %s\n%s\n" % (ts, title, body.strip()))
    return True


class Tool:
    """Per-tool logger: stdout + /opt/dr-benchmark/results/<run_id>/<name>.log."""

    def __init__(self, name):
        self.name = name
        self.run_id = (sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("-")
                       else os.environ.get("RUN_ID")
                       or datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ"))
        self.dir = os.path.join(RESULTS_ROOT, self.run_id)
        os.makedirs(self.dir, exist_ok=True)
        self.log_path = os.path.join(self.dir, "%s.log" % name)
        self.f = open(self.log_path, "a", encoding="utf-8")

    def log(self, msg):
        line = "[%s] %s" % (datetime.datetime.now().strftime("%H:%M:%S"), msg)
        print(line, flush=True)
        self.f.write(line + "\n")
        self.f.flush()

    def artifact(self, name, text):
        path = os.path.join(self.dir, name)
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        self.log("artifact written: %s" % path)
        return path

    def close(self):
        try:
            self.f.close()
        except OSError:
            pass
