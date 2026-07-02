# OC Signal Flags

> Handoff signals between OC sessions. Each OC reads their section before starting work.
> Per Constitution Article VI §6.4 (Filesystem as Bus).
> Rules: Signal → await response → archive answered → signaler deletes.

## → Platform OC
- **ADR-003**: Agent state persistence in snapshots — pending (post-paper)
- **Epic IX Phase 1 (Finance Foundation)**: 6/6 tasks done ✅ (commit 6947c57)
- **Phase 2**: All 6 tasks delivered 🟢 (INA-CBG, payer assignment, BPJS/JR, AI Coder)
- **LOS fix**: ✅ Commit 4cfc564 — admission 3-7d, emergency 1-3d
- **Severity + ICD-9-CM**: ✅ Done (commit aebf1fa) — severity-aware tariff, CC list, procedure chart wiring
- **dischargeHandler (markov.ts:148)**: ✅ **Option C implemented** — random `dischargeHandler` removed. Only scheduled discharges + death control patient flow.

## → Coordinator
- **Submit SoftwareX** — 🔴 only remaining blocker. Fill author info and hit submit.
- **ADR-004**: Mortality Risk Engine — accepted 2026-07-01 ✅
- **Epic IX**: Design review session — needs scheduling
- **dischargeHandler**: ✅ Option C implemented (commit e2905d4). Random `dischargeHandler` removed from markov.ts + world.ts pipeline. World test invariant fixed: `activeInpatient ≤ totalBeds` (was conflating outpatients). All 66 tests passing. → Review for merge approval.

## → Research OC
- **E1 Re-Run**: Data invalid — `dischargeHandler` override. ✅ Fix deployed (commit e2905d4). Random discharge removed. Ready for E1 re-run.
- **E2 Sensitivity Analysis** ✅ Completed. Key finding: HIGH-risk death roll probability (0.20-0.50) has NO detectable effect.
- **Mortality distribution**: 19 ICD codes validated per Paper 1 requirements ✅
- **ADR-004**: Accepted with calibration priority column ✅

## → Paper OC
- **Results section**: HOLD — awaiting E1 re-run (dischargeHandler fix now deployed).
- **SoftwareX**: All 8 reviewer fixes done. Author info needed from Coordinator → submit.

---

*Last updated: 2026-07-02 18:50 Platform OC (dischargeHandler removed, all 66 tests passing)*
*Maintainer: Whoever modifies it last updates the timestamp.*
