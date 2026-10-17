import sys
sys.path.insert(0, "/opt/Deers-Rock/tools")
from oracle_diff_30_50 import select_visits

sel, cov, sh, tags = select_visits()
print("selected", len(sel))
print("coverage", cov)
print("shortfalls", sh)
print("half_rupiah in sample:", tags["half_rupiah"])
print("count check: total=%d" % len(sel))
# ensure no duplicates
nrs = [v["no_rawat"] for v in sel]
assert len(set(nrs)) == len(nrs), "DUPLICATES in selection!"
print("no duplicates OK")
