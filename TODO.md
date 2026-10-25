# Deer's Rock HOE — Open Items

> Full roadmap with epics: see [ROADMAP.md](./ROADMAP.md)
> ADRs: see [adr/](./adr/)
> Khanza E2E state: see [khanza-r5/docs/khanza_session_handoff_20261025.md](./khanza-r5/docs/khanza_session_handoff_20261025.md)

**Last updated:** 2026-10-25 (replaces the 28 Jun 2026 sprint list; all its items were closed in Epic I)

## Blocked / waiting on the owner

- [ ] **Third home** for the Khanza box — owner: waits. mac-mini-vultr ends ~2026-11-20; then do the clean-box rebuild rehearsal (Epic XI M11.5)
- [ ] **Export archives to durable off-box storage** — before ~2026-11-20 (`khanza-r5/docs/khanza_r5_reproduce.md` §2)
- [ ] **Astra v11** — waits for Kaggle quota (~$1.07 left, one run ≈ $2.85), or another provider offering `gpt-6-astra` (OpenAI API: not checked)
- [ ] MemPalace outbox delivery — skipped for now (`self-harness/outbox/mempalace-queue-20261020T0133Z.md`)

## Standing reminders (do not drop)

- [ ] **Query-provenance disclosure** must go into any future publication (R5 §12 item 7)
- Repo is public: no secrets, VPS addresses or Khanza AES key/IV in tracked files; no push without the owner

## Decided, kept as documented (2026-10-25)

- Ledger backup `sik_bench.dr_charge_ledger_bak_20261017` — kept (revisit at the third-home move)
- Stale payment row `2026/10/23/000408` — kept as is (R5 §24.5)
- P13 driver's doubled rate line — left as a documented cosmetic defect
- Full Khanza cohort (86k visits) — skipped
- Local `kaggle/deers-rock-assessment/` files — gitignored, left on disk

## HOE platform open gaps (from ROADMAP)

- [ ] Drug allergy calibration gap: simulation 60–70 % vs real 3–5 % (M2.2 / M2.5)
- [ ] Formal validation against real hospital data — deferred (RISNA access)
- [ ] Epic IX wave 2 (JR provenance, ambulance) — code written, unbenchmarked
- [ ] Epic V/VI/VII deferred UX, sick-leave and code-quality items
- [ ] Epic X International Billing — deferred until Epics I–IX are green
