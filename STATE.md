# STATE.md — Deers-Rock loop state

## Last run: 2026-10-05 — ADR-010 clinical fidelity expansion

**Mode:** L2 (owner-approved: expand formulary to 73 drugs, ICD-10 generator to 146 codes, INA-CBG to 144 tariffs with full SEP scoring)

### ADR-010 Changes (commits `e5d4f76`, `2360f3f`)
- **Drug catalog**: New file `src/engine/drug-catalog.ts` with 73 drugs across 24 categories (antihypertensives, antidiabetics, antibiotics, antivirals, antipsychotics, antidepressants, corticosteroids, etc.)
- **ICD-10 generator**: Expanded from 52 to 146 codes covering all major chapters (A-R, excluding Z as fallback)
- **INA-CBG tariffs**: Expanded from 71 to 144 entries with full SEP (Severity of Illness Points) scoring: SEP 0→×1.0, SEP 1→×1.15, SEP 2→×1.35, SEP 3→×1.60, SEP 4→×1.90
- **Clinical protocols**: Added protocols for all 146 ICD codes in `clinical-knowledge.ts`
- **Pharmacy integration**: Updated `pharmacy-knowledge.ts` (allergens, contraindications, interactions for 73 drugs), `pharmacy.ts`, `ai-pharmacy.ts`, `central-supply.ts`
- **Auth polyfill**: Dashboard JS now injects `window.__DR_API_KEY` from server; all fetch calls authenticated
- **Bug fixes**: Fixed duplicate ICD codes (C61, E11, S06), fixed `finance.ts` severity extraction, fixed TypeScript errors in `clinical-knowledge.ts`

### Validation
- Test suite: **189 tests pass** (26 files), tsc clean
- Live box: running at tick 2941, 419 patients, 960 active encounters, 386 outcomes, RSS 119MB/512MB

### Open items
- Issue #4 (CPU scaling) still open — blocks 100k-tick calibration only
- Long-term: consider snapshot compression to reduce resume memory footprint

## Run: 2026-10-02 — P1-6 Option A (mutate-in-place charge append)

**Mode:** L2 (explicitly authorized by human tasking: "Implement GH issue #1 item P1-6, Option A only").
**Root cause:** settled by Oracle (67.7% self-time in `generateCharge` full-map copy per charge). Not re-investigated.

### Change
- `src/engine/charge-generator.ts`: added `appendCharge()` (mutate-in-place variant; `generateCharge` kept untouched/exported).
- Call sites switched to `appendCharge`: `finance.ts` (billingHandler ×2), `lab.ts`, `radiology.ts`, `surgery.ts`, `ai-pharmacy.ts` (lazy per-pass private copy so the previous state's map is never mutated).
- Total: 6 files, +43/−12. No RNG, counter-order, or charge-content changes.

### Determinism gate — PASS
Pre-fix build → probe → `det-baseline`; post-fix build → probe → `det-after` (probe + outputs outside repo, in `%TEMP%\opencode\`).
- `journal.jsonl` (110,000 rows): SHA-256 **identical** (`6657...DDAB`).
- `snapshots.jsonl`: SHA-256 **identical** (`0C6B...7DB`).
- `metrics.json` (excl. `outDir`/`elapsedMs`): **identical**, incl. `chargesSha256=80a43fd6...`, 23,210 charges, first/last charge IDs, totals.

### Performance (1,050 journal-on ticks, 50 patients, seed 42)
| run | p50 | p95 | max |
|---|---|---|---|
| before | 18.2ms | 576.8ms | 1689.0ms |
| after ×3 | 15.7–16.8ms | 69.2–88.4ms | 592–945ms (always tick 1000) |

p95 target (<100ms): met 3/3. Max target (<500ms): **not met** — residual max is the `%500` `journalExportAndPurge` SQLite tick (Option D, out of scope). Baseline slow-tick spread over ordinary ticks (e.g. 971ms @1040) eliminated; worst non-`%100`-tick after ≈272ms.

### Verification (targeted)
- `npm run lint` → exit 0.
- `npx vitest run tests/journal.test.ts tests/determinism.test.ts tests/snapshot.test.ts tests/temporal.test.ts tests/finance.test.ts` → **36/36 pass**, 5 files, exit 0.
- Full gate deferred to human (per tasking).

### Out of scope / untouched
Option B/C/D; `cleanup.ts` dead prune predicate; denylisted paths (`src/api/rest.ts`, `src/sandbox/**`, `tests/**`, `package.json`, `README.md`, `Dockerfile`, `.github/**`, `vitest.config.ts`). Pre-existing uncommitted work elsewhere in the tree preserved.

### Delivery (orchestrator, 2026-10-02)
- Full gate run by orchestrator: **19 files / 152 tests / exit 0** (multiple runs, incl. post-delivery).
- Pushed as `5884ba3..3e4ac0a` on `main`: test-infra hardening (P0-1/P0-2), medical-records flake fix + CI gate (P0-2/P0-3), FHIR mount + JSON errors + opt-in auth/CORS (P0-4/P1-5), `appendCharge` perf fix (P1-6, commit `06a0ee2`), Docker packaging (P1-7), this governance record.
- **CI Gate green on `3e4ac0a`** — first gated run exposed Phase-C-era exact-match fact counts (red since Phase E); fixed in `3e4ac0a` with floor semantics (`min`) in `scripts/verify-facts.ts` + `facts.yaml`.
- Post-delivery gate hardening: a **second CI flake** (finance claim tests, ~10%) root-caused and fixed deterministically — bounded adjudication passes with a deliberately hoisted clock (a fresh `createClock` per pass re-seeds from `Date.now()` within one millisecond and draws the identical roll; empirically 2/30 failures before hoisting, 0/50 after), plus an INA-CBG diagnosis pin (unmapped patient dx created claims as denied at submission).
- Resolution summaries posted on GH issue #1 (P0+P1 complete; honest gaps listed there).

### Deployment + incident (2026-10-02, post-delivery)
- Deployed live on Tencent 43.134.18.195 (co-hosted with cokro-api RAG): systemd `deers-rock.service`, user `deersrock`, `127.0.0.1:3000` (BIND_HOST), 512M cap, public via Cloudflare Tunnel + Access (`deers-rock.cokro-tech.my.id`).
- **INCIDENT:** journal grew 3 MB → 980 MB in ~8 h (tick ~12k); boot-time snapshot `JSON.parse` exceeds the 512M cap → V8 OOM crash loop (17 restarts). **Service STOPPED by owner decision until the real fix** (P1-8). RAG unaffected throughout (cap did its job).
- **New engine bug found via the incident:** `EventQueue` is not persisted — `resumeWorld` returns a fresh empty queue, so every restart loses all scheduled events (discharges at tick 4320+, lab/rad/surgery results). Post-restart sims never discharge anyone; encounters accumulate `active` forever (live evidence: 3422/3422 active at tick ~12k post-crash-loop). Frozen research unaffected (single-pass runs). Needs an ADR-level fix (persist queue or rebuild from journal) — folded into P1-8 review scope.
- Adapter conformance review (codex-interpretum `DeersRockClient`): works against live DR (auth, 4 endpoints, exact wire-shape match, GrouperInput mapping verified incl. ICD-9-CM procedures). Findings for that repo: `transferred` status missing from its encounter type/mapper; live E2E test lacks API-key support; note LOS is 3–7 sim-days so discharged cases only exist from tick ~4320.

### Open items
- Residual tick-1000 spike → candidate future item (Option D territory), not started.
- Out of the approved P0+P1 scope, tracked on the issue: P1-8 (ADR-003 persistence, pruning TTL), Railway redeploy, Docker image build (needs a Docker host), 100k-tick Kaggle calibration.
