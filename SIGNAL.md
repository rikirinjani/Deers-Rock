# OC Signal Flags

> Handoff signals between OC sessions. Each OC reads their section before starting work.
> Per Constitution Article VI §6.4 (Filesystem as Bus).
> Rules: Signal → await response → archive answered → signaler deletes.

## → Platform OC
- **ADR-003**: Agent state persistence in snapshots — pending (post-paper)
- **Epic IX Phase 1 (Finance Foundation)**: 4/6 tasks done (commit 3c2ed24)
  - ✅ Task 1: Drug costs
  - ✅ Task 2: Dispense charges
  - ⬜ Task 3: 4-building architecture — deferred, human will discuss directly
  - ✅ Task 4: Professional fees
  - ✅ Task 5: Charge generator split — `charge-generator.ts` created, all handlers use `generateCharge()`
  - ✅ Task 6: Remove caps
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

*Last updated: 2026-07-01 Coordinator (Phase 1 status synced)*
*Maintainer: Whoever modifies it last updates the timestamp.*
