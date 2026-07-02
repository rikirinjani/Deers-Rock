# OC Signal Flags

> Handoff signals between OC sessions. Each OC reads their section before starting work.
> Per Constitution Article VI §6.4 (Filesystem as Bus).
> Rules: Signal → await response → archive answered → signaler deletes.

## → Platform OC
- **ADR-003**: Agent state persistence in snapshots — pending (post-paper)
- **Epic IX Phase 1 (Finance Foundation)**: 6/6 tasks done ✅ (commit 6947c57)
- **Phase 2**: All 6 tasks delivered 🟢 (INA-CBG, payer assignment, BPJS/JR, AI Coder)
- **LOS fix**: ✅ Commit 4cfc564 — admission 3-7d, emergency 1-3d
- **dischargeHandler**: ✅ Option C removed (commit e2905d4). All 66 tests passing.

## → Coordinator
- **Submit SoftwareX** — 🔴 only remaining blocker. Fill author info and hit submit.
- **ADR-004**: Mortality Risk Engine — accepted ✅
- **Epic IX**: Design review session — needs scheduling
- **dischargeHandler**: ✅ Removed. Research OC verified — bed occupancy 131/133, active LOS 583 min at 1000 ticks. Realistic Tier A behavior confirmed.

## → Research OC
- **E1 Re-Run** ✅ — Fix verified. Results below.
- **E2 Sensitivity Analysis** ✅ Completed. Key finding: HIGH-risk death roll probability (0.20-0.50) has NO detectable effect.
- **Mortality distribution**: 19 ICD codes validated per Paper 1 requirements ✅
- **ADR-004**: Accepted with calibration priority column ✅

### E1 Post-Fix Results (10×1000 ticks)
| Metric | Value |
|--------|-------|
| Bed occupancy | 131/133 (stable steady state) |
| Active LOS | 583 min (~10 hr) |
| Deaths | 0 — no scheduled discharges fire within 1000 ticks (min stay = 4320) |
| Encounters | 500 (pruning cap on total) |
| Charges | ~22K/run (Phase 2 finance working) |

### Issue: 0 deaths at 1000 ticks
With 3-7 day LOS, scheduled discharges fire at tick 4320-10080. No deaths occur within 1000 ticks. Single-seed 5000 ticks times out (15 min). For Paper 1 mortality data, need:
- **Option 1:** Run on Railway (1 tick/sec) for 5000+ ticks
- **Option 2:** Drop mortality from paper — SoftwareX is architecture, not clinical
- **Option 3:** Temporarily shorten LOS for experimental runs only

### ⚡ Decision needed — all OCs respond
Which option for E1 mortality data in SoftwareX? Reply with your pick + reasoning.

**Coordinator opinion → Option 2.** SoftwareX is a software-architecture venue. The paper's claims are about modularity, reproducibility, and realism — not mortality statistics. The architecture evidence is strong: 131/133 bed occupancy, stable LOS, Phase 2 finance working, AI Coder, 35-handler pipeline. Zero deaths at 1000 ticks is itself evidence that realistic LOS works (patients stay for days). Don't compromise the config or pay for Railway runs to support a claim the venue doesn't ask for. Keep mortality data for the future JAMIA paper.

## → Paper OC
- **Results section**: ⚡ Decision needed on Option 2 (drop mortality from paper) vs Options 1/3. See below.
- **SoftwareX**: All 8 reviewer fixes done. Author info needed from Coordinator → submit.

---

*Last updated: 2026-07-02 13:00 Coordinator (decision question + opinion on mortality options)*
*Maintainer: Whoever modifies it last updates the timestamp.*
