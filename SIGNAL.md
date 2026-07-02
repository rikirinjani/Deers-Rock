# OC Signal Flags

> Handoff signals between OC sessions. Each OC reads their section before starting work.
> Per Constitution Article VI §6.4 (Filesystem as Bus).
> Rules: Signal → await response → archive answered → signaler deletes.

## → Platform OC
- **ADR-003**: Agent state persistence in snapshots — pending (post-paper)
- **Epic IX Phase 1 (Finance Foundation)**: 6/6 tasks done ✅ (commit 6947c57)
- **Phase 2 Task 1**: ✅ INA-CBG mapping (68 entries, PMK 28/2020 RS Tipe A).
- **Phase 2 Task 2**: ✅ Payer assignment on encounter (default BPJS; Jasa Raharja for accident ICD codes; foreigners self-pay). `assignPayer()` in finance.ts.
- **Phase 2 Task 3**: ✅ BPJS claim workflow (SEP generation, coded chart gating, adjudication with paid/returned/denied, auto-resubmit on returned)
- **Phase 2 Task 4**: ✅ Jasa Raharja claim workflow (30-day treatment cap, auto-approve, separate queue model)
- **Phase 2 Task 5**: ✅ Real cost vs BPJS tariff efficiency ratio (tracked per claim, reported in generateReport())
- **Phase 2 Task 6**: ✅ AI Coder agent (4 coders by specialty, accuracy-based coding, variable delay per chart)
- **LOS fix**: ✅ Commit 4cfc564 — admission 3-7d, emergency 1-3d

## → Coordinator
- **Submit SoftwareX** — 🔴 only remaining blocker. Fill author info and hit submit.
- **ADR-004**: Mortality Risk Engine — accepted 2026-07-01 ✅
- **Epic IX**: Design review session — needs scheduling

## → Research OC
- **Phase 2 complete** 🟢 Platform OC delivered all 6 tasks. Full stack: INA-CBG, payer assignment, BPJS/JR workflow, AI Coder, efficiency ratio.
- **Re-run E1 NOW**: 10×1000 with new LOS (3-7d admission, 1-3d emergency) + INA-CBG tariff + payer assignment + AI Coder. This is your go signal.
- **Paper 1 results section** depends on your fresh E1 data.
- **E2 Sensitivity Analysis** ✅ Completed (partial). Key finding: HIGH-risk death roll probability (0.20-0.50) has NO detectable effect on system-level mortality.

## → Paper OC
- **Results section**: Research OC now has go signal. Await E1 re-run data.
- **SoftwareX**: All 8 reviewer fixes done. Author info needed from Coordinator → submit.

---

*Last updated: 2026-07-02 08:00 Coordinator (Phase 2 brief + experiment data flag)*
*Maintainer: Whoever modifies it last updates the timestamp.*
