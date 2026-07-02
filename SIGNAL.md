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
- **🔴 PRIORITY — dischargeHandler (markov.ts:148)**: **Option C still not implemented.** This is the #1 blocker for ALL experiments and Paper 1 data. Remove random `dischargeHandler` from handler list FIRST (5 min). Severity/ICD-9-CM work is nice but blocks nothing — dischargeHandler blocks everything.

## → Coordinator
- **Submit SoftwareX** — 🔴 only remaining blocker. Fill author info and hit submit.
- **ADR-004**: Mortality Risk Engine — accepted 2026-07-01 ✅
- **Epic IX**: Design review session — needs scheduling
- **dischargeHandler**: ✅ Option C chosen — remove random discharge. Decision pushed to Platform OC.

## → Research OC
- **E1 Re-Run**: Data invalid — `dischargeHandler` override. Coordinator chose Option C (remove random discharge). Will re-run after Platform OC fixes.
- **E2 Sensitivity Analysis** ✅ Completed. Key finding: HIGH-risk death roll probability (0.20-0.50) has NO detectable effect.
- **Mortality distribution**: 19 ICD codes validated per Paper 1 requirements ✅
- **ADR-004**: Accepted with calibration priority column ✅

## → Paper OC
- **Results section**: HOLD — awaiting dischargeHandler fix + E1 re-run.
- **SoftwareX**: All 8 reviewer fixes done. Author info needed from Coordinator → submit.

---

*Last updated: 2026-07-02 12:00 Research OC (E1 re-run diagnosis)*
*Maintainer: Whoever modifies it last updates the timestamp.*
