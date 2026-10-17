import sys
sys.path.insert(0, "/opt/Deers-Rock/tools")
import oracle_diff_30_50 as m

# Java Math.round semantics sanity (half-up, vs Python banker's round)
assert m.java_round(16.5) == 17, m.java_round(16.5)      # Python round(16.5)==16 (wrong for Java)
assert m.java_round(0.5) == 1
assert m.java_round(-0.4) == 0
assert m.java_round(5712.96) == 5713
assert m.java_round(1.4999999996) == 1
assert m.java_round(150 * 0.11) == 17, (150 * 0.11, m.java_round(150 * 0.11))
print("java_round OK")
print("half-frac check:", abs((150 * 0.11) % 1.0 - 0.5) < 1e-6)

# selection dry-run
sel, cov, short, tags = m.select_visits()
print("selected", len(sel), "coverage", cov)
print("shortfalls", short)
print("first 5:", [v["no_rawat"] for v in sel[:5]])

# source hash dry-run
h = m.source_hash()
print("source_hash:", h)
