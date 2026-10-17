#!/usr/bin/env python3
"""dr_perf_profile_30d.py — 30-day DR perf profile at class C
(determinism_audit_checklist / brief Phase 1.6) — DEFERRED-STUB.

Target: time a 30-day DR run at class C profile (weekday 300/day, Sat 120,
Sun 30, Poisson arrivals 08:00-14:00), fit growth vs ticks, profile and fix
any superlinear per-tick hotspot; re-run B3 if the fix lands it under 12h.

Status: the DR engine source (Deers-Rock generator, Project_v2/Deers-Rock on
the operator's machine) is NOT in the benchmark asset bundle and not deployed
on this VPS, so there is nothing on-box to time. This stub records the
deferral in DECISIONS.md and exits 0 so the orchestrator can proceed (the
profile must be re-run when the generator is deployed, before Stage B B3
conclusions are drawn — the B3 headline is only valid if perf was profiled).
"""
import sys

sys.path.insert(0, "/opt/Deers-Rock/tools")
from dbutil import Tool, decision  # noqa: E402


def main():
    t = Tool("dr_perf_profile_30d")
    t.log("DR engine not yet on-box; perf profile deferred to when the generator is deployed")
    t.log("class C profile for the deferred run: weekday 300/day, Sat 120, Sun 30, "
          "Poisson arrivals, 08:00-14:00 window, 30 simulated days, growth-vs-ticks fit; "
          "superlinear per-tick cost -> profile + fix hotspot before B3")
    decision("30-day DR perf profile deferred (engine not on-box)",
             "The DR generator source is not in the benchmark asset bundle; nothing "
             "on-box to time. Deferred to generator deployment. Constraint recorded: "
             "Stage B B3 (365-day headline) conclusions require this profile to have "
             "run (superlinear per-tick growth check); if B3 exceeds 12h after the "
             "perf fix, run_all lowers weekday arrivals 300->200/day and re-runs B3, "
             "and the report must state the final rate actually used.")
    t.log("RESULT: stub complete (exit 0; DECISIONS.md noted)")
    t.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
