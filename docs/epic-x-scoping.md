# Epic X Scoping — International Billing & Commercial Productization

**Date:** 2026-11-02 · **Status:** Proposed — owner decisions 1–2 recorded 2026-11-02 (full US hospital simulation; CPT only on client demand); milestone list awaiting approval, no implementation started
**Inputs:** ADR-027, ROADMAP Epic X/IX, `src/engine/finance.ts`, `packages/{core,adapter-us,adapter-indonesia}`

## 1. What exists

- **ADR-027 (Accepted):** monorepo `packages/{core,adapter-indonesia,adapter-us,app}`; 4 interfaces (`IPayerSystem`, `ITariffSystem`, `IFormulary`, `IIdentityGenerator`); US = Medicare/Medicaid/Private/Self-pay/TRICARE, MS-DRG, MRN. Estimated ~10 days.
- **Packages exist as skeletons** (npm workspaces `packages/*` set up): `core/src/adapters/{interfaces,system}.ts` (139+145 lines, `AdapterRegistry`), `adapter-indonesia` (159 lines), `adapter-us` (231 lines: payer mix, small `MS_DRG_TABLE`, formulary, MRN).
- **The engine does not use them.** No file under `src/` or `tests/` imports `AdapterRegistry` or either adapter. `src/engine/finance.ts` (549 lines) hardcodes INA-CBG (`lookupCbgTariff`, `PAYER_MIX`, BPJS/JR rules, IDR). Epic IX (47 tests, `finance*.test.ts`) is the working Indonesian behaviour and the regression oracle.
- **Interface gap:** `IPayerSystem` lacks the claim lifecycle the engine has (`submitted→verifying→adjudicated→paid|denied|returned`, batch ≤8/15 ticks, causal denial taxonomy, JR incident link, chart-coded gate). ADR-027's contract (`submitClaim`/`adjudicate`) is a single-step shape.
- **Not relevant here:** `adapter-khanza` and `khanza-r5/` belong to Epic XI (frozen).
- Epic IX/frozen baselines (`vitals-v1`, `clinical-v1`) are determinism-sensitive: any refactor of finance must be byte-identical for the Indonesia adapter at the same seeds.

## 2. Proposed milestones

| # | Milestone | Size | Depends | Done when |
|---|---|---|---|---|
| 10.1 | **Contract hardening** (incl. `IProcedureCodeProvider`): extend interfaces to cover the full claim lifecycle, charge generation hooks, denial taxonomy, currency; ADR-027 Amendment 1 | S | — | interfaces cover everything `finance.ts` does; ADR amended |
| 10.2 | **Core on adapters (Indonesia parity)**: move INA-CBG/BPJS/JR/PAYER_MIX into `adapter-indonesia`, `finance.ts` calls `AdapterRegistry`; DI wiring | L | 10.1 | 531 tests green; frozen-baseline seeds byte-identical (no RNG draw change) |
| 10.3 | **US payer + claims**: Medicare/Medicaid/Private/TRICARE/Self-pay, deductible→copay→coinsurance, prior auth, clearinghouse step, US denial taxonomy | M | 10.2 | adapter tests + simulated 10-seed run with plausible payer mix |
| 10.4 | **US tariff**: MS-DRG weights × base rate, MCC/CC severity, ICD-10-CM mapping, chargemaster (hospital-specific prices); USD formulary | L | 10.2 | DRG coverage for the ICD set the sim generates; unmapped-code report |
| 10.5 | **US hospital content & calibration (XL, split a–c)**: (a) MRN, US locale/geography, US referral/ED model; (b) US epidemiology/case mix, ICD-10-CM disease set, clinical protocols, FDA formulary + USD prices; (c) Research-OC calibration targets (CMS/HCUP/MedPAC/CDC), US baseline freeze | XL | 10.3, 10.4 | each sub-part has its own tests and sourced calibration doc; US 10-seed baseline frozen |
| 10.6 | **Productization**: publish packages (`@deers-rock/*`), config-driven country selection in app/API/dashboard, docs, demo, licence/packaging | M | 10.5 | `npm pack` installs clean; one-command US and ID runs |

Order: 10.1 → 10.2 → (10.3 ∥ 10.4) → 10.5 → 10.6. Total ≈ 1XL + 2L + 2M + S; ADR's ~10 days is optimistic given 10.2 (its Phase 3) was assumed small.

## 2a. CPT as a pluggable layer (design)

- **Core interface** `IProcedureCodeProvider` (in `packages/core/src/adapters/`): `lookup(code)`, `mapProcedure(internalProcedureId) -> code[]`, `describe(code)`, `licenseNotice()`. Added in 10.1; `ITariffSystem` calls it, never CPT directly.
- **Default provider (public, in repo):** ICD-10-PCS + HCPCS Level II. Always available, no licence.
- **Optional provider `@deers-rock/codes-cpt`:** separate package, kept out of the public repo and not published to public npm. It reads the owner's own AMA-licensed data file (path via config); the repo ships no CPT codes or descriptors.
- **Plug in/out:** `AdapterRegistry` loads the CPT provider only if the package is installed and `codes.cpt.enabled` is set; otherwise it falls back to the default. Removing the package changes no core code; results differ only in the procedure code column.
- **Determinism:** providers must not draw RNG; code choice is a pure function of the procedure, so toggling CPT never moves a seed.
- **Test:** the suite runs with the default provider and a small fake provider to prove swapping works.

## 2b. Owner decisions recorded (2026-11-02)

1. **Scope = full US hospital simulation** (billing and clinical content), not a billing swap. 10.5 grows to XL; clinical content (b) is the largest new piece and should be sized in detail before it starts.
2. **CPT only when a client asks** — stays the optional plug-in (2a); no licence purchase now.

## 3. Risks

1. **10.2 is the critical risk:** refactoring a 549-line finance module under frozen-baseline determinism. Mitigation: characterization tests exist (`finance-characterization.test.ts`); require byte-identical outputs, no new RNG draws.
2. **Licensing:** CPT codes are AMA-licensed; MS-DRG weights/ICD-10-CM are public (CMS/CDC). Plan on public MS-DRG + HCPCS Level II only, no CPT descriptors, unless owner licenses CPT.
3. **Scientific validity:** US realism needs sourced calibration (CMS, HCUP, MedPAC); without it US output is plausible-looking but unvalidated. Paper OC must not claim US validity before 10.5.
4. **Clinical content is Indonesian:** disease burden, protocols and formulary (205 e-catalogue drugs) are Indonesian; US epidemiology (e.g. fewer infectious, more chronic) would need a separate scenario set. Billing-only internationalization may produce an unrealistic US case mix.
5. **Existing skeleton quality:** `adapter-us` constants (deductible 1676, mix 45/20/10/10/…) are unsourced and the mix differs from ADR table; treat as draft.
6. Scope creep into Epic XI (Khanza) — keep separate.

## 4. Open owner decisions

1. ~~Goal of "international"~~ — decided: full US hospital simulation.
2. ~~CPT licensing~~ — decided: on client demand only.
3. Target client/date and deliverable form: npm packages, hosted demo, or consulting-style report?
4. Calibration owner: assign Research OC to US targets in 10.5c?
5. **Approve** the milestone list and order so implementation can start at 10.1.
