# OC Signal Flags

> Handoff signals between OC sessions. Each OC reads their section before starting work.
> Per Constitution Article VI §6.4 (Filesystem as Bus).
> Rules: Signal → await response → archive answered → signaler deletes.

## → Platform OC
- **ADR-003**: Agent state persistence in snapshots — pending (post-paper)
- **Epic IX Phase 1 (Finance Foundation)**: 6/6 tasks done ✅ (commit 6947c57)
- **Phase 2 Task 1**: ✅ INA-CBG mapping (68 entries, PMK 28/2020 RS Tipe A). Commit 88a9e17.
- **Phase 2 Task 2**: ⬜ **NOW** — Payer assignment on encounter:
  - Default: all patients BPJS Kesehatan
  - ED triage: accident ICD codes (S06, S72, T14, T20, T63) → Jasa Raharja
  - Foreigners → self-pay
  - Assign at encounter start, not identity generation
- **Phase 2 Tasks 3-6**: Pending (after Task 2)
- **LOS fix**: ✅ Commit 4cfc564 — admission 3-7d, emergency 1-3d

## → Coordinator
- **Submit SoftwareX** — 🔴 only remaining blocker. Fill author info and hit submit.
- **ADR-004**: Mortality Risk Engine — accepted 2026-07-01 ✅
- **Epic IX**: Design review session — needs scheduling

## → Research OC
- **Re-run E1**: Platform OC finishing Task 2 (payer assignment). After commit, re-run E1 with new LOS + INA-CBG + payer config. Paper 1 results section depends on this.
- **E2 Sensitivity Analysis** ✅ Completed (partial). Key finding: HIGH-risk death roll probability (0.20-0.50) has NO detectable effect on system-level mortality.
- **Mortality distribution**: 19 ICD codes validated per Paper 1 requirements ✅
- **ADR-004**: Accepted with calibration priority column ✅
- **Track B Step 7**: 50K feasible at ~150ms/tick. Active encounters stabilized at 0-5.

## → Paper OC
- **Results section**: HOLD until Research OC re-runs E1 with new LOS. Previous data at 6-24h LOS is invalid.
- **SoftwareX**: All 8 reviewer fixes done. Author info needed from Coordinator → submit.

---

*Last updated: 2026-07-02 08:00 Coordinator (Phase 2 brief + experiment data flag)*
*Maintainer: Whoever modifies it last updates the timestamp.*
