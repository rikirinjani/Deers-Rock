"""P18 C2 (was P17 D4): one machine-readable current release inventory for the box tools (read-only).

Reads the frozen manifests in chronological order (a later manifest that names a file supersedes an
earlier one), hashes every file as it is on disk, and writes JSON: for each tool file the sha256 pinned by
the newest manifest that names it, that manifest, the sha256 on disk and whether they agree.
Usage (on the box, no lock needed, writes nothing but stdout): python3 p18_release_inventory.py > inventory.json
Local mode (P18: used after the final box capture so that the box is not touched again; local files equal the box
files by sha256, CR removed): python p18_release_inventory.py --local <path of khanza-r5> > inventory.json
"""
import glob
import hashlib
import json
import os
import re
import sys

CRLF, LF = bytes([13, 10]), bytes([10])   # a file is hashed with CR removed in --local mode (files may be CRLF on disk)
LOCAL = None
if len(sys.argv) > 2 and sys.argv[1] == "--local":
    LOCAL = sys.argv[2]

TOOLS = "/opt/Deers-Rock/tools"
# P18 M12: the P13 manifest lives under /opt/dr-benchmark/evidence/p13 (see p14_live_state.sh), not in TOOLS;
# an entry that matches no file is an error, not a silent skip
ORDER = [TOOLS + "/p11_frozen_20261024c.sha256", "/opt/dr-benchmark/evidence/p13/r5_p13_frozen_manifest_20261025.sha256",
         TOOLS + "/p14_frozen_20261026.sha256", TOOLS + "/p15_frozen_20261026b.sha256",
         TOOLS + "/p16_frozen_20261026b.sha256", TOOLS + "/p17_frozen_20261027b.sha256",
         TOOLS + "/p18_frozen_*.sha256"]
if LOCAL:
    TOOLS = LOCAL + "/tools"
    ORDER = [LOCAL + "/evidence/p12/r5_frozen_manifest_20261024c.sha256", LOCAL + "/evidence/p13/r5_p13_frozen_manifest_20261025.sha256",
             LOCAL + "/evidence/p14/p14_frozen_20261026.sha256", LOCAL + "/evidence/p15/r5_p15_frozen_manifest_20261026b.sha256",
             LOCAL + "/evidence/p16/r5_p16_frozen_manifest_20261026b.sha256", LOCAL + "/evidence/p17/r5_p17_frozen_manifest_20261027b.sha256",
             LOCAL + "/evidence/p18/r5_p18_frozen_manifest_20261027.sha256"]


def sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk.replace(CRLF, LF) if LOCAL else chunk)
    return h.hexdigest()


inv, manifests = {}, []
for pat in ORDER:
    found = sorted(glob.glob(pat))
    if not found:
        raise SystemExit("INVENTORY ERROR: no manifest matches %s" % pat)
    for m in found:
        manifests.append(os.path.basename(m))
        for line in open(m):
            mt = re.match(r"^([0-9a-f]{64})\s+\*?(\S+)$", line.strip())
            if mt:
                inv[mt.group(2)] = {"pinned_sha256": mt.group(1), "manifest": os.path.basename(m)}
for name, rec in sorted(inv.items()):
    p = os.path.join(TOOLS, name)
    rec["on_disk_sha256"] = sha(p) if os.path.exists(p) else None
    rec["ok"] = rec["on_disk_sha256"] == rec["pinned_sha256"]
out = {"generated_by": "tools/p18_release_inventory.py" + (" --local (CR removed)" if LOCAL else ""), "scope": "tool files named by the manifests listed in manifests_in_order; "
       "a file in no manifest is not in this inventory", "manifests_in_order": manifests,
       "files": len(inv), "ok": sum(1 for r in inv.values() if r["ok"]),
       "not_ok": sorted(n for n, r in inv.items() if not r["ok"]), "inventory": inv}
print(json.dumps(out, indent=1, sort_keys=True))
