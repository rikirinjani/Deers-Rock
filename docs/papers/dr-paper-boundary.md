# DR Prelude Paper — Boundary and Scope

**Date:** 2026-09-08
**Status:** FROZEN
**Supersedes:** None (new paper)

---

## Paper Identity

- **Title:** "Deers Rock: A Deterministic Micro-Simulation of a Tier A Referral Hospital in Eastern Indonesia"
- **Type:** Prelude paper — establishes DR as an independent scientific artifact
- **Target:** Short communication or software paper (3,000–4,000 words)
- **NOT:** The full platform paper (already exists as `deers-rock-submission.md`)

---

## Scope Boundary

### IN SCOPE (DR-only claims)

1. **Architecture** — Deterministic tick engine, event journal, handler chain
2. **Clinical model** — 9 departments, 50 ICD-10 diagnoses, 22-drug formulary, 30+ agent roles
3. **Cultural contextualization** — Indonesian calendar events (Lebaran, Ramadan, harvest season)
4. **Determinism** — Seed management, replay, snapshot/rewind
5. **Disaster engine** — 7 scenario types, 4-phase lifecycle
6. **Self-contained results** — E1 baseline data (10×1000 ticks), LOS/mortality/occupancy distributions
7. **Open source** — Apache-2.0, reproducible builds, test suite (17 tests)

### OUT OF SCOPE (KE-only claims)

1. **KE adapter** — `deers-rock-adapter.ts` is KE's integration layer, not DR's
2. **Phase F intervention** — SupplyStress experiments are KE research, not DR's
3. **Macro-to-micro coupling** — How KE drives DR is a KE paper topic
4. **Cross-system counterfactuals** — Branch comparisons are KE's domain
5. **Macro sector models** — Geopolitics, Climate, Economy, Technology are KE's

### BORDERLINE (cite but don't own)

1. **FHIR R4 adapter** — DR produces FHIR-compatible output; adapter lives in DR
2. **Agent learning loop** — Platform-native, belongs to DR's architecture

---

## Existing DR Evidence (Frozen)

### E1 Baseline (Clean, 10×1000 ticks)

| Metric | Value | Source |
|--------|-------|--------|
| Avg LOS | 82.9 ticks (SD 10.4) | `experiment-results/` |
| Max LOS | 916–992 ticks | `experiment-results/` |
| Avg deaths/run | 4.3 (SD 1.9) | `experiment-results/` |
| Peak bed occupancy | 130.9/133 (98%) | `experiment-results/` |
| Handlers/tick | 35 | Architecture spec |
| Departments | 9 | Source code |
| Diagnoses | 50 ICD-10 | Source code |
| Formulary | 22 drugs | Source code |
| Disaster types | 7 | Source code |

### Experiment Results (DR-owned)

- `experiment-results/` — 50+ experiment runs (earthquake, pandemic, tsunami, counterfactual)
- All DR-native experiments, no KE dependency

---

## Paper Structure

1. **Abstract** — 250 words, DR as independent artifact
2. **Introduction** — Gap in healthcare simulation, DR's contribution
3. **Architecture** — Tick engine, event journal, handler chain (from existing docs)
4. **Clinical Model** — Departments, diagnoses, formulary, agents
5. **Determinism and Replay** — Seed management, snapshot/rewind, reproducibility
6. **Demonstration** — E1 baseline results (self-contained, no KE)
7. **Availability** — Open source, build/test instructions
8. **Discussion** — Limitations, future work (KE coupling mentioned as future direction)

---

## Key Figures (DR-only)

1. **Architecture diagram** — `fig1-architecture.svg` (already exists)
2. **LOS histogram** — `fig2-los-histogram.png` (already exists)
3. **Bed occupancy** — `fig3-bed-occupancy.png` (already exists)
4. **Handler chain** — New figure showing 35-handler pipeline
5. **Timeline** — New figure showing deterministic replay

---

## Citation Strategy

- **Cite existing DR papers** as prior work from same group
- **Cite KE paper** as "companion paper" for macro coupling
- **Do NOT claim** KE's Phase F results as DR's
- **Do NOT claim** macro-to-micro coupling as DR's contribution

---

## Freeze Record

- **Frozen:** 2026-09-08T04:30:00Z
- **By:** Coordinator
- **Reason:** DR paper boundary established, scope locked
- **Immutable until:** Paper submission or explicit scope change
