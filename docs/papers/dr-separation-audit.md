# DR-vs-KE Separation Audit

**Date:** 2026-09-08
**Status:** COMPLETE
**Auditor:** Coordinator

---

## Audit Objective

Verify that DR (Deers Rock) and KE (Kronos Engine) are cleanly separated as independent scientific artifacts, with no claim leakage, no shared code duplication, and no implicit dependencies that would compromise paper independence.

---

## 1. Code Separation

### 1.1 DR Workspace (`C:\Users\think\Project_v2\Deers-Rock\`)

| Component | Status | Notes |
|-----------|--------|-------|
| `package.json` | ✅ Independent | name: `deers-rock`, v0.5.0, own dependencies |
| `tsconfig.json` | ✅ Independent | ES2022, NodeNext, own config |
| `src/` | ✅ Self-contained | 8 modules: agent, api, cli, engine, experiment, identity, patient, referral |
| `dist/` | ✅ Self-contained | 195 compiled files |
| `tests/` | ✅ Self-contained | 17 test files, 127 tests |
| `node_modules/` | ✅ Independent | 89 packages |
| Git repo | ✅ Independent | Own commit history (Phase D/E) |

**Verdict:** DR is a fully self-contained project. No KE code exists in DR's workspace.

### 1.2 KE Workspace (`C:\Users\think\Project_v2\Kronos Engine\`)

| Component | Status | Notes |
|-----------|--------|-------|
| `src/sectors/deers-rock-adapter.ts` | ⚠️ KE-owned bridge | 367 lines, wraps DR as KE Sector |
| `src/sectors/deers-rock-adapter.test.ts` | ⚠️ KE-owned test | Integration tests for adapter |
| `src/experiment/experiments/dr-counterfactual.ts` | ⚠️ KE-owned | P-004 counterfactual experiment |
| `docs/proposals/P-002-deers-rock-adapter.md` | ⚠️ KE-owned | Design proposal |
| `src/sectors/contracts/deers-rock-sentinel.md` | ⚠️ KE-owned | Sentinel contract spec |

**Verdict:** KE has 5 files that reference DR. All are KE-owned integration points, not DR code.

### 1.3 Coupling Analysis

| Coupling Type | Direction | Severity | Pattern |
|---------------|-----------|----------|---------|
| Import | KE → DR | LOW | Relative path to DR's `dist/` |
| Build-order | DR → KE | LOW | DR must build before KE |
| Data | KE ↔ DR | LOW | `indonesian-hospitals.ts` shared config |

**No reverse coupling:** DR does not import from KE. DR is independent.

---

## 2. Claim Separation

### 2.1 DR Paper Claims (Prelude Paper)

| Claim | Category | Evidence |
|-------|----------|----------|
| Deterministic reproducibility | PROVEN | Seed 42, 10 runs |
| Consistent outcome distributions | SUPPORTED | 10 seeds, LOS/deaths/occupancy |
| Modular composability | PROVEN | 35 handlers |
| Culturally-contextualized generation | PROVEN | Calendar engine code |
| AI agent experimentation | PROVEN | 3 agent types |
| FHIR R4 interoperability | SUPPORTED | 3 resource types |
| Disaster scenario engine | PROVEN | 7 types, 4 phases |

### 2.2 KE Paper Claims (JAMIA Manuscript)

| Claim | Category | Evidence |
|-------|----------|----------|
| Macro-to-micro coupling | PROVEN | Adapter architecture |
| Phase F intervention results | PROVEN | SupplyStress +0.219 (seed 46) |
| Cross-system counterfactuals | PROVEN | Branch comparison framework |
| Supply chain as intervention | OBSERVED | Structural diagnostic |
| Occupancy/mortality insensitivity | NULL | Zero deltas all seeds |

### 2.3 Claim Overlap Analysis

| Claim | DR Paper | KE Paper | Overlap? |
|-------|----------|----------|----------|
| Deterministic replay | ✅ DR-owned | ✅ KE-owned (different scope) | MINIMAL — same property, different context |
| Modular architecture | ✅ DR-owned | Not claimed | NONE |
| Cultural contextualization | ✅ DR-owned | Not claimed | NONE |
| FHIR interoperability | ✅ DR-owned | Not claimed | NONE |
| Supply stress mechanism | Not claimed | ✅ KE-owned | NONE |
| Phase F results | Not claimed | ✅ KE-owned | NONE |
| Cross-system coupling | Not claimed | ✅ KE-owned | NONE |

**Verdict:** No claim overlap. DR paper focuses on architecture and baseline. KE paper focuses on macro coupling and intervention results.

---

## 3. Evidence Separation

### 3.1 DR Evidence (Frozen)

| Evidence | Source | Status |
|----------|--------|--------|
| E1 baseline (10×1000 ticks) | `experiment-results/` | FROZEN |
| Architecture spec | `docs/papers/deers-rock-platform-paper.md` | FROZEN |
| Code inspection | `src/` (54 modules) | FROZEN |
| Test suite | `tests/` (17 files, 127 tests) | FROZEN |
| DR paper boundary | `docs/papers/dr-paper-boundary.md` | FROZEN |
| Evidence matrix | `docs/papers/dr-evidence-matrix.md` | FROZEN |

### 3.2 KE Evidence (Frozen)

| Evidence | Source | Status |
|----------|--------|--------|
| Phase F design | `docs/PHASE-F-DESIGN.md` | FROZEN |
| Phase F evidence freeze | `docs/EVIDENCE-FREEZE-2026-09-05.md` | FROZEN |
| Phase F draft | `docs/papers/drafts/phase-f-draft.md` | FROZEN |
| KE manuscript | `docs/papers/jamia-2026-kronos-engine.md` | FROZEN |
| Mac canonical results | `experiment-results/phase-f-seed46.json` | FROZEN |

### 3.3 Evidence Overlap

| Evidence | DR | KE | Overlap? |
|----------|----|----|----------|
| E1 baseline | ✅ | ❌ | NONE — DR-only |
| Phase F results | ❌ | ✅ | NONE — KE-only |
| Adapter architecture | ❌ | ✅ (adapter is KE-owned) | NONE |
| Supply stress mechanism | ❌ | ✅ | NONE |

**Verdict:** No evidence overlap. DR evidence is self-contained. KE evidence is self-contained.

---

## 4. Publication Separation

### 4.1 DR Paper Scope

- **Title:** "Deers Rock: A Deterministic Micro-Simulation of a Tier A Referral Hospital in Eastern Indonesia"
- **Type:** Prelude paper (short communication, 3,500 words)
- **Focus:** Architecture, clinical model, determinism, baseline results
- **NOT about:** KE coupling, Phase F intervention, macro-to-micro bridge

### 4.2 KE Paper Scope

- **Title:** "Kronos Engine: Macro-to-Micro Healthcare Simulation with Supply Chain Intervention"
- **Type:** Full research paper (JAMIA submission)
- **Focus:** Cross-system coupling, Phase F results, supply chain as intervention
- **NOT about:** DR architecture details, DR baseline results

### 4.3 Citation Strategy

| Paper | Cites DR | Cites KE |
|-------|----------|----------|
| DR prelude | Own work (self-citation) | "Companion paper" (1 citation) |
| KE manuscript | "Deers Rock is the reference implementation" (1 citation) | Own work |

**Verdict:** Minimal cross-citation. Each paper is independently publishable.

---

## 5. Dependency Audit

### 5.1 Build Dependencies

| Dependency | Direction | Critical? | Mitigation |
|------------|-----------|-----------|------------|
| DR dist → KE adapter | KE depends on DR build | YES | Standard library pattern; DR builds first |
| DR independence | DR does NOT depend on KE | NO | DR is fully independent |

### 5.2 Runtime Dependencies

| Dependency | Direction | Critical? | Mitigation |
|------------|-----------|-----------|------------|
| DR runs standalone | DR has own CLI, API, tests | NO | DR is fully independent |
| KE imports DR dist | KE uses DR as library | YES | Standard library pattern |

### 5.3 Data Dependencies

| Dependency | Direction | Critical? | Mitigation |
|------------|-----------|-----------|------------|
| `indonesian-hospitals.ts` | Shared config | LOW | Could be duplicated if needed |
| DR experiment data | DR-owned | NO | DR has own `experiment-results/` |

**Verdict:** DR is fully independent. KE depends on DR as a library (standard pattern).

---

## 6. Separation Verdict

### ✅ PASSED — DR and KE are cleanly separated

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Code separation | ✅ PASSED | DR has own workspace, package, tests, git |
| Claim separation | ✅ PASSED | No claim overlap between papers |
| Evidence separation | ✅ PASSED | No evidence overlap |
| Publication separation | ✅ PASSED | Different scope, minimal citation |
| Dependency direction | ✅ PASSED | DR independent; KE depends on DR (standard) |

### Remaining Coupling Points (Acceptable)

1. **KE adapter imports DR dist** — Standard library pattern, not a separation violation
2. **Shared hospital config** — Could be duplicated if needed; low impact
3. **Minimal cross-citation** — Expected for companion papers

### Recommendations

1. **No action required** — Current separation is clean
2. **Consider npm packaging** — DR could be published as `@deers-rock/core` to formalize the library boundary
3. **Keep adapter in KE** — The adapter is KE's integration layer, not DR's responsibility

---

## 7. Freeze Record

- **Frozen:** 2026-09-08T04:55:00Z
- **By:** Coordinator
- **Reason:** Separation audit complete, DR and KE verified as independent artifacts
- **Immutable until:** Paper submission or explicit scope change
