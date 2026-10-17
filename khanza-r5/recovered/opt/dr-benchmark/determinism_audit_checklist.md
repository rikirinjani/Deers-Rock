# DR Engine Determinism + Pipeline-Defect Audit Checklist

Phase 1 prerequisites (brief §5 Phase 1). The executing agent runs these on the box; this is the spec, not the code. All code changes commit to `bench/unattended-2026-10-11`.

## 1. Unseeded RNG / wall-clock sweep (idempotency + determinism precondition)

Goal: same seed ⇒ byte-identical canonical event log. Hunt for every non-deterministic source in the DR generator + adapter.

Grep patterns to run across `/opt/Deers-Rock` (generator + adapter) and the consumer:
```
grep -rEn "Math\.random|new Random\(|ThreadLocalRandom|Random\.next|new Date\(|System\.currentTimeMillis|Instant\.now|LocalDateTime\.now|UUID\.randomUUID|System\.nanoTime" /opt/Deers-Rock/src /opt/Deers-Rock/adapter 2>/dev/null
```
- Every hit must either be (a) removed, (b) replaced with the seeded RNG stream, or (c) wrapped in the simulated-clock (the explicit simulated date from §7), and recorded in `DECISIONS.md`.
- Wall-clock use for *logging* is tolerable; wall-clock use for *event values* (arrival times, `tgl_perawatan`, `jam`) is a defect — it must come from the simulated tick clock.

## 2. Replay determinism test (the acceptance check)

```
# from a clean sik_bench snapshot + fixed seed S:
run DR engine → event_log_run1.txt ; capture per-table row counts + billing totals
restore clean snapshot (same S)
run DR engine → event_log_run2.txt ; capture again
diff event_log_run1.txt event_log_run2.txt            # must be empty
# per-table row counts + SUM(billing.totalbiaya) must be identical across the two runs
```
This is the brief's "run the whole stage twice from the same seed and clean snapshot; event log hash, per-table row counts and billing totals must be identical."

## 3. Event-log upgrade (admit/discharge-only → full)

The current event log records admit + discharge only. Upgrade it to also record, per visit, in deterministic order:
- orders (prescription lines, procedure orders)
- charges (per component: registration, procedure, drug — the inputs to the DR tariff ledger)
- ledger rows (the DR expected-charge rows, see Phase 2)

The canonical event log is the unit of replay determinism; anything the ledger consumes must be in it.

## 4. DOC-2 — canonical jml per (no_resep, kode_brng)

Root defect (verified 2026-10-10 from `respec_dokter`): 9 of 14 duplicate `(no_rawat, kode_brng)` pairs have **different `jml`** because the generator re-picked a random quantity on each re-export of the same prescription.

Fix spec (generator side):
- Emit **one canonical `jml`** per `(no_resep, kode_brng)`. Re-sends must be **byte-identical** (same `jml`, same `kode_brng`, same `no_resep`).
- After the fix, re-run the consumer and **verify the MAX rule is a no-op**: for every `(no_rawat, kode_brng)` pair, all exported OBAT lines carry the identical `jml` (the 14-pair table in protocol §0 flips from "9 re-rolled" to "0 re-rolled").
- The consumer's `MAX(jml)` dedup stays in place as a safety net but should now be a proven no-op.

## 5. Seed-leakage root-cause checklist (why 34 seed `no_rawat` got billed)

Findings to confirm + fix:
- 34 **SEED** `no_rawat` (numeric `no_rkm_medis`, not `DR%`) carry `billing` rows in the DR export path. 321 billed = 287 DR + 34 seed.
- Root-cause candidates to check: (a) the export query's `LIKE '2026/10/%'` matches seed visits and the adapter bills whatever the export yields; (b) a shared `no_rawat` collision between DR and seed numbering; (c) the consumer bills any `no_rawat` present in the export without a `no_rkm_medis LIKE 'DR%'` guard.
- Fix: gate the export + consumer on `no_rkm_medis LIKE 'DR%'`; the benchmark schema `sik_bench` must contain **zero** seed transactional rows.
- Proving check (must return 0 in `sik_bench`):
  ```sql
  SELECT (SELECT COUNT(*) FROM reg_periksa WHERE no_rkm_medis NOT LIKE 'DR%')
       + (SELECT COUNT(*) FROM billing   WHERE no_rawat IN (SELECT no_rawat FROM reg_periksa WHERE no_rkm_medis NOT LIKE 'DR%'))
       AS seed_rows_in_bench;
  ```

## 6. 67 unbilled procedure-only DR visits (export extension)

- 67 DR visits have `dpo=0 / proc=1` (a procedure, no prescription) → the prescription-event-driven export never emits an ENC block for them → the consumer never bills their registration + procedure charges (~19% of DR visit charges lost).
- Fix (brief Phase 1.3, option b): **extend the export to emit ENC blocks for procedure-only visits** so registration + procedure charges reach Khanza and the consumer bills them.
- Verify: billed DR visit count == DR visit count (no more unbilled procedure-only remainder).

## 7. DOC-1 — doctor mapping

- `reg_periksa` has only 4 distinct `kd_dokter` (D0000002–D0000005); DR has 20 doctors. DPJP collapse → doctor-fee + per-doctor reports understate.
- Fix: map the 20 DR doctors to distinct `kd_dokter` values (create `dokter` master rows as needed), so doctor-dependent reports are meaningful. Record the mapping in the DR→Khanza code-map file.

## 8. Clock — explicit simulated dates

- Write explicit simulated dates everywhere (no wall-clock leaking into `tgl_perawatan`, `jam`, `no_nota`, report periods).
- Simulated year = 2025-01-01→2025-12-31 (fully in the past, so date-based reports + period closing are valid). One tick = one simulated minute (525,600 ticks/year).
- Real-form runs: `faketime '<visit-date> 00:00:00'`, **one JVM per distinct visit date**; grep `general_log` for server-side `NOW()`/`CURDATE()` (faking the JVM clock does not change MySQL's clock) and record any as an environmental delta.
