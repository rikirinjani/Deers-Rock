# ADR-016: Referral System & Ambulance Architecture (Epic IX M9.3)

**Status:** Accepted
**Date:** 2026-10-06
**Origin:** Oracle design review (ora-1, 2026-10-06)
**Scope:** M9.3 wave 1 (foundations + seed break) + wave 2 (flows + ambulance). Wave 3 deferred.

---

## Context

Deers-Rock's referral system is incoming-only, generates phantom patients (REF-PAT-*), has no geographic routing, no outgoing referrals, and zero test coverage. The ambulance `arrivalMode` field is cosmetic (static die roll). Jasa Raharja claims are triggered by ICD codes but have no explicit road-accident provenance linkage. The queue consumption bug (mark-first-then-wipe) is masked today but will break once batching exists.

Consumer requirement: M9.3 roadmap items — geographic hierarchy (Puskesmas→RS D→RS C→RS B→RS A), ESI-based ED routing, road-accident + JR integration, ambulance dispatch/costing, capacity-aware referral acceptance.

ADR-015 precedent: one declared seed break with baseline re-freeze (`referral-v1`).

---

## Decision

### D1 — Geographic hierarchy (derived pure functions)
Add `facilityTier(type)` — Puskesmas/Klinik→1, RS D→2, RS C→3, RS B→4, RS A→5 — and `catchmentBand(facility)` comparing provinceCode/regencyCode against Deers-Rock's (73/71) → city/province/eastern-indonesia/national. Add `distanceKm` scalar per facility (hand-set, no rng). Tier-filter + distance-sort replaces adjacency list. Add RS C to sender filter (system.ts:51 currently excludes it).

### D2 — Real-patient linkage (incoming)
Kill REF-PAT-*; materialize a real Patient at letter→arrival conversion in outpatient.ts using the existing patient-generator path. Payer derived from Patient record (ADR-015 D5 already draws at encounter creation). Delete the `pat ?? { diagnoses: [], identity: undefined }` fallback roll. `letter.patientId` becomes nullable-until-conversion; journal replay-safe.

### D3 — Capacity: acceptance-side slot budget
`REFERRAL_DAILY_SLOT_BUDGET` consumed at letter→arrival conversion. Letters beyond budget stay queued FIFO, age out to `returned` after K sim-days (activating the dead status). Replace system.ts:36-43 (mark-first-then-wipe) with a real FIFO drain via the currently-dead `processReferralLetter` (system.ts:87-103). Cap queue length (drop-oldest → returned). Sender capacity fields left as dead weight (no simulation of facility internals).

### D4 — ESI-lite triage
Upgrade `assignAcuity` to ESI-lite: (a) immediate-life table → ESI 1, (b) high-risk table → ESI 2, (c) resource-count proxy (predicted resources 0/1/2+) → ESI 5/4/3. Introduce level 5 via 2-3 new minor complaints (Medication refill, Suture removal, Minor rash). Exactly **one** rng draw per ED encounter, always drawn, applied only when base==3 (uptriade to 2). ESI 1-2 → ED path (current); ESI 3 → ED monitor; ESI 4-5 → fast-track/POLI redirect.

### D5 — Outgoing referrals via "transferred" disposition
Wire `EdTriage.disposition === "transferred"` as the wave-1 trigger for outgoing referrals. Create an outgoing letter (DEERS-ROCK → nearest tier-5 facility by distance sort) when transfer criterion holds (e.g., acuity≤2 with no ICU bed, or small fixed-probability roll). Closes ED encounter, schedules via EventQueue. Wave 2: ambulance dispatch integration.

### D6 — Jasa Raharja incident provenance
Keep ICD override as the eligibility trigger (finance.ts:63-64 — frozen by ADR-015 D5). Add `incidentRef: string|null` to InsuranceClaim — when encounter diagnosis/complaint came from a road-accident calendar season or scenario, stamp the encounter with the event id. Enables scenario-driven vs background JR split for audit/reporting.

### D7 — Determinism: fixed draws, counter ids, ONE declared seed break
- `generateReferrals` draws exactly 6 per fire (gate + 5 payload), discarding payloads when gate fails (fixes variable-draw bug).
- Replace rng-derived ids (`REF-PAT-*`, `RJL-*`) with counters.
- ESI single draw (D4) + patient-materialization draws (D2) batched into the same seed break.
- Add draw-count regression test: spy clock, assert constant draws per fire/encounter for both gate outcomes.
- Re-freeze baseline as `referral-v1`.

### D8 — Ambulance: minimal dispatch state machine (wave 2)
`AmbulanceState { fleet: Map<id, {tier: BLS|ALS}>, dispatches: Map<id, AmbulanceDispatch> }`. Triggers: incoming referral letters (transport selection by distance band + dx severity), ED disposition "transferred" (D5), scenario mass-casualty events (bulk dispatch). Dispatch = {vehicleId, letterId|encounterId, km, departTick, etaTick, costIdr}. Derive `arrivalMode`: "ambulance" iff dispatch exists, "transfer" iff inbound letter from RS tier, else "walk-in". Helicopter deferred to wave 3.

### D9 — Backward compatibility
Additive-only schema changes. Keep dead `capacity/doctors/nurses/beds` fields. Populate `returned`/`completed` statuses (already exist unused). New `_ambulanceState` namespace serialized beside `_referralState` in journal. Snapshot round-trip tests assert every new field.

### D10 — Scope cuts (deferred)
Wave 3: helicopter tier + eastern-Indonesia catchment events, JR ICD-set tightening (policy decision), sender-capacity-aware generation, specialist-capability matching for discharge-planning referrals.

---

## Implementation waves

| Wave | Content | Gate |
|------|---------|------|
| 1 | D1 (tier/catchment/distance), D2 (patient materialization), D3 (slot budget + FIFO drain), D4 (ESI-lite), D7 (fixed draws + counter ids + seed break + re-freeze), D9 tests (referral.draw-count, referral.routing, emergency.esi, finance-jr, determinism extended) | New tests green; seed break declared; baseline re-frozen as referral-v1; snapshot round-trips assert every new field; extended determinism fingerprints passing |
| 2 | D5 (outgoing referrals via transferred), D6 (JR incidentRef), D8 (ambulance BLS/ALS dispatch + costing + ETA + derived arrivalMode), D9 tests (ambulance lifecycle, cost math, etaTick scheduling) | Ambulance lifecycle + finance posting tests; draw-count test proves no second stream break; no re-freeze needed |
| 3 | (deferred) Helicopter, JR ICD tightening, sender-capacity generation, specialist matching | Post-wave-2 data review |

---

## Owner decisions (BLOCKERS)

1. **Catchment provinces / data coherence:** Jakarta, Surabaya, Aceh facilities referring to Makassar is absurd once geography matters. Restrict senders to which province set (73 + Sulawesi + eastern Indonesia per roadmap), or relocate records?
2. **Seed-break timing:** One declared break in wave 1, re-freeze as `referral-v1` (zenodo re-versioning per ADR-015 precedent). ROADMAP places M9.3 implementation "after JAMIA submission" — confirm sequencing against frozen JAMIA baseline.
3. **Deers-Rock's tier:** Nowhere declared in code (toFacility: "DEERS-ROCK"). Hierarchy implies RS B. Confirm and approve adding 2-3 RS A records as outgoing targets.
4. **Domain parameters:** Daily specialist slot budget, letter age-out K, ambulance rates (BLS/ALS base + per-km), vitals-instability p-table, transfer-out criterion. ADR-016 can propose ballparks; needs sign-off.
5. **JR scope policy:** Keep T20/T63 (burns/toxins) in the JR trigger set, or tighten to road-accident codes only? Current set is broader than real Jasa Raharja.
6. **Snapshot posture:** Confirm additive-fields + structural resume is the bar (per ADR-004 F9); no migration shims for pre-M9.3 snapshots.

## Consequences

- Phantom patients eliminated — every encounter references a real Patient entity.
- Geographic routing enables realistic catchment modeling and JR accident-provenance auditing.
- ESI-lite with level 5 reintroduced — enables self-referral routing to POLI instead of ED bays.
- One declared seed break (wave 1) — frozen baselines re-versioned once, not incrementally.
- Slot budget + FIFO drain models real referral capacity constraints without facility simulation overhead.
