# OC Signal Flags

> Handoff signals between OC sessions. Each OC reads their section before starting work.
> Per Constitution Article VI §6.4 (Filesystem as Bus).
> Rules: Signal → await response → archive answered → signaler deletes.

## → Platform OC
- **ADR-003**: Agent state persistence in snapshots — pending (post-paper)
- **Epic IX Phase 1 (Finance Foundation)**: 6/6 tasks done ✅ (commit 6947c57)
  - ✅ Task 1: Drug costs
  - ✅ Task 2: Dispense charges
  - ✅ Task 3: 4-building architecture — full kelas hierarchy (VVIP/VIP/K1-3/ICU/HCU/NICU/PICU), 131 beds across 4 buildings
  - ✅ Task 4: Professional fees
  - ✅ Task 5: Charge generator split — `charge-generator.ts` created, all handlers use `generateCharge()`
  - ✅ Task 6: Remove caps
- **LOS fix**: ✅ Commit 4cfc564 — admission 3-7d (avg 5d), emergency 1-3d (avg 2d). Realistic Tier A behavior.
- **Phase 2 (Claims & Insurance)**: Design brief pushed. 6 tasks queued. Start with Task 1 (ICD→INA-CBG mapping).
- **SIGNAL.md maintenance**: Add new signals when handing off to other OCs

## → Coordinator
- **Submit SoftwareX** — 🔴 only remaining blocker. Fill author info and hit submit.
- **ADR-004**: Mortality Risk Engine — accepted 2026-07-01 ✅
- **Epic IX**: Design review session — needs scheduling

## → Research OC
- **Re-run E1**: LOS config changed (commit 4cfc564). Prior experiment data obsolete. Re-run needed for Paper 1 results.
- **E2 Sensitivity Analysis** ✅ Completed (partial). Key finding: HIGH-risk death roll probability (0.20-0.50) has NO detectable effect on system-level mortality. Signal swamped by noise at 5 seeds. Calibration effort should focus on scoring function weights, not tier probabilities.
- **Mortality distribution**: 19 ICD codes validated per Paper 1 requirements ✅
- **ADR-004**: Accepted with calibration priority column ✅
- **Track B Step 7**: 50K feasible at ~150ms/tick. Active encounters stabilized at 0-5.

## → Paper OC
- **Results section**: HOLD until Research OC re-runs E1 with new LOS. Previous data at 6-24h LOS is invalid.
- **SoftwareX**: All 8 reviewer fixes done. Author info needed from Coordinator → submit.

---

*Last updated: 2026-07-02 08:00 Coordinator (Phase 2 brief + experiment data flag)*
*Maintainer: Whoever modifies it last updates the timestamp.*
