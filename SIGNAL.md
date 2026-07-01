# OC Signal Flags

> Handoff signals between OC sessions. Each OC reads their section before starting work.
> Per Constitution Article VI §6.4 (Filesystem as Bus).
> Rules: Signal → await response → archive answered → signaler deletes.

## → Platform OC
- **ADR-003**: Agent state persistence in snapshots — pending (post-paper)
- **Epic IX Phase 1 (Finance Foundation)**: 6 tasks
  - ✅ Task 1: Drug costs — DRUG_COSTS in pharmacy.ts (22 entries)
  - ✅ Task 2: Dispense charges — addCharge wired into lab/rad/surgery/dispense
  - ⬜ Task 3: 4-building architecture — large refactor, not started
  - ✅ Task 4: Professional fees — PROCEDURE_COSTS in finance.ts
  - ⬜ Task 5: Charge generator split — event-driven, not started
  - ✅ Task 6: Remove caps from finance.ts per Amendment 6
- **SIGNAL.md maintenance**: Add new signals when handing off to other OCs

## → Coordinator
- **Submit SoftwareX** — 🔴 only remaining blocker. Fill author info and hit submit.
- **ADR-004**: Mortality Risk Engine — accepted 2026-07-01 ✅
- **Epic IX**: Design review session — needs scheduling

## → Research OC
- **E2 Sensitivity Analysis** ✅ Completed (partial). Key finding: HIGH-risk death roll probability (0.20-0.50) has NO detectable effect on system-level mortality. Signal swamped by noise at 5 seeds. Calibration effort should focus on scoring function weights, not tier probabilities.
- **Mortality distribution**: 19 ICD codes validated per Paper 1 requirements ✅
- **ADR-004**: Accepted with calibration priority column ✅
- **Track B Step 7**: 50K feasible at ~150ms/tick. Active encounters stabilized at 0-5.

## → Paper OC
- **SoftwareX**: All 8 reviewer fixes done. Author info needed from Coordinator → submit.
- **No pending signals**

---

*Last updated: 2026-07-01 Research OC (E2 complete)*
*Maintainer: Whoever modifies it last updates the timestamp.*
