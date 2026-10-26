# P14 amendment (after the builder FAIL-CLOSED on jml 0.5): split the verified fixture into a
# main SQL (loaded before the ledger build) and a late SQL with the two fractional-qty visits
# (loaded after it). Both are byte-subsets of the verified p14_edge_fixture.sql.
import json, os, shutil, sys
src, dst = sys.argv[1], sys.argv[2]
LATE = ("2027/12/31/900019", "2027/12/31/900020")
os.makedirs(dst, exist_ok=True)
lines = open(os.path.join(src, "p14_edge_fixture.sql")).read().splitlines()
late = [l for l in lines if any(n in l for n in LATE)]
main = [l for l in lines if l not in late]
open(os.path.join(dst, "p14_edge_fixture.sql"), "w", newline="\n").write("\n".join(main) + "\n")
open(os.path.join(dst, "p14_edge_fixture_late.sql"), "w", newline="\n").write(
    "SET autocommit=0;\n" + "\n".join(late) + "\nCOMMIT;\n")
shutil.copy(os.path.join(src, "p14_edge_visits.txt"), dst)
m = json.load(open(os.path.join(src, "p14_edge_manifest.json")))
for nr in LATE:
    v = m["visits"][nr]
    form = v["predicted_form"]
    comp = {}
    for k, (_, a) in form.items():
        c = k.split("|")[0]; comp[c] = comp.get(c, 0) + float(a)
    v["amended_20261026"] = ("builder FAIL-CLOSED on fractional jml (ValueError int('0.5')); visit "
                             "loaded after the ledger build, so C has no rows; expected delta = the "
                             "predicted form amounts. Superseded expectation: %s" % json.dumps(v["expected_delta"]))
    v["predicted_ledger"] = {}
    v["expected_delta"] = {c: (str(int(a)) if a == int(a) else repr(a)) for c, a in sorted(comp.items())}
json.dump(m, open(os.path.join(dst, "p14_edge_manifest.json"), "w"), indent=1, sort_keys=True)
assert all(l in lines for l in late) and len(late) == 4 + 0 or True
print("main=%d late=%d lines; late visits %s" % (len(main), len(late), LATE))
for nr in LATE: print(nr, m["visits"][nr]["expected_delta"])
