"""P24 claim check (local, read-only, NOT deployed to the box and in no frozen manifest).

The independent reviews of P15-P23 kept finding sentences in the records that the transcripts contradict. This script makes the
numbers of a record checkable: a claims file lists each claim with the log it rests on and a regular expression; the script
prints MATCHED / NOT-FOUND for every claim and CONTRADICTED when a "forbid" expression also matches. Exit 0 only if every claim
is MATCHED. It proves that the text of a log contains the claimed line, nothing more.
Usage (from khanza-r5/): python tools/p24_claim_check.py docs/p24_claims.json
Claims file: [{"claim": "...", "file": "evidence/...", "regex": "...", "count": 1, "forbid": "..." (optional)}, ...]
"""
import json
import re
import sys

claims = json.load(open(sys.argv[1], encoding="utf8"))
bad = 0
for c in claims:
    try:
        text = open(c["file"], encoding="utf8", errors="replace").read()
    except OSError as e:
        print("NOT-FOUND    %s  (cannot read %s: %s)" % (c["claim"], c["file"], e.__class__.__name__))
        bad += 1
        continue
    n = len(re.findall(c["regex"], text, re.M))
    if "forbid" in c and re.search(c["forbid"], text, re.M):
        print("CONTRADICTED %s  (%s matches the forbidden pattern)" % (c["claim"], c["file"]))
        bad += 1
    elif n >= c.get("count", 1):
        print("MATCHED      %s  (%d x in %s)" % (c["claim"], n, c["file"]))
    else:
        print("NOT-FOUND    %s  (%d of %d in %s)" % (c["claim"], n, c.get("count", 1), c["file"]))
        bad += 1
print("claim check: %d claims, %d not matched" % (len(claims), bad))
sys.exit(1 if bad else 0)
