# Phase D — Sentinel Output Semantics — Notes

**Status:** COMPLETE (pending commit) · **Execution host:** Mac Mini · **Baseline:** `79a5af5`
**Scope guard:** No Kronos changes, no adapter `admission_surge`/`staff_shortage` changes, no temporal-contract changes, no P-004. DR engine semantics (clock/calendar/RNG/world) untouched.

## D1 — primaryDiagnosis

### Dataflow BEFORE
```
patient.diagnoses (1–3 active ICD-10 codes, assigned at generation, closed list)
  → admissionHandler already computes primaryDx = first active dx for WARD ROUTING (markov.ts:63)
  → ...but the encounter object was built WITHOUT any diagnosis field (markov.ts:74-82)
  → emergency.ts / outpatient.ts likewise created encounters with no diagnosis
  → adapter extractDiseasePrevalence reads enc.primaryDiagnosis || "UNKNOWN"  (Kronos repo)
  → sentinel diseasePrevalence = { UNKNOWN: n } always
```
Information existed end-to-end in DR; it was dropped at encounter construction. (Outpatient even selected a clinic diagnosis for the VISIT record — `OutpatientVisit.diagnosis` — but never copied it to the encounter.)

### Dataflow AFTER
```
encounter creation (3 sites, all deterministic, no RNG added):
  inpatient  (markov.ts)   → selectPrimaryDiagnosisCode(patient)
  ED         (emergency.ts)→ selectPrimaryDiagnosisCode(patient)
  outpatient (outpatient.ts)→ dx.icd (the clinic-visit diagnosis: referral-matched
                              or walk-in pool draw the flow already selected)
  → encounters persist primaryDiagnosis as an ICD-10 CODE string
  → adapter's existing `enc.primaryDiagnosis || "UNKNOWN"` now reads real values
    (diseasePrevalence becomes live with NO Kronos change)
```

### Selection mechanism (documented)
- Inpatient + ED: **first ACTIVE diagnosis of the patient's problem list** (insertion order = generation order); fallback first diagnosis; `"UNKNOWN"` only if the patient has none (generator always assigns ≥1 — safety net).
- Outpatient: the **acute clinic-visit diagnosis** chosen by the outpatient flow (referral diagnosis matched into `DIAGNOSIS_POOL`, else weighted walk-in draw) — the reason for the visit, not the chronic list.
- Field key = ICD-10 **code** (stable, aggregable; consistent with `diseasePrevalence` "top-5 ICD counts" semantics).

## D2 — supplyStress

### BEFORE
`const supplyStress = 0.3;` hardcoded in the Kronos adapter — a constant, not a measurement.

### AFTER (DR side)
`computeSupplyStress(state)` exported from `central-supply.ts` (and the index barrel):
```
per item:  depletion_i = clamp01((maxStock_i − stock_i) / (maxStock_i − minStock_i))
stress   = mean(depletion_i) over catalog items with min < max
```
- Source state: the EXISTING `state.inventory` central-supply catalog (31 items: medications, lab reagents, contrast, surgical, oxygen, consumables) — genuinely dynamic in DR: pharmacy/lab `dispenseItem` drains stock; `centralSupplyHandler` (cadence 3) restocks any item below min back to max every 50 ticks. No new model, no fabricated supply chain.
- Anchors: all-at-max → 0; all-at-min → 1; the real initial state (every item at `(min+max)/2`) → exactly 0.5.
- Deterministic pure function of `state.inventory`: no RNG, no wall clock.
- **Honest boundary:** the Kronos adapter still hardcodes 0.3 — wiring this function into the sentinel output is Phase E (Kronos repo). DR now exports + tests the genuine signal.

## D3 — causal traceability tests (tests/phase-d.test.ts, 14 tests)

primaryDiagnosis: first-active selection; fallback chain; UNKNOWN safety net; causal unit test (changed problem list → changed code); live run: all encounters non-UNKNOWN ICD-shaped, ≥3 distinct codes, same-seed identical multiset, interleaving-invariant, different-seed different distribution.

supplyStress: empty guard; anchors 0 / 1 / exactly-0.5 initial; monotone response (drain ↑, refill ↓); isolation (waitingRoom/morgue changes don't touch it); live: initial exactly 0.5, real stock movement after 200 ticks, same-seed + interleaving determinism, recomputation consistency.

All runtime tests bounded ≤200 ticks (~110 ms each on Mac Mini).

## D4 — invariants rechecked (on Mac Mini)

build PASS · determinism suite 7/7 · temporal suite 10/10 · phase-d 14/14 · mulberry32 untouched (no RNG changes anywhere — both outputs are deterministic derivations) · seed derivation/sentinel independence untouched (no new RNG streams, no cross-world state).

## D6 — scientific boundary

This phase establishes **semantic validity** (the sentinel reports actual deterministic simulated state) — NOT clinical validity. No calibration, no epidemiological claims. `computeSupplyStress` is an operational proxy with explicitly documented semantics (mean normalized buffer depletion). `primaryDiagnosis` reuses DR's existing closed ICD-10 representation — no parallel ontology invented.
