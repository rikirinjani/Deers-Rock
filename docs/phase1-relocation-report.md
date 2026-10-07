# Phase 1: DR Asset Extraction — Relocation Report

**Date:** 2026-09-08  
**Status:** COMPLETE — No file moves required  
**Key Finding:** DR already has a self-contained workspace at `C:\Users\think\Project_v2\Deers-Rock\`

---

## Executive Summary

Deers Rock (DR) is **already a separate, self-contained project** with its own workspace, build system, test suite, and git history. The "extraction" is a verification exercise, not a file migration. The only coupling point is the KE adapter, which imports DR's compiled output via a relative path.

---

## Asset Ownership Classification

### DR-Owned (165+ files) — All in `C:\Users\think\Project_v2\Deers-Rock\`

| Category | Path | Files | Lines |
|----------|------|-------|-------|
| **Source Code** | `src/` (agent, api, cli, engine, experiment, identity, patient, referral) | ~50 | ~2322 |
| **Tests** | `tests/*.test.ts` | 17 | — |
| **Docs** | `docs/`, `adr/` | ~20 | — |
| **Experiments** | `experiment/`, `experiment-results/` | ~15 | — |
| **Config/Data** | `config/`, `data/`, `scripts/` | ~25 | — |
| **Build Output** | `dist/` | 195 | — |
| **Infrastructure** | `.github/`, `.railway/`, `public/`, `redteam/` | ~15 | — |
| **Package** | `package.json`, `tsconfig.json`, `vitest`, `bin/` | 5+ | — |
| **QMS/Audit** | `qms/records/`, `reopen-audit/`, `self-harness/` | ~10 | — |

### KE-Owned (DR-referencing) — All in `C:\Users\think\Project_v2\Kronos Engine\`

| Category | Path | Purpose |
|----------|------|---------|
| **Adapter** | `src/sectors/deers-rock-adapter.ts` (367 lines) | KE bridge to DR |
| **Adapter Test** | `src/sectors/deers-rock-adapter.test.ts` | Integration tests |
| **Experiment** | `src/experiment/experiments/dr-counterfactual.ts` | P-004 counterfactual |
| **Proposal** | `docs/proposals/P-002-deers-rock-adapter.md` | Design proposal |
| **Contract** | `src/sectors/contracts/deers-rock-sentinel.md` | Sentinel spec |

### Shared — Co-located in KE but DR-dependent

| File | Notes |
|------|-------|
| `src/data/indonesian-hospitals.ts` | Hospital config data used by both |
| `docs/EVIDENCE-FREEZE-2026-09-05.md` | Phase F freeze marker (KE-owned) |
| `docs/PHASE-F-DESIGN.md` | Phase F design doc (KE-owned) |

---

## Coupling Analysis

### Import Chain (KE → DR)

```
KE: src/sectors/deers-rock-adapter.ts
  → import { World } from "../../../Deers-Rock/dist/index.js"
  → import { HospitalState } from "../../../Deers-Rock/dist/engine/state-store.js"
  → import { createWorld, step, computeSupplyStress } from "../../../Deers-Rock/dist/index.js"
  → import { EventQueue } from "../../../Deers-Rock/dist/engine/event-queue.js"
  → import { createClock, cloneClockWithRng } from "../../../Deers-Rock/dist/engine/clock.js"
```

**Type:** Relative path to DR's `dist/` (compiled output)  
**Dependency:** DR must be built (`tsc`) before KE compiles  
**Severity:** Low — standard library dependency pattern  

### Build-Order Dependency

```
DR: tsc → dist/
KE: tsc → dist/ (includes adapter, which imports DR/dist/)
```

DR is a **build prerequisite** for KE. This is the correct pattern for a library dependency.

---

## Verification Results

### DR Workspace Self-Containment ✅

- ✅ `package.json` — name: `deers-rock`, version: `0.5.0`, Apache-2.0
- ✅ `tsconfig.json` — ES2022, NodeNext, strict
- ✅ `dist/` — 195 compiled files
- ✅ `node_modules/` — 89 packages
- ✅ `tests/` — 17 test files (vitest)
- ✅ Git repo — active commits (Phase D/E history)
- ✅ `bin/` — CLI entry point
- ✅ `scripts/` — verify-facts, diagnostics
- ✅ `docs/` — architecture, simulation, API reference
- ✅ `adr/` — 16 architectural decision records
- ✅ `experiment/` — 16 experiment files
- ✅ `experiment-results/` — seed-46 results, counterfactual
- ✅ `config/` — capacity, hospitals
- ✅ `data/` — discharge data (SQLite)
- ✅ `.github/` — CI/CD workflows
- ✅ `.railway/` — deployment config
- ✅ `qms/records/` — 20 quality records
- ✅ `reopen-audit/` — 7 audit files
- ✅ `self-harness/` — traces, failures, tools
- ✅ `public/` — static assets
- ✅ `redteam/` — 7 redteam files

### DR Functional Completeness ✅

- ✅ Engine core: `World`, `Sector`, `Hospital`, `Clock`, `EventQueue`
- ✅ Simulation: `simulations/deers-rock/index.ts` (main entry)
- ✅ CLI: `cli/index.ts` (server, config, seed management)
- ✅ Agent: `agent/index.ts` (LLM agent integration)
- ✅ API: `api/` (REST endpoints)
- ✅ Identity: `identity/` (patient identity)
- ✅ Patient: `patient/` (patient state)
- ✅ Referral: `referral/` (referral system)
- ✅ Experiment: `experiment/` (counterfactual, phase-f)
- ✅ Health surveillance: `engine/sentinel.ts`
- ✅ Supply stress: `engine/supply-stress.ts`

### KE Integration Integrity ✅

- ✅ Adapter imports DR's `dist/` (not source) — correct library pattern
- ✅ Adapter wraps DR as KE `Sector` — clean boundary
- ✅ No DR source duplication in KE — no `src/simulations/deers-rock/`
- ✅ KE's `dist/sectors/deers-rock-adapter.{js,d.ts}` — adapter compiles

---

## Actions Taken

### What Was Done

1. **Inventory** — Full enumeration of DR assets across both workspaces
2. **Classification** — DR-owned, KE-owned, shared, borderline categories
3. **Verification** — DR self-containment check (build, tests, config, docs)
4. **Integration check** — KE adapter imports, build output, test coverage
5. **Coupling analysis** — Import chain, build-order dependency, severity

### What Was NOT Done (By Design)

1. **No file moves** — DR already has its own workspace
2. **No KE modifications** — Adapter pattern is clean and correct
3. **No config changes** — DR's `package.json`, `tsconfig.json` already correct
4. **No test changes** — DR's 17 tests already self-contained
5. **No build changes** — DR's `tsc` already produces `dist/`

---

## Recommendations

### For DR Paper Independence

1. **DR can run standalone** — Its workspace is self-contained
2. **DR can be cited independently** — Own git repo, version, license
3. **DR experiments are self-contained** — `experiment/` + `experiment-results/`
4. **DR results are reproducible** — Deterministic simulation with seed management

### For KE-DR Boundary

1. **Keep adapter pattern** — Clean, maintainable, testable
2. **No shared code duplication** — DR's `dist/` is the shared interface
3. **Build-order dependency is acceptable** — Standard library pattern
4. **Consider npm packaging** — DR could be published as `@deers-rock/core`

---

## Conclusion

**DR is already extracted.** The workspace at `C:\Users\think\Project_v2\Deers-Rock\` is self-contained with its own build system, test suite, documentation, and git history. The KE adapter provides a clean integration boundary. No file migration is needed.

**Next phases:** Establish DR paper boundary (Phase 2), freeze record (Phase 3), draft paper (Phase 4), evidence matrix (Phase 5), separation audit (Phase 6).
