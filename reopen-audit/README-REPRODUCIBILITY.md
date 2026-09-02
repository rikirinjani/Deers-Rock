# Deers Rock — Reopening Audit: Reproducibility & Publication Package

**Release target:** v0.6.0-audit (or as agreed) · **DR commit:** 85b3119 (main) · **Kronos:** master
**Date:** 2026-08-31 · **Status:** PACKAGE COMPLETE — archival pending human authorization.

This package accompanies the formal reopening audit. It makes the *audit* reproducible, not
merely the simulation. **Do not publish the previous counterfactual numbers — they are
unreproducible artifacts (see 05-statistical-reassessment.md).**

---

## 1. Contents

| Item | Path | Note |
|---|---|---|
| Executive summary | `reopen-audit/01-executive-summary.md` | Verdict + key findings |
| Implementation-vs-Docs matrix | `reopen-audit/02-implementation-vs-docs-matrix.md` | 30 claims, evidence, verdict |
| Boundary compliance matrix | `reopen-audit/03-boundary-compliance-matrix.md` | B1-B10 |
| Sentinel output audit | `reopen-audit/04-sentinel-output-audit.md` | Field-by-field |
| Statistical reassessment | `reopen-audit/05-statistical-reassessment.md` | P-004 refutation + corrected stats |
| Scientific claim audit | `reopen-audit/06-scientific-claim-audit.md` | C1-C14 |
| Clinical plausibility audit | `reopen-audit/07-clinical-plausibility-audit.md` | Synthetic vs validated |
| Experiment reports | `reopen-audit/08-experiment-reports.md` | Failure injection, sentinel independence, temporal |
| Manuscript (draft v1) | `reopen-audit/paper/deers-rock-reopening-paper.md` | New paper, honest negative result |
| Paper notes | `reopen-audit/paper/PAPER-NOTES.md` | Claim→evidence map, excluded claims |
| Citation metadata | `CITATION.cff` | Provisional — no author/ORCID invented |
| Zenodo metadata | `.zenodo.json` | Pending human authorization to publish |
| License | `LICENSE` | Apache-2.0 (existing) |

## 2. Environment

- Node.js v22 (verified on v22.23.2), npm 10
- DR deps: `better-sqlite3@^12.11.1`, dev: `typescript@^5.8.3`, `vitest@^3.1.2`, `tsx@^4.19.4`
- `npm run build` (tsc) → `dist/`. **Important:** `dist/` is NOT committed; always build from source.
- Kronos Engine: sibling repo (master), `node_modules` present, `tsx` available.

## 3. Exact seeds & commands

### 3.1 DR standalone determinism probe (the core claim)
```bash
cd Deers-Rock
npm run build
npx tsx <probe> createWorld(50, undefined, seed); runWorld(world, 200); sha256(full state)
# Run TWICE in separate processes for seeds 42, 0, 7 → byte-identical hashes:
#   42: 665e2fd2df5a967de32a59ed2c1d344e1db0472bc32f5f1338d8b4a462c6e2d2
#   0:  cce3830f2a7b91b3a73c75fb73bc3bce7ef7c42108ea5d37623b12b25e93b6cc
#   7:  6dcad7e8771a0a3f568ad40e7bfc3deba62a98027510dec3991d59bb954b18de
```

### 3.2 DR experiment runner (headless)
```bash
npx tsx src/experiment/runner.ts <seedCount> <ticks>   # e.g. 10 500
```

### 3.3 Sentinel independence (3 sentinels, worldSeed 42)
Probe scripts preserved in `C:\Users\think\AppData\Local\Temp\opencode\dr-audit\sentinel-indep\`
(jkt-001 / sby-001 / dps-001; derived seeds; 150 ticks; perturbation of A). Results:
A≠B≠C; B byte-identical cross-process (`0c6109b0…`); perturbation leaves B/C unchanged.

### 3.4 P-004 counterfactual (Kronos) — NEGATIVE RESULT, do not cite old numbers
```bash
cd "Kronos Engine"
npx tsx src/experiment/experiments/run-dr-counterfactual.ts   # 30 seeds 42-71, 20 ticks
```
Regeneration expectation (audit-verified): committed 156/14 ≠ fresh 515/42 ≠ stale 532/31+530/41.
The committed artifact does NOT regenerate. Do not report "14/156 significant".

## 4. Known reproducibility boundaries (must be stated in any artifact)

1. **Same-process, multi-world runs:** ID labels shift (module-global counters); RNG dynamics
   identical. Use fresh processes per world for byte-level reproduction.
2. **Stale dist:** earlier experiment outputs were produced against a pre-Math.random-fix build;
   that build is run-to-run NON-reproducible. Always build from pinned source.
3. **Wall-clock residue:** FHIR exports, SIRS generatedAt, experiment filenames, journal
   created_at, and age computation (getFullYear) embed real time — simulation state is
   deterministic, serialized artifacts are not byte-stable.
4. **Cross-platform:** determinism verified on win32/node v22.23.2 only.

## 5. Publication checklist (boundary: stop before human authorization)

- [x] Manuscript drafted (draft v1, honest negative result)
- [x] Audit evidence package complete (matrices, stats, reports)
- [x] CITATION.cff + .zenodo.json written (no invented DOIs/ORCIDs/authors)
- [ ] GitHub release: tag `v0.6.0-audit` (or agreed version) — **requires human approval**
- [ ] Zenodo publish (DOI registration) — **requires human account authorization**
- [ ] Confirm authors/affiliations with human before finalizing metadata
- [ ] License check (Apache-2.0 exists)

## 6. What must change before the coupling claim is publishable

1. DR handlers for `admission_surge`/`staff_shortage` (real packet consumption).
2. `ticksPerDay: 1440` (or validated cadence) to honor scale separation.
3. Deep-clone rewind baseline; record parent/child horizons in artifacts.
4. Proper paired/two-group effect sizes + FDR/Bonferroni + noise-floor reporting.
5. Real `primaryDiagnosis` on encounters; non-constant `supplyStress`.
6. Reset module counters per `createWorld`.
7. `health.*` consumers, or honest one-directional statement.
