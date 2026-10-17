#!/usr/bin/env python3
r"""scrub_publishable.py — in-place secret/IP scrubber for publishable docs.

Safety net called by run_all.sh Phase 6 ONLY if the orchestrator scrub grep
    grep -rEn '([0-9]{1,3}\.){3}[0-9]{1,3}|benchmark_pw|EnkripsiAES|<KHANZA_AES_KEY>|<KHANZA_AES_IV>|usere'
already found a hit in BENCHMARK_REPORT_publishable.md. Also works
standalone on any Markdown file.

Scrubs (idempotently — replacements contain none of the source patterns):
  - every IPv4-looking dotted quad        -> <ip>   (addresses that belong
    to the local box at runtime, detected via the OS, -> <vps-host> instead)
  - benchmark_pw                           -> benchmark password file
  - EnkripsiAES                            -> <redacted-cipher>
  - <KHANZA_AES_KEY> / <KHANZA_AES_IV>            -> <redacted-key>
  - usere                                  -> <db-user>

After rewriting, the file is verified in-memory against the orchestrator
regex above; exit 0 on clean, 1 if a pattern somehow survived (should be
impossible — every replacement token is pattern-free), 2 on bad usage /
unreadable file.

Usage: python3 scrub_publishable.py <path-to-markdown> [--check]
  --check: report what would be scrubbed WITHOUT modifying the file.
"""
import re
import socket
import sys

# Exactly the orchestrator Phase-6 grep (ERE), compiled for self-verification.
ORCH_GREP = re.compile(r"([0-9]{1,3}\.){3}[0-9]{1,3}|benchmark_pw"
                       r"|EnkripsiAES|<KHANZA_AES_KEY>|<KHANZA_AES_IV>|usere")
# Broader-than-grep IPv4 (no boundary assumptions) so embedded quads die too.
IPV4_RE = re.compile(r"(?:[0-9]{1,3}\.){3}[0-9]{1,3}")

LITERALS = [
    ("benchmark_pw", "benchmark password file"),
    ("EnkripsiAES", "<redacted-cipher>"),
    ("<KHANZA_AES_KEY>", "<redacted-key>"),
    ("<KHANZA_AES_IV>", "<redacted-key>"),
    ("usere", "<db-user>"),
]


def local_ips():
    """Best-effort runtime detection of this box's own addresses."""
    ips = set()
    try:
        ips.update(socket.gethostbyname_ex(socket.gethostname())[2])
    except OSError:
        pass
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(("10.255.255.255", 1))  # no packets sent; routing only
            ips.add(s.getsockname()[0])
        finally:
            s.close()
    except OSError:
        pass
    return {i for i in ips if IPV4_RE.fullmatch(i)}


def scrub_text(text, ips=None):
    """Return (scrubbed_text, counts). Pure function; no I/O."""
    counts = {"ip": 0, "vps_host": 0, "literal": 0}
    ips = ips if ips is not None else set()

    def ip_sub(m):
        if m.group(0) in ips:
            counts["vps_host"] += 1
            return "<vps-host>"
        counts["ip"] += 1
        return "<ip>"

    text = IPV4_RE.sub(ip_sub, text)
    for secret, token in LITERALS:
        n = text.count(secret)
        if n:
            counts["literal"] += n
            text = text.replace(secret, token)
    return text, counts


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    check_only = "--check" in sys.argv[1:]
    if len(args) != 1:
        sys.stderr.write("usage: python3 scrub_publishable.py <path> "
                         "[--check]\n")
        return 2
    path = args[0]
    try:
        with open(path, "r", encoding="utf-8", errors="strict") as f:
            original = f.read()
    except (OSError, UnicodeError) as e:
        sys.stderr.write("ERROR: cannot read %s: %s\n" % (path, e))
        return 2

    scrubbed, counts = scrub_text(original, local_ips())
    total = sum(counts.values())
    leftovers = ORCH_GREP.findall(scrubbed)

    print("scrub_publishable: %s" % path)
    print("  replacements: %d (ipv4-><ip>=%d, box-ip-><vps-host>=%d, "
          "literals=%d)" % (total, counts["ip"], counts["vps_host"],
                            counts["literal"]))
    if leftovers:
        # Cannot happen with the current replacement set; kept as a hard
        # guard so a future pattern addition can never silently pass.
        sys.stderr.write("ERROR: %d pattern(s) survived scrubbing: %r\n"
                         % (len(leftovers), leftovers[:5]))
        return 1
    if total == 0:
        print("  already clean (0 replacements; idempotent no-op)")
        return 0
    if check_only:
        print("  --check: file NOT modified")
        return 0
    try:
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(scrubbed)
    except OSError as e:
        sys.stderr.write("ERROR: cannot write %s: %s\n" % (path, e))
        return 2
    print("  file rewritten in place; orchestrator grep now returns 0 "
          "matches")
    return 0


if __name__ == "__main__":
    sys.exit(main())
