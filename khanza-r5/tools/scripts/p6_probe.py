import io
for f in ["charge_delta_per_component_p2.py","three_count_reconcile_p2.py","build_dr_charge_ledger_p2.py"]:
    src = io.open("C:/Users/think/AppData/Local/Temp/opencode/"+f, encoding="utf-8").read()
    print("=== "+f+" ===")
    for i, line in enumerate(src.splitlines(), 1):
        if "8____" in line or "no_rawat LIKE" in line:
            print(i, line.strip())

