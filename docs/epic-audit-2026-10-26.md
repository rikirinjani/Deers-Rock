# Epic Audit VI–IX — 2026-10-26 (follow-ups 2026-10-27: §7)

**Branch:** `epic-audit-vi-ix` (cut from `main` @ `0d60971`)
**Role:** Platform OC audit, run unattended. Calls I made without the owner are marked **Decision**.
**Method:** I checked each ROADMAP item against the code, ran it in seeded worlds (`createWorld(n, undefined, seed)` + `step`), and curled the running API (`npx tsx src/cli/index.ts up`, `DR_TICK_MS=50`). I also loaded the dashboard in headless Chromium.

Verdicts: **DONE** = verified working · **PARTIAL** = code exists but is incomplete or wrong · **MISSING** = nothing usable.
Sizes: **S** < 150 lines · **M** 150–500 · **L** > 500 or cross-cutting.

---

## 0. Baseline and the determinism failure

| | tsc | Tests (files) |
|---|---|---|
| Baseline (`main`, before changes) | clean | **426 passed, 3 skipped, 1 failed** (54 files) |
| After (this branch) | clean | **467 passed, 3 skipped, 0 failed** (60 files) |

Setup note: `npm ci` cannot run because the repo has no `package-lock.json`, and `npm install` rejects the `workspace:*` deps in `packages/*`. I installed the root dependencies with `pnpm install --no-lockfile` and committed no lockfile. `src/` and `tests/` do not import `packages/*`. **Open item:** commit a lockfile, or document pnpm as the package manager (S, Coordinator call).

**Failure:** `tests/determinism.test.ts` › "local RNG isolation: throwaway world does not alter later world" (expected 78 to be 79). It fails on its own too, not only after other tests.

**Root cause:** `CODER_PROFILES` in `src/engine/ai-coder.ts` is a module-global array. `recordCoderOutcome` mutates it (`accuracy`, `casesProcessed`, `correctAssignments`), and `createWorld` never reset it. So a throwaway world shifted the next same-seed world's `willCode = rng() < accuracy` decisions. I traced every RNG call site: the call sequence first diverges at tick 5 in `aiCoderHandler`, where `pickBestCoder` is skipped for a chart that stayed incomplete. That surfaced at tick 16 as different respiratory charges.

**Fix:** added `resetCoderProfiles()` and call it from `createWorld` next to the other `reset*Counter()` calls. I also reset the discharge-planning plan-ID counter, which leaked the same way (IDs only). `tests/world-isolation.test.ts` has 2 regression tests; both fail without the fix. The original test is unchanged.

---

## 1. Epic VI — Department Completeness

| Item | Verdict before | Evidence | Changed | Remaining |
|---|---|---|---|---|
| Agent pool 30+ roles | DONE | `src/agent/generator.ts`, 122 agents at 60 patients | — | — |
| Fatigue/health/shift tracking | **PARTIAL (broken model)** | `agentHandler` hard-codes `inShift = true`. `consecutiveTicks` never resets, so fatigue = tick count. Seed 42: **100% of staff are `sakit_ringan`/`sakit_berat` by tick 50** and stay that way (live API at tick 460: `available: 0` of 122). Every agent also has an independent 0.5%/tick chance of falling ill. | None (modelling change, see right) | **M**. Needs a real roster (3×480-tick shifts, agents assigned to one), fatigue that resets off-shift, thresholds in ticks-per-shift, and a calibrated sickness rate (Research OC). This changes every trajectory (availability gates the AI doctor/nurse and assignment), so it needs a Research OC calibration pass first. |
| Link doctors/nurses to encounters | PARTIAL | `markov.ts` assigns only non-sick agents. Because of the fatigue bug, almost no agent qualifies after tick ~50, so assignments mostly fail. | — | Fixed by the roster item above. |
| Auto-replace sick agents (sick leave) | **PARTIAL → DONE (mechanism)** | `sickLeaveHandler` looked for agents turning `sakit_berat` by diffing its own input against its output. That transition happens in `agentHandler` every tick, while this handler runs every 10 ticks, so it never saw one: **0 leave records in 600 ticks**. The replacement was also never applied, and the handler mutated its input counter. | State-based detection. Replacement: same role, same department first, then the float pool; deterministic ranking, no rng. The sick agent's encounter assignments are handed to the backup (copy-on-write). Records close on recovery. Seed 42 at 600 ticks: 117 records, 22 covered, 51 encounters reassigned. Tests: `tests/sick-leave.test.ts` (10). | Most leave is "uncovered" because the fatigue bug leaves almost nobody fit. `sakit_ringan` never recovers: `sakitTerhitung` only counts while `sakit_berat` (S). |
| Dashboard: agent health, fatigue alerts | **MISSING → DONE** | `/api/agents/summary` gave counts only; no dashboard panel. | `summarizeAgentHealth()` → `GET /api/agents/health` (health mix, fatigue mean/max, open/uncovered leave, critical + warning alerts). New 👷 Staff Health panel in `public/index.html`, verified rendering in headless Chromium with no script errors. | — |
| Outpatient (9 poli) | DONE | `outpatient.ts`; visits accumulate (test now really runs, see §5) | Test fix only | — |
| Appointment scheduling | **Wrong tick → MISSING** | `appointment-scheduling.ts` exists, but `createAppointment` has **no caller**, so `/api/appointments` is always empty. `getUpcomingAppointments` hard-codes `tick = 0`. | — | Wire control visits (kontrol) from discharge planning, fix the tick bug (S–M). |
| Discharge planning / rujuk balik | DONE | `discharge-planning.ts`, plans created | ID counter now reset per world | — |
| Referral chain | see Epic IX | | | |
| Morgue records | DONE | `markov.ts` death path; 7 morgue tests now really run | — | — |
| Kamar jenazah & forensik | **PARTIAL → DONE** | Bodies sat in `received` until a 30-day auto-release. `stored`, `autopsy_done`, `legal_hold`, `autopsy_required` and `causeOfDeathCertified` were unreachable. | `advanceBody()` workflow, tick thresholds, no rng. Natural death: stored → certified → released to family (~12 h). Unnatural death (S/T/V–Y chapters, Decision): legal hold for the police visum request → autopsy required → autopsy done + certified → released. The 30-day cap stays for unclaimed bodies. `/api/kamar-jenazah` reports `autopsy_done` and `certified`. Tests: `tests/kamar-jenazah.test.ts` (5). | `registerBody` mutates the live state's map in place, the same pattern as the agent pool (S). No forensic cost or charge yet (S). |
| Equipment / central supply / dept consumption | DONE | handlers present; `/api/export/supply-consumption.csv` | — | — |

**Epic VI summary:** the M6.1 mechanisms now work. The agent shift/fatigue model is still broken and is the main open item. Appointments are unwired.

---

## 2. Epic VII — Polish & Infrastructure

| Item | Verdict before | Evidence | Changed | Remaining |
|---|---|---|---|---|
| Dockerfile | DONE | `Dockerfile` | — | — |
| More Indonesian names | **PARTIAL → DONE** | The pool already had 107 male / 86 female / 79 surnames, but with defects: `" Firmansyah"` (leading space), duplicates, "Budi" in the female list, "Ompung" (Batak kinship term) used as a surname. It had no South Sulawesi names, although the hospital is in Makassar. | 158 / 130 / 130, weighted to the catchment (Bugis-Makassar, Toraja, Manado, Maluku, Papua) plus Javanese, Sundanese, Balinese, Minang, Batak. This changes only `pickRandom` indices, never rng draw counts. Tests in `tests/patient-generator.test.ts` (+3). | Staff naming reuses `PERAWAT_NAMES` (prefix "Ns.") for non-clinical roles, e.g. an admin named "Ns. Wulan" (S). |
| `as any` casts in rest/fhir | DONE (not re-verified line by line) | — | — | — |
| `getDeteriorationRate` counts deceased | DONE | `agent-learning.ts` | — | — |
| Split `HospitalState` | MISSING (audit only) | `state-store.ts`: `HospitalState` is a flat interface with ~60 fields, including ~25 `_`-prefixed sub-states that handlers reach via `(state as unknown as {...})` casts. `journal.ts` serializes each one by hand. | — | **L**. Group into typed sub-states (`clinical`, `finance`, `workforce`, `referral`, `meta`). Make `createState`, snapshot serialize/deserialize and the timeline branch-copy the single owners. Needs an ADR. |
| Outcome snapshots + API | DONE | `/api/outcomes/snapshots` | — | The snapshot buffer is module-global and not cleared by `createWorld` (S). |
| Expose action-ranking distribution | **MISSING → DONE** | No endpoint. | `getActionRankingDistribution()` scores pairs with `getActionRanking` itself (same formula the AI doctor uses), plus a 10-bucket histogram and a neutral-prior count. `GET /api/learning/action-ranking?icd=&top=`; verified live. Tests: `tests/action-ranking.test.ts` (6). | — |
| **Found:** learning counted outcomes repeatedly | BUG → fixed | `learningHandler` re-learned *every* outcome record on each 10-tick pass. Seed 42: **431 outcomes counted as 53,856 cases by tick 2500 (~125×)**, so every learned rate and ranking was skewed. `learnFromOutcome` also mutated the previous memory's objects (timeline/snapshot aliasing). | `learnedOutcomes` cursor on `LearningMemory`, serialized. Old snapshots default it to their outcome count, so nothing is re-learned on resume. Learning is now copy-on-write. | Research OC should re-check every result that relied on learned rankings or rates (ADR-006). |

**Epic VII summary:** 7.1 and 7.3 are now done. 7.2 stays open on the `HospitalState` split (L).

---

## 3. Epic VIII — ADRs & Governance

| Item | Verdict | Evidence | Changed |
|---|---|---|---|
| Summary row "2/3 MS" vs all 3 milestones ticked | **Inconsistent** | The milestone ticks are not all valid either (see below). | ROADMAP summary corrected |
| ADR-012 Formulary Expansion ticked | **Wrong tick, no file** | No `ADR-012*` in `adr/` or `docs/adr/`. ADR-013/014 list it as "Related". | Struck through in ROADMAP |
| ADR-001, ADR-002 | Written, status **Proposed** | file headers | Noted in ROADMAP |
| ADR-010, 011, 013 | Written, status **Draft** | file headers | Noted |
| Number collisions | **ADR-004** is two different ADRs (`adr/ADR-004-mortality-risk-engine.md`, `docs/adr/ADR-004-bounded-state-durable-scheduling.md`). **ADR-017** is two files (`department-completeness`, `patient-flow-supply`). **ADR-009** is in both directories with *different* content. | — | Listed. Renumbering is Coordinator OC's call. |
| ADR-018, 019, 020, 021, 022, 024, 025, 027 exist but are not listed in M8.1 | confirmed | `docs/adr/` | Added to the ROADMAP list |
| ADR-023, ADR-026 | no file; ADR-026 is cited in `docs/CODEX-E2E-REPORT.md` and `docs/benchmarks/100k-tick-report.md` | | Listed as gaps |
| Epic X "See ADR-013 for design" | **Wrong reference** | ADR-013 is ICD chapters IX/X. The Epic X design is ADR-027 (international adapter). | ROADMAP corrected |
| Two ADR directories (`adr/`, `docs/adr/`) | Open | | Coordinator call: consolidate (S) |
| M8.3 Constitution amendments 1–5 | DONE | `CONSTITUTION.md` footer | Amendment 6 (Art. IV §4.2, 2026-07-01) exists but was unlisted; now added |
| M8.2 Terminology | DONE (spot check) | 6 remaining "Tipe X" hits outside papers/khanza/kaggle, in Indonesian regulatory contexts | — |

**Epic VIII summary:** M8.1 is **PARTIAL** (ADR-012 missing, numbering collisions, 2 ADRs still Proposed and 3 Draft). M8.2 and M8.3 are done.

---

## 4. Epic IX — Financial & Referral Realism (M9.3 wave 2)

All numbers below come from the configuration in `tests/epic9-wave2-benchmark.test.ts` (seed 42, 60 patients, 600 ticks), measured on the final branch code after the §4b outpatient seed break. Runs are deterministic.

**Jasa Raharja provenance (`src/referral/jr-provenance.ts`): PARTIAL.**
- 4 incidents (all S72, severe). One per encounter. Every trigger-ICD encounter older than one handler period is covered, and runs are deterministic. All 4 JR-payer encounters have an incident.
- **But all 4 incidents are the same patient** (one admission, then three ED re-presentations), so one accident yields 4 "road_accident" incidents. Incidents are keyed per encounter, not per accident or patient. (S)
- **Structural trigger mismatch:** `finance.ts` assigns JR for **199** S/T/V codes (`ACCIDENT_ICD_CODES`, ADR-025), but provenance triggers on only **6** (T20, T63, S72, S82, S92, T07). Every other accident code, starting with S06 head injury (the classic road-traffic JR case), is billed to JR with no `incidentRef`. In the pre-seed-break run (same config) this showed up as 1 of 6 JR encounters covered, the other 5 being S06. Coverage is therefore seed-dependent; the gap is not.
- In a 1500-tick run, all 8 incidents were T20 (burns). Burns are not road accidents. Keeping T20/T63 was an explicit owner decision (M9.3-BLOCKER-DECISIONS §5), so **I did not change the trigger set.** **Owner question:** align provenance with `ACCIDENT_ICD_CODES` (at least S06), or narrow finance to V01–V89 external causes?
- No API endpoint exposes incidents, and incidents are not linked to the claim (`insuranceClaims` has no `incidentRef`) (S).
- The patient generator has almost no S-chapter trauma, so JR volume is about 1% of encounters (Research OC calibration target).

**Ambulance BLS/ALS (`src/referral/ambulance.ts`): PARTIAL (unwired).**
- `dispatchAmbulance` has **no caller in `src/`**, so the engine never dispatches. A characterization test asserts this; update it when the module is wired.
- I drove the module from the 8 referral letters the run actually received: **4 dispatches, 4 refusals.** The 3-vehicle fleet stays tied up on 900–1800 km legs with ETAs up to 1800 ticks (30 h). Total cost 12.8M IDR. Cost and ETA match the BLS (200k + 2k/km, 60 km/h) and ALS (500k + 5k/km, 80 km/h) formulas exactly. Concurrency never exceeds 3, and arrivals free the vehicle.
- Model findings for Research OC: road ambulance across Eastern Indonesia (inter-island) is implausible; the tier is "first available", not chosen by acuity; costs are never charged to the encounter; and `dispatchAmbulance` mutates state in place.

**M9.3 wave 1, "real-patient linkage": mostly true, but the loop is not closed.** `outpatientHandler` turns every received letter into a referral outpatient visit, generating a real `Patient` (ADR-016 D2). Seed 42, 600 ticks: 8 letters → 8 referral visits. But the letter is never linked back: `letter.patientId` stays the phantom `PAT-REF-xxxxx` (0 of 8 resolve to a patient), letters never reach `completed`, and letters whose visit already happened still age out to `returned`. `outpatientHandler` also writes the new patient into the *input* state's map (`state.patients.set`). (S–M; do it together with the ambulance wiring: dispatch by acuity on arrival, post an ambulance charge, link the JR incident.)

M9.1, M9.2 and M9.4 were not re-audited beyond the payer/JR path above.

---

## 4b. Regression found and fixed during the audit: outpatient RNG coupling

After the learning fix, `tests/phase-e.test.ts` › "staff_shortage does not affect admission encounters" failed (44 vs 48). On `main` it passed **only by a count coincidence**: at seed 42 the encounter *sets* already differed, and across seeds 1–12 the counts differed for seeds 1, 2 and 4. `outpatientHandler`'s draw count depends on poli capacity (the shortage modifier), so on the shared `clock.rng` a capacity change re-rolled every later handler, including ED and admissions.

**Fix:** `outpatientHandler` draws from its own sub-stream, `createRng(seed ^ f(tick) ^ salt)` (seeded, ADR-008-compliant). This is a **declared seed break** (cf. ADR-016 D7): every trajectory differs from pre-2026-10-26 runs, so frozen baselines need re-freezing. Result: 10 of 12 seeds now give identical non-poli encounter sets. The residual coupling (e.g. seed 2) is real: a patient still queued at a poli can't present at the ED at the same time. The test now compares encounter IDs, not just the count. A new test asserts outpatient makes zero `clock.rng` draws; it fails on the old code (6 draws).

**Open item for Research OC:** other handlers also have data-dependent draw counts on the shared stream (e.g. `aiCoderHandler`, `respiratoryHandler`, `agentHandler`'s conditional draws), so any intervention re-rolls unrelated subsystems. Counterfactual experiments (Constitution §1.4) would benefit from per-handler sub-streams across the board. M; also a seed break.

---

## 5. Test-suite findings (cross-epic)

- **Vacuous tests:** `runWorld()` returns a new World and never mutates its argument. Six files discarded the result, so their assertions ran against the tick-0 world: `epic6-pipeline` (the Epic VI evidence), `learning-freeze`, `mm-conference`, `morgue`, `morgue-outpatient`, `outpatient`. I fixed them to assign the result and pinned seed 42 where `createWorld()` was unseeded (`Date.now()`). Once they really ran, one stale assertion surfaced (`outpatient` expected a `complaint` field that never existed). `journal.test.ts` uses the same pattern but asserts on journal side effects, so it is valid and unchanged.
- Many remaining assertions are tautological (`toBeGreaterThanOrEqual(0)`). Tightening them is a follow-up (S).
- **Dashboard parse guard:** `tests/dashboard-scripts.test.ts` compiles every classic inline `<script>` in `public/*.html` with `vm.Script`. It fails on `index.html` as of `0d60971~1` ("Unexpected token ')'") and passes now.

---

## 6. Test counts

| | Passed | Skipped | Failed | Files |
|---|---|---|---|---|
| Baseline | 426 | 3 | 1 | 54 |
| After (this branch, tsc clean) | **467** | 3 | **0** | 60 |

New test files: `world-isolation` (2), `sick-leave` (10), `kamar-jenazah` (5), `action-ranking` (6), `epic9-wave2-benchmark` (8), `dashboard-scripts` (5). Added to `patient-generator` (+3) and `phase-e` (+1). 426 + 1 (fixed) + 40 new = 467. The 3 skips are pre-existing.

---

## 7. Follow-ups done 2026-10-27

The owner asked for open items 1, 2, 4, 5 and 5b. All five are done on this branch, each with tests.

| Item | What changed | Evidence |
|---|---|---|
| 5b. Per-handler RNG sub-streams | `subStreamRng(seed, tick, streamId(name))` in `clock.ts`. Every handler, event handler, med-admin and M&M gets its own stream per tick, keyed by function name (checked unique). **Declared seed break** (ADR-008 Amendment 1, Proposed). | A staff shortage leaves non-poli admissions identical on **12/12** seeds (7/12 on `main`). An extra handler burning state-dependent draws changes nothing else; that test fails with isolation off. `tests/rng-substreams.test.ts` (5) |
| 1. Staff roster + fatigue | `src/agent/roster.ts`: 3×8-h shifts on the calendar clock; 24-h roles rotate in 4 teams (~42 h/week); 3-person roles rotate backwards (no malam → pagi); < 3 staff on call; day roles Mon–Sat. Fatigue recovers off duty. Sickness ~4 mild episodes per person-year, 10% severe, fixed 2 draws/agent/tick; `sakit_ringan` now recovers. DPJP assigned on call, on-duty GP fallback. Also fixed: pregnancy advanced ×60 too fast; menstrual cycle advanced per tick. (ADR-029 Amendment 1, Proposed) | 90 sim-days, 122 staff: absence **2.69%** (target ~2.7%), 3.92 onsets per person-year, max fatigue 478 ticks, 35 on duty on average (min 22). Doctor assignment over the first 600 ticks 1/131 → **131/131**. `tests/roster.test.ts` (12) |
| 2. Ambulance + charge + JR + letter link | Transport chosen on receipt (ALS I21/I50, BLS S72/K35/J15/J44, else own). Road ambulance only within Sulawesi, otherwise `sea_air`. The visit is created at arrival; the letter is completed with the real patient + encounter; the patient carries the referral diagnosis. Referral-only diagnoses no longer collapse to I10. The dispatch is charged once. Letters in transit no longer age out (a 600 km transfer was being returned en route). One JR incident per accident (30-day window, from the accident time), linked to letter + dispatch; JR claims carry `incidentRef`. `/api/ambulance`, `/api/jr-incidents`. (ADR-016 Amendment 1, Proposed) | Seed 42, 900 ticks: 14/14 letters completed (self 6, sea/air 4, ambulance 4); 4 dispatches, all charged (0.2–1.4M IDR); 4 JR incidents over 11 encounters; 4 of 7 JR claims carry `incidentRef`. `tests/referral-transport.test.ts` (10), benchmark rewritten (11) |
| 4. Appointments | Kontrol booked 7 days after every inpatient discharge (alive), at the diagnosis' poli (children to Poli Anak), Mon–Sat 08:00–14:00 slot. 80% attendance; attendees are checked in as outpatient visits and the appointment follows the visit to completion. `getUpcomingAppointments` uses the current tick. `recordDischargePlan` used `Math.random()` (ADR-008 violation); fixed. | `tests/appointments.test.ts` (10). Not yet seen end to end in a full run: the first kontrol falls ~10 sim-days in |
| 5. ADR numbering | `adr/` merged into `docs/adr/` (pointer README left in `adr/`). Collisions: mortality risk engine ADR-004 → **ADR-028**; workforce ADR-017 → **ADR-029** (the ADR the code cites keeps each number); the ADR-009 vision copy is archived. `docs/adr/README.md` index with an old→new citation map; 012, 023 and 026 listed as gaps (026 is cited by tests but was never written). Living docs updated; dated audit records and the paper draft keep their citations, which the map resolves. | 26 ADR files, 0 number collisions |

Also fixed along the way: sick leave, kamar jenazah and appointments were not persisted in snapshots (a resumed world reset them), and the referral letter/patient counters weren't either (resumed letters became `RJL-undefined`).

## 8. Open items, by priority (after 2026-10-27)

1. **JR trigger alignment** (S06 and 192 other accident codes billed to JR without an incident). **S**. Owner decision (M9.3-BLOCKER-DECISIONS §5). On the live server, the unlinked JR claims were S62 (wrist fracture), an M54 poli visit by an accident patient, and **T81 (complication of surgical care)**. `ACCIDENT_ICD_CODES` treats every T code as a road accident, which is not plausible for Jasa Raharja.
2. **Coordinator OC review**: accept or reject ADR-001/002 (Proposed) and ADR-016 Amendment 1 (Proposed); write ADR-026. **S**. (ADR-008 and ADR-029 amendments: accepted by the owner 2026-10-27.)
3. ~~Re-freeze baselines~~ — done 2026-10-27 as `substream-v1` (§9); the 2026-09-10 JAMIA freeze stays read-only.
3b. **E1 no longer measures outcomes**: since `e458f6f` (2026-10-08) inpatient stays last 3–7 days, so a 1,000-tick E1 run records 0 deaths (same on `main`). An outcome baseline needs ≥ 10 sim-days. **S** to run (~1–1.5 h), owner's call.
3c. ~~Per-tick cost grows with state~~ — largely fixed 2026-10-27 (`30d441f`): three O(encounters × orders) scans (AI doctor order index rebuilt per encounter, microbiology open-order check, AI nurse note/med scans). Verified result-neutral: E1 freeze byte-identical, and full-state SHA-256 identical to the old code at 2 and 3 sim-days. 2 sim-days ~364 s → ~81 s; test suite ~5 min → 84 s. Cost still grows with state (charges are never bounded); next hotspots `world.ts` and the AI doctor's remaining per-encounter work. **S–M**.
4. ~~Workforce calibration on Indonesian data~~ — done 2026-10-27 (§9). Still open: the 80% kontrol attendance is not yet calibrated, and annual leave and national holidays are not deducted from the roster. **S** each.
5. **Emergency referrals** (I21, S72…) still arrive as outpatient poli visits, not ED/inpatient admissions. In-city transfers have distance 0 (instant, base cost only). A patient can hold an active inpatient encounter and repeated ED encounters at the same time (seen live: one patient with 5 overlapping encounters). **S–M**.
6. **`HospitalState` split** (Epic VII M7.2). **L**. Needs an ADR.
7. Re-check results that depended on learned rankings or rates (pre-fix learning was inflated ~125×). Research OC.
8. Lockfile / package-manager decision (`npm ci` impossible today). **S**.
9. Small items: non-clinical staff get "Ns." names; outcome-snapshot buffer not reset per world; tautological test assertions; `registerBody`/`recordDischargePlan` still mutate state in place. **S** each.
10. Epic X: not started, as before (deferred by design).

## 9. Owner decisions and calibration, 2026-10-27

**Accepted by the owner:** ADR-008 Amendment 1 (per-handler RNG sub-streams) together with re-freezing the baselines,
and ADR-029 Amendment 1 (roster and workforce health) with calibration on Indonesian data.

**Workforce calibration (Indonesian sources).**

| Parameter | Before | Calibrated | Source |
|---|---|---|---|
| Shifts | 07–15 / 15–23 / 23–07 (8/8/8 h) | **07–14 / 14–21 / 21–07 (7/7/10 h)** | RSUD Dr. Soetomo ER and RSUD Sunan Kalijaga rosters; described as the general hospital rule in an Indonesian nursing thesis |
| Weekly hours (rotating staff) | 42 h | 42 h | UU 6/2023: 40 h/week |
| Mild illness | worked through it | **off duty (izin sakit)** | Indonesian practice: izin sakit means staying home |
| Sick days per person-year | ~2 off duty | **6 target (measured 6.3)**, band 3–12 | WISN staffing studies: 3 (RSU Aulia), 4 (RS Paru Surabaya), 12 (RSUD Wamena ER, measured 2020) |
| Mild episodes per person-year | 4 | **2.5** | derived: 6 days ÷ ~2.4 days per episode |
| Overtime illness threshold | 10 h | **12 h** | above the 10-h malam, so normal night shifts don't cause illness |

Measured over 90 sim-days (seed 42, 122 staff): 6.3 sick days per person-year, 2.69 onsets per person-year, max
fatigue 598 ticks, 33 staff on duty on average (min 22); 131/131 inpatient encounters with doctor and nurse.

No national Indonesian sick-leave statistic was found. The 12-day figure is the only measured one, comes from a COVID
year, and is from Papua. Experiments should therefore vary sick days across the 3–12 band rather than treat 6 as fact.

**Baseline re-freeze:** `docs/experiments/EXPERIMENT-FREEZE-2026-10-27.md` (`substream-v1`), E1 configuration
on commit `ae7b776`, byte-identical across two runs. It is a deterministic regression reference, not an outcome
baseline: the 1,000-tick horizon sees no inpatient discharge or death (open item 3b).
