# Module Contracts

> Single binding spec of every core module's public API, ownership, invariants, and known issues.
> Created 2026-07-09 per CosmoCQM #3.

## 1. `ina-cbg.ts` — INA-CBG Tariff Engine

**Owner:** Platform OC
**File:** `src/engine/ina-cbg.ts`

### Exported Symbols

| Symbol | Kind | Signature |
|--------|------|-----------|
| `SeverityLevel` | type | `"I" \| "II" \| "III"` |
| `CbgEntry` | interface | `{ icdCode, cbgGroup, tariffIdr, description, severity? }` |
| `CC_LIST` | const | `Record<string, "mild" \| "major">` — 16 entries |
| `ICD9_PROCEDURES` | const | `{ code, name, icdCodes[] }[]` — 23 entries |
| `INA_CBG` | const | `CbgEntry[]` — 68 entries |
| `getProceduresForDiagnosis(icdCode)` | function | → `{ code, name }[]` |
| `inferSeverity(diagnosisCodes[])` | function | → `SeverityLevel` |
| `lookupCbgTariff(icdCode, severity?)` | function | → `CbgEntry \| undefined` |
| `getCbgSuffix(severity)` | function | → `"A" \| "B" \| "C"` |
| `getSeverityCbgGroup(cbgGroup, severity)` | function | → string |
| `listCbgGroups()` | function | → `string[]` |
| `SEVERITY_MULTIPLIER` | const | `{ I: 1.0, II: 1.35, III: 1.70 }` |

### Invariants

- `INA_CBG` entries are keyed by ICD-10 code (not CBG group). Multiple codes may map to the same group.
- `inferSeverity`: 0 secondary diagnoses → Level I; any "major" CC → III; any "mild" CC → II; 2+ diagnoses with no CC tags → II.
- `lookupCbgTariff`: returns base tariff for Level I. Computes II/III via `SEVERITY_MULTIPLIER`. If an entry already has `severity: "II"` or `"III"`, that tariff is used as-is for that level; requesting a different level computes via ratio.
- Only 68 of ~1,075 real INA-CBG groups are implemented.

### Known Issues / Edge Cases

- **Fenced:** Full INA-CBG (1,075 groups) not implemented. Severity II/III coverage is approximated via multiplier, not official tariff tables.
- `getProceduresForDiagnosis` only matches exact ICD-10 code. Does not handle code prefix matching (e.g., I10 should not match I10.x subcodes).
- `ICD9_PROCEDURES` is a partial map — many diagnoses have no procedure pool entries.

### Dependencies

- None (self-contained data + logic)

---

## 2. `finance.ts` — Payer Assignment, Billing & Claims

**Owner:** Platform OC
**File:** `src/engine/finance.ts`

### Exported Symbols

| Symbol | Kind | Signature |
|--------|------|-----------|
| `PROCEDURE_COSTS` | const | `Record<string, number>` — 6 procedure types |
| `assignPayer(patient)` | function | → `PayerType` |
| `billingHandler(state, clock, queue)` | function | → `HospitalState` |
| `edCashierHandler(state, clock, queue)` | function | → `HospitalState` |
| `inpatientCashierHandler(state, clock, queue)` | function | → `HospitalState` |
| `outpatientCashierHandler(state, clock, queue)` | function | → `HospitalState` |

### Invariants

- **Payer assignment** runs at encounter start: Foreigners (non-WNI) → Self-pay; accident ICD codes (S06, S72, T14, T20, T63) → Jasa Raharja; default → BPJS Kesehatan.
- **Admin tariff** (150,000 IDR) charged once per encounter — both inpatient and outpatient.
- **Room tariff** charged every 5 ticks for inpatients only; rate = base × room class multiplier.
- **BPJS claims** only submitted when chart status is `"coded"`. Claims for uncoded charts are silently skipped each tick.
- **Claim adjudication** every 15 ticks: 85% approve, 10% returned (incomplete coding), 5% deny (missing documents).
- **Returned claims** auto-resubmit when chart becomes `"coded"`.
- **Jasa Raharja** caps at 30 days (43,200 ticks). Full coverage within cap, patient pays excess.
- **Private insurance**: 70% coverage.

### Known Issues / Edge Cases

- `billingHandler` only processes **one** returned BPJS claim per tick (first encounter iterated) — multiple returned claims may backlog.
- JR cap uses `(endTime - startTime) / 60000` ticks — assumes 1 tick = 1 minute. If an encounter endTime is null (still active), JR cap calculation underflows.
- `validateCbgCoding` function exists but is **not called** anywhere in the handler pipeline — it's dead code.
- Efficiency ratio (actual cost vs INA-CBG tariff) is not reported in any output.

### Dependencies

- `state-store.ts` (HospitalState)
- `clock.ts` (Clock)
- `event-queue.ts` (EventQueue)
- `patient/schema.ts` (InsuranceClaim, Payment, etc.)
- `charge-generator.ts` (generateCharge, CHARGE_RATES, ROOM_CLASS_MULTIPLIER)
- `ina-cbg.ts` (lookupCbgTariff, inferSeverity)

---

## 3. `markov.ts` — Admission, Discharge & Patient Flow

**Owner:** Platform OC
**File:** `src/engine/markov.ts`

### Exported Symbols

| Symbol | Kind | Signature |
|--------|------|-----------|
| `StateHandler` | type | `(state, clock, queue) => HospitalState` |
| `admissionHandler(state, clock, queue)` | function | → `HospitalState` |
| `dischargeScheduledPatients(state, clock, scheduled[])` | function | → `HospitalState` |
| `newPatientHandler(state, clock, queue)` | function | → `HospitalState` |
| `vitalsUpdateHandler(state, clock, queue)` | function | → `HospitalState` |

### Invariants

- **Admission** gate: if occupancy > 85% and no surge event, 70% chance of skip.
- Surge events override occupancy gate (event multiplier > 1.3 or scenario surge > 1.5).
- Admitted patients sorted by last discharge tick (FIFO for re-admissions).
- **Inpatient LOS**: 4,320–10,080 ticks (3–7 days). Discharge scheduled on admission via `queue.schedule("discharge", ...)`.
- **Scheduled discharge** handler processes the `discharge` event queue. Only fired events are processed.
- **Mortality roll**: high-risk 35%, moderate 10%, low 2% + scenario mortality boost.
- **Vitals update** every tick: heart rate, BP, O2 sat drift by ±3 units; temp drifts ±0.2°C.
- **New patients** generated every 15 ticks: 1–3 patients per tick.

### Known Issues / Edge Cases

- **ED→bed gap**: `disposition "admitted"` in ED module does not trigger `admissionHandler` — admitted ED patients get no bed assignment.
- **Readmission order**: sorted by last discharge tick; zero-tick re-admissions (same tick) are ordered arbitrarily (stable sort undefined).
- `dischargeScheduledPatients` mutation: modifies `newBeds` while iterating over it (JS Map iterator is insertion-order, mutation is safe but fragile).
- With realistic LOS (3–7 days), scheduled discharges don't fire until 4,320+ ticks. Short runs (<1,000 ticks) show 0 deaths — this is *correct behavior*, not a bug.

### Dependencies

- `state-store.ts` (HospitalState, MorgueRecord)
- `clock.ts` (Clock)
- `event-queue.ts` (EventQueue)
- `patient/generator.ts` (generatePatient)
- `calendar.ts` (getEventSummary)
- `clinical-knowledge.ts` (assessMortalityRisk, mapIcdToTerminalEvent, mapIcdToSpecialty)
- `scenario.ts` (getScenarioEffects)
- `finance.ts` (assignPayer)

---

## 4. `clinical-knowledge.ts` — ICD Protocols, Vital Rules & Mortality

**Owner:** Platform OC
**File:** `src/engine/clinical-knowledge.ts`

### Exported Symbols

| Symbol | Kind | Signature |
|--------|------|-----------|
| `ClinicalAction` | interface | `{ type, label, priority, detail? }` |
| `IcdProtocol` | interface | `{ code, name, specialty, actions[] }` |
| `VitalsRule` | interface | `{ param, condition, threshold, actions[] }` |
| `Gender` | type | `"male" \| "female"` |
| `ICD_PROTOCOLS` | const | `IcdProtocol[]` — 70+ entries covering ~50 ICD codes |
| `VITALS_RULES` | const | `VitalsRule[]` — 7 rules (HR > 100, SpO2 < 92, etc.) |
| `ESCALATION_TRIGGERS` | const | `EscalationTrigger[]` — 6 triggers |
| `mapIcdToSpecialty(code)` | function | → `SpecialtyType` |
| `mapIcdToActions(code)` | function | → `ClinicalAction[]` |
| `getVitalsTriggers(vitals)` | function | → `ClinicalAction[]` |
| `assessQsofa(vitals, age, diagnoses)` | function | → `{ score, likelySepsis, details[] }` |
| `assessMortalityRisk(age, vitals, diagnoses)` | function | → `{ score, risk, factors[] }` |
| `mapIcdToTerminalEvent(code, rng?)` | function | → `string \| null` |

### Invariants

- `ICD_PROTOCOLS` lookup is exact match on `code` — no prefix matching.
- `mapIcdToSpecialty` defaults to `"cardiology"` for unlisted codes.
- `mapIcdToActions` returns `[]` for unlisted codes.
- `assessMortalityRisk`: score ≥ 5 → "high", ≥ 3 → "moderate", else "low". Critical diagnosis codes: I21, I50, R57, A41, I63, J84, A91.
- `assessQsofa`: qSOFA of 0–3. ≥ 2 → "likelySepsis". Uses RR ≥ 22, SBP ≤ 100, and age > 65 or neurological diagnosis for altered mentation proxy.
- `mapIcdToTerminalEvent`: returns random event from `TERMINAL_EVENTS` map by ICD code. Unlisted codes return null.

### Known Issues / Edge Cases

- `ICD_PROTOCOLS` has duplicate entries for E11 (code "E11" appears twice — diabetes + diabetic foot with different specialty mappings). The `find()` in `mapIcdToActions` returns the *first* match only.
- `TERMINAL_EVENTS` is a separate parallel map from `ICD_PROTOCOLS` — they can diverge (entries may exist in one but not the other).
- `getVitalsTriggers` collects all triggered rules — no deduplication if multiple rules produce same action.
- Specialty mapping is coarse: many codes mapped to "cardiology" as default.

### Dependencies

- `specialty.ts` (SpecialtyType)
- `patient/schema.ts` (Vitals)

---

## 5. `pharmacy.ts` — Pharmacy Handler (Ordering & Admin)

**Owner:** Platform OC
**File:** `src/engine/pharmacy.ts`

### Exported Symbols

| Symbol | Kind | Signature |
|--------|------|-----------|
| `DRUG_COSTS` | const | `Record<string, number>` — 22 drugs |
| `MEDICATIONS` | const | `{ code, name, dose, route }[]` — 22 entries |
| `pharmacyHandler(state, clock, queue)` | function | → `HospitalState` |
| `medAdminHandler(state, clock, queue)` | function | → `HospitalState` |

### Invariants

- `pharmacyHandler` runs every 5 ticks on even tick % 5. Picks a random active encounter and a random medication.
- Medication order status starts as `"ordered"`.
- `medAdminHandler` runs each tick: 40% chance to advance from "ordered" → "administered".
- Drug is dispensed from central supply via `dispenseItem` using `MED_MAP` code mapping.

### Known Issues / Edge Cases

- Pharmacy handler is **random** — no clinical decision-making (any drug for any patient).
- No dose validation (all orders use the value from `MEDICATIONS`, ignoring `getDoseRange` in `pharmacy-knowledge.ts`).
- `DRUG_COSTS` contains 22 entries but `MEDICATIONS` also has 22 — they must stay in sync.

### Dependencies

- `state-store.ts` (HospitalState)
- `clock.ts` (Clock)
- `event-queue.ts` (EventQueue)
- `patient/schema.ts` (MedicationOrder)
- `central-supply.ts` (dispenseItem, getStock)

---

## 6. `pharmacy-knowledge.ts` — Drug Safety & Interaction Knowledge

**Owner:** Platform OC
**File:** `src/engine/pharmacy-knowledge.ts`

### Exported Symbols

| Symbol | Kind | Signature |
|--------|------|-----------|
| `MED_ALLERGEN_MAP` | const | `Record<string, string[]>` — 22 entries |
| `DRUG_DIAGNOSIS_CONTRA` | const | `{ drugCode, diagCodes[], rationale }[]` — 17 entries |
| `getDoseRange(drugCode)` | function | → `{ minMg, maxMg, maxDailyMg, unit } \| null` |
| `checkDrugAllergy(drugCode, patientAllergies)` | function | → `string \| null` |
| `checkDiagnosisContraindication(drugCode, diagnoses)` | function | → `{ contraindicated, warnings[] }` |
| `checkDrugInteraction(newDrug, existingMedications)` | function | → `{ severity, description }` |

### Invariants

- `MED_ALLERGEN_MAP`: empty array = no known allergens (safe). Missing entries implicitly mean no known allergens.
- `checkDrugAllergy`: case-insensitive substring match against patient allergies.
- `checkDiagnosisContraindication`: uses `code.startsWith()` for ICD prefix matching.
- `checkDrugInteraction`: currently covers 13 interaction pairs across 8 drugs.

### Known Issues / Edge Cases

- Interaction map is a directed graph — not all symmetric pairs are entered (e.g., ACE↔FUR appears with both orientations but HEP↔ASP only under HEP).
- `DRUG_DIAGNOSIS_CONTRA` uses `startsWith()` prefix match — careful with codes like "N18" matching "N18.5".
- `getDoseRange` returns `null` for unknown codes — caller must handle.

### Dependencies

- `patient/schema.ts` (Medication, Diagnosis)

---

## 7. `charge-generator.ts` — Rate Tables & Charge Generation

**Owner:** Platform OC
**File:** `src/engine/charge-generator.ts`

### Exported Symbols

| Symbol | Kind | Signature |
|--------|------|-----------|
| `CHARGE_RATES` | const | `Record<ChargeCategory, number>` — 10 categories |
| `ROOM_CLASS_MULTIPLIER` | const | `Record<RoomClass, number>` — 9 room classes |
| `ADMIN_TARIFF` | const | `150000` |
| `generateCharge(charges, clock, encounterId, patientId, category, description, amount?)` | function | → `Map<string, Charge>` |

### Invariants

- `CHARGE_RATES` are in IDR. Categories: lab (250K), radiology (500K), pharmacy (75K), surgery (5M), room (350K), consult (150K), emergency (400K), respiratory (200K), supply (50K), administration (150K).
- `ROOM_CLASS_MULTIPLIER`: vvip=4×, vip=3×, kelas-1=2×, kelas-2=1.5×, kelas-3=1×, icu=3.5×, hcu=2×, nicu=3.5×, picu=3.5×.
- `generateCharge` uses a global counter `chargeCounter` (starts at 0, never reset). Charge IDs are `CHG-{counter}-{patientId}`.
- If `amount` is provided, it overrides `CHARGE_RATES[category]`.

### Known Issues / Edge Cases

- `chargeCounter` is **global** (module-level) — never reset between simulation runs. In theory it could overflow (practical: ~10M runs).
- Calling `generateCharge` with an unknown category will produce `NaN` (CHARGE_RATES[category] is undefined).

### Dependencies

- `state-store.ts` (HospitalState)
- `clock.ts` (Clock)
- `patient/schema.ts` (Charge, ChargeCategory, RoomClass)

---

## 8. `state-store.ts` — HospitalState Shape & Building Layout

**Owner:** Platform OC
**File:** `src/engine/state-store.ts`

### Exported Symbols

| Symbol | Kind | Signature |
|--------|------|-----------|
| `HospitalState` | interface | ~40 fields including all Map collections and subsystem states |
| `MorgueRecord` | interface | `{ patientId, encounterId, primaryDiagnosis, ... }` |
| `OutcomeRecord` | interface | `{ patientId, ..., outcome, losTicks, ... }` |
| `CaseRecord` | interface | Doctor's case memory record |
| `NurseCaseRecord` | interface | Nurse's case memory record |
| `OutpatientVisit` | interface | Outpatient visit tracking |
| `ActionLearning` | interface | Learning memory action record |
| `DiagnosisLearning` | interface | Learning memory diagnosis record |
| `LearningMemory` | interface | `{ byDiagnosis: Map }` |
| `BuildingConfig` | interface | `{ name, code, wards[] }` |
| `BUILDING_LAYOUT` | const | `BuildingConfig[]` — 4 buildings, 13 wards |
| `PharmacistCaseRecord` | interface | Pharmacy case memory |
| `createState(patients, wardCapacity?)` | function | → `HospitalState` |

### Invariants

- `createState` builds 133 beds from `BUILDING_LAYOUT` (4 buildings: VVIP-VIP Pavilion, Main Inpatient, Mother & Child, Critical Care Tower).
- If `wardCapacity` parameter is provided, uses flat bed generation (backward compat for tests).
- Subsystem states (bloodBank, microbiology, pathology, cssd, biomed, ipc, nutrition, radiotherapy, dialysis, scenario) initialized via their respective `init*()` functions.
- `_agentState` and `_referralState` are initialized with empty Maps.

### Known Issues / Edge Cases

- `BuildingConfig.wards` uses `Partial<Record<RoomClass, number>>` — room classes not declared are simply absent (no beds for that class).
- Bed IDs are generated as `{WardName}-{NN}` — fragile if ward names change.
- `morgueCapacity` is hardcoded to 10 in `createState`.

### Dependencies

- `patient/schema.ts` (Patient, Bed, Encounter, ...all types)
- `specialty.ts` (SpecialtyOrder)
- `agent/system.ts` (AgentState)
- `referral/system.ts` (ReferralState)
- `icd-tracker.ts` (IcdPeriodData)
- All subsystem modules (blood-bank, microbiology, etc.)

---

## 9. `journal.ts` — Snapshot Save/Restore & Event Journal

**Owner:** Platform OC
**File:** `src/engine/journal.ts`

### Exported Symbols

| Symbol | Kind | Signature |
|--------|------|-----------|
| `JournalRow` | interface | `{ id, tick, timestamp, event_type, entity_type, entity_id, payload, created_at }` |
| `SnapshotInfo` | interface | `{ tick, state }` |
| `initJournal(dbPath?)` | function | → `void` |
| `journalBeginTransaction()` | function | → `void` |
| `journalCommitTransaction()` | function | → `void` |
| `journalAppend(tick, time, eventType, entityType, entityId, payload)` | function | → `void` |
| `journalQuery(options)` | function | → `JournalRow[]` |
| `journalStats()` | function | → `{ total, byType, firstTick, lastTick }` |
| `journalPurge(currentTick)` | function | → `void` |
| `journalExportAll(currentTick)` | function | → `string \| null` |
| `journalExportAndPurge(currentTick)` | function | → `void` |
| `journalHardPurge()` | function | → `void` |
| `journalReplay(tickMax, eventTypes?)` | function | → `JournalRow[]` |
| `saveSnapshot(tick, state)` | function | → `void` |
| `loadNearestSnapshot(tick)` | function | → `SnapshotInfo` |
| `listSnapshots()` | function | → `{ tick, createdAt }[]` |
| `setExportDir(dir)` | function | → `void` |
| `listExports()` | function | → `{ filename, tick, sizeBytes }[]` |
| `closeJournal()` | function | → `void` |
| `SNAPSHOT_INTERVAL` | const | `100` |

### Invariants

- SQLite-backed with DELETE journal mode (not WAL).
- Event retention: 100 ticks. Snapshot retention: 5 most recent.
- Purge runs every 50 ticks, incremental vacuum if > 1,000 rows deleted.
- Export runs every 500 ticks → writes JSON to `exportDir`.
- `saveSnapshot` serializes all HospitalState Maps → `[string, V][]` arrays via `mapToArr`.
- `deserializeState` restores arrays → Maps via `arrToMap`. Optional chaining for backward compatibility with old snapshots.
- Agent state and referral state serialized in ADR-003 format (pool.agents, pool.assignments, facilities, letters, incomingQueue).

### Known Issues / Edge Cases

- `journalHardPurge` uses hardcoded cutoff of `maxTick - 100` — may delete too aggressively for short-lived databases.
- `journalExportAndPurge` fires on `EXPORT_INTERVAL = 500` regardless of whether there's data to export.
- SQLite `better-sqlite3` is synchronous — blocks event loop during save/load.

### Dependencies

- `better-sqlite3`
- `node:path`, `node:fs`
- `state-store.ts` (HospitalState, LearningMemory)
- All subsystem init functions (blood-bank, micro, patho, cssd, etc.)

---

## 10. `agent/system.ts` — Agent State & Generator

**Owner:** Platform OC
**File:** `src/agent/system.ts`

### Exported Symbols

| Symbol | Kind | Signature |
|--------|------|-----------|
| `AgentState` | interface | `{ pool: AgentPool }` |
| `initAgentState()` | function | → `AgentState` |
| `agentHandler(state, clock, queue)` | function | → `HospitalState` |
| `getAvailableAgents(state, department)` | function | → `HospitalAgent[]` |

### Invariants

- `AgentState.pool.agents` is `Map<string, HospitalAgent>` — keyed by agent ID.
- `AgentState.pool.assignments` is `Map<string, string>` — maps encounter ID → agent ID.
- Shift system: tick % 24 < 8 → "pagi", < 16 → "siang", else "malam". All agents always in shift (no day-off logic).
- Agent fatigue: consecutive ticks tracked. > 20 → "lelah", > 40 → "sakit_ringan".
- Random illness: 0.5% chance per tick for healthy agents to become "sakit_ringan", 0.2% chance per tick for "sakit_ringan" → "sakit_berat".
- Female agents: menstrual cycle simulated (28-day cycle, days 0-4 menstruating).
- Pregnancy tracked per agent but no pregnancy logic beyond incrementing weeks.

### Known Issues / Edge Cases

- `agentHandler` reads `_agentState` via type cast `(state as unknown as { _agentState?: AgentState })` — not type-safe.
- No agent creation/destruction logic in `agentHandler` — agents must be pre-populated in initial state.
- `getAvailableAgents` filters by department + inShift + not "sakit_berat" — does not check fatigue level or rest requirements.
- 24-tick shift cycle means agents work all 3 shifts without rest — unrealistic.

### Dependencies

- `state-store.ts` (HospitalState)
- `clock.ts` (Clock)
- `event-queue.ts` (EventQueue)
- `agent/types.ts` (HospitalAgent, AgentPool, Shift, KeadaanKesehatan)

---

## 11. `referral/system.ts` — Referral Pipeline

**Owner:** Platform OC
**File:** `src/referral/system.ts`

### Exported Symbols

| Symbol | Kind | Signature |
|--------|------|-----------|
| `ReferralState` | interface | `{ facilities: Map, letters: Map, incomingQueue: Array }` |
| `initReferralState()` | function | → `ReferralState` |
| `referralHandler(state, clock, queue)` | function | → `HospitalState` |
| `processReferralLetter(letters, letterId, newStatus, notes?)` | function | → `Map<string, ReferralLetter>` |
| `getReferralStats(state)` | function | → `{ totalLetters, active, received, completed, bySourceType }` |

### Invariants

- `initReferralState` loads 35 facilities from `REFERRAL_FACILITIES` (15 Puskesmas, 5 Klinik, 5 RS Tipe D, 10 RS Tipe C).
- Referral handler generates incoming referrals every 15 ticks (30% chance) from Puskesmas/Klinik/RS Tipe D.
- Referral processing: first item in `incomingQueue` is marked "received" every 5 ticks.
- `processReferralLetter` is a pure data function — does not mutate.

### Known Issues / Edge Cases

- `incomingQueue` is replaced with `incoming.slice(0, 0)` (empties the array) after processing — only one referral processed at a time.
- No outgoing referral logic — the hospital only receives referrals, never refers out.
- Referrals from RS Tipe C and higher are never generated (filter only includes Puskesmas/Klinik/RS Tipe D).
- `generateReferrals` constructs a fresh patient ID (`REF-PAT-...`) each time — these patients are never created in the patient pool.

### Dependencies

- `state-store.ts` (HospitalState)
- `clock.ts` (Clock)
- `event-queue.ts` (EventQueue)
- `identity/types.ts` (ReferralLetter, ReferralFacility)
- `identity/data.ts` (REFERRAL_FACILITIES)

---

## Format Index

Each module entry follows:

```
// Module name, ownership, file path
// Exported symbols with signatures
// Invariants (things that must always be true)
// Known bugs / edge cases
// Dependencies (which other modules it imports)
```
