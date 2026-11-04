# Epic X, M10.6: Productization — plan

**Status:** plan, not started. **Decision (owner, 2026-11-04):** npm workspaces plus TypeScript project references (option A); the single-package subpath-export option is rejected. **Depends on:** 10.5c (package move starts after calibration, so the `us-*` files are not edited in two places at once).

## Steps

| # | Output | Size |
|---|---|---|
| 1 | ADR-027 amendment: workspaces + project references, package boundaries, versioning, "uncalibrated" labelling | S |
| 2 | Contracts into `packages/core`: `src/locale/contracts.ts`, `registry.ts`, `src/engine/billing/contracts.ts`, `registry.ts`; delete the drift test | M |
| 3 | Adapters into packages: Indonesian pack to `adapter-indonesia` (also closes the 10.2 leftovers: `ina-cbg.ts`, `price-tables.ts`, 205-drug catalogue behind a price/catalogue seam), US pack to `adapter-us` | M |
| 4 | `configureCountry("US" \| "ID")` in core: locale + billing adapter selected together; app/API config field | S |
| 5 | Package metadata, exports, semver, README per package; CI build from a clean clone; private registry first | S |
| 6 | Demo script (US and Indonesian world side by side) and client guide | S |

Gate after every move: E1 hashes (`084024be…`, `068b07b2…`), three finance-golden hashes, full vitest suite, all byte-identical for the Indonesian default.

## End-to-end test plan

The Khanza path proves the Indonesian pipeline against a real external system (synthetic data loaded into Khanza, then audited). The same idea for the packages, in three layers:

1. **Packaging E2E (no external system, automated in CI).** Clean clone, `npm pack` each package, install the tarballs into an empty consumer project (not the monorepo), `configureCountry("US")`, run a 14-day world, and assert: it runs, the output hashes equal the monorepo run for the same seed (proves the packaging changed nothing), and no Indonesian residue appears in a US run (IDR amounts, Indonesian labels, BPJS/JR payers). Repeat for `"ID"` against the frozen Indonesian baselines.
2. **Interface E2E (US analogue of the Khanza load).** Export the US world through the adapter's claim and encounter output (claim lines, DRG, payer, charges) to a standard format and validate it with an independent public validator. Which format depends on the target client; I would not pick it before that is known (open decision 3).
3. **Real-system E2E (only with a client).** If a client has a US system or test environment, load the synthetic output and audit it the way `khanza-r5` is audited. Nothing here can be run without a named client.

Preconditions found in step A: the payer-mix bug and the Indonesian residue in a US world (ambulance in IDR) must be fixed first, or layer 1's "no residue" check fails by design.

## Risks

- An import-path change can shift a hash: the byte-identical gate runs after every move.
- A public publish of placeholder numbers would mislead: private registry only until `us-v1` is frozen; US package labelled "uncalibrated".
- CPT is not included unless a client asks for it.
