"""P17 D4: one machine-readable current release inventory for the box tools (read-only).

Reads the frozen manifests in chronological order (a later manifest that names a file supersedes an
earlier one), hashes every file as it is on disk, and writes JSON: for each tool file the sha256 pinned by
the newest manifest that names it, that manifest, the sha256 on disk and whether they agree.
Usage (on the box, no lock needed, writes nothing but stdout): python3 p17_release_inventory.py > inventory.json
"""
import glob
import hashlib
import json
import os
import re

TOOLS = "/opt/Deers-Rock/tools"
ORDER = ["p11_frozen_20261024c.sha256", "p13_frozen_*.sha256", "p14_frozen_20261026.sha256",
         "p15_frozen_20261026b.sha256", "p16_frozen_20261026b.sha256", "p17_frozen_20261027b.sha256"]


def sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


inv, manifests = {}, []
for pat in ORDER:
    for m in sorted(glob.glob(os.path.join(TOOLS, pat))):
        manifests.append(os.path.basename(m))
        for line in open(m):
            mt = re.match(r"^([0-9a-f]{64})\s+\*?(\S+)$", line.strip())
            if mt:
                inv[mt.group(2)] = {"pinned_sha256": mt.group(1), "manifest": os.path.basename(m)}
for name, rec in sorted(inv.items()):
    p = os.path.join(TOOLS, name)
    rec["on_disk_sha256"] = sha(p) if os.path.exists(p) else None
    rec["ok"] = rec["on_disk_sha256"] == rec["pinned_sha256"]
out = {"generated_by": "tools/p17_release_inventory.py", "manifests_in_order": manifests,
       "files": len(inv), "ok": sum(1 for r in inv.values() if r["ok"]),
       "not_ok": sorted(n for n, r in inv.items() if not r["ok"]), "inventory": inv}
print(json.dumps(out, indent=1, sort_keys=True))
