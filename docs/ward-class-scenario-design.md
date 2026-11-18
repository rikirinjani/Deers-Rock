# Ward-class scenario: design (draft, no code changed)

Date: 2026-11-17. Status: draft for owner review. Not an ADR yet.

## 1. Purpose

Let a hospital manager ask "what if we change our room-class mix?" and see the effect on occupancy, diverted patients and income, on the same patient stream. First example from a friend of the owner: 10 Kelas 2 rooms become 5 Kelas 2 plus 10 Kelas 3 rooms to take more BPJS inpatients. This is a scenario and sensitivity tool, not a forecast. No real-hospital validation exists yet.

## 2. What the code does today (read 2026-11-17, not run)

- Ward capacity by class is a list in `src/engine/state-store.ts:193-226` (for example Internal Medicine: kelas-1 4, kelas-2 10, kelas-3 16). Whether it can be set from outside the code is **unverified**.
- Admission picks the first free bed in the specialty's ward, else any free bed (`src/engine/markov.ts:130-133`). The payer is assigned afterwards (`markov.ts:145`). Payer and class are independent.
- Room charge per day uses the class stamped at admission, multipliers kelas-1 x2, kelas-2 x1.5, kelas-3 x1 (`src/engine/finance.ts:96`, `src/engine/billing/indonesia-charges.ts:20-22`), for every payer.
- Admissions per tick are capped by the number of free beds (`markov.ts:120`).
- Not found: payer-to-class routing, BPJS entitlement, spillover, diversion counts, occupancy or revenue by class. How a BPJS claim treats the room charge is **unconfirmed** (claims are paid as INA-CBG packages).

## 3. Design

**3.1 Layout as data.** A scenario supplies a layout: a list of wards, each with a class, a specialty set (one, several, or "general"), a bed count, beds per room, and floor area per bed.

**3.2 One ward per class.** A class ward may serve several specialties (a general Kelas 3 ward). Specialty-specific wards remain only where needed (ICU, NICU, PICU, OBGYN).

**3.3 Routing.** Replace "first free bed" for the scenario path with: (1) pick eligible classes from payer and entitlement, (2) prefer the specialty ward within the class, (3) take a free bed there, (4) if none, apply the spillover rule (up to a higher class, or divert). Every outcome is counted. The routing step may use no extra random draws, so seeds stay comparable across layouts. In the scenario path there is **no fallback into VIP, ICU, NICU or PICU** (today's fallback takes any free bed in the hospital). Today's class fill is also an artifact of key order (each ward fills kelas-1, then kelas-2, then kelas-3), so the baseline run needs a defined class-neutral bed order.

**3.4 Demand and refit.** A refit is a layout change between two runs: beds move from ward A to ward B. Inputs: conversion cost, downtime days, beds lost during works. Correction after Epic X's review: this engine is capacity-driven (a recurring patient pool, admissions capped by free beds, a fixed 3-7 day stay unrelated to class), so extra beds create extra admissions. For a fair comparison the scenario needs a **demand stream independent of beds plus a queue** for patients who cannot be placed; that is a new engine concept (milestone 12.1). Without it, diversion cannot be measured.

**3.5 Money.** Per layout: room revenue by class (self-pay and private insurance), BPJS INA-CBG package revenue, cost per occupied bed-day by class (input, needs a source), refit cost. Output: margin per layout and the occupancy at which two layouts break even.

**3.6 Reports.** Occupancy by class, patients diverted or waiting by class, revenue and cost per bed-day, margin difference between layouts, with a range across seeds.

## 4. Compatibility rule

The current mixed-ward default and its bed order stay unchanged. The class-ward layout is a separate, selectable scenario behind a seam, as the Epic X seams are. Pass condition: the Indonesian default output is byte-identical (E1 runner and the finance golden hashes), checked on Kaggle.

## 5. Open questions (owner or outside source)

1. **KRIS.** Perpres 59/2024 moves BPJS toward a single standard inpatient room. Status and deadlines in 2026 are **not verified against primary text**; secondary sources conflict (see section 15). If the classes go away, the scenario becomes "standard rooms versus premium rooms".
2. BPJS class entitlement by member tier and the rules for upgrading to a higher class. Secondary sources (section 15): voluntary upgrade one class up only, member pays the INA-CBG tariff difference; forced upgrade because the entitled room is full costs the member nothing; PBI and Kelas 3 members cannot upgrade voluntarily. **Still unverified against primary text.**
3. Minimum share of beds a private hospital must give to the lowest class, if any. Secondary sources (section 15) give a KRIS-standard bed share (private at least 40%, government 60%), which is **not** a lowest-class minimum; no lowest-class minimum found. **Still unverified against primary text.**
4. Source for cost per bed-day by class, and for renovation cost.
5. Beds per room and floor area per bed by class.
6. Whether ward capacity is already settable from outside the code.

## 6. Steps

0. Layout input: `createWorld` takes a layout (default `BUILDING_LAYOUT`; today `world.ts:93` passes `{}`), plus a test that the default stays byte-identical (milestone 12.0).
1. Confirm KRIS status and bed-share rules from primary text or a hospital finance officer.
2. Add the data model (class, specialties, rooms, area) and a class-neutral baseline bed order.
3. Add the demand stream and queue (12.1), then routing, spillover and diversion counting for the scenario path only (12.2).
4. Add the money model and per-class reports (12.3). BPJS room revenue may apply only to non-BPJS payers; claims are INA-CBG packages.
5. Regression on Kaggle: default unchanged. Then run the friend's example as a first scenario (12.4).

Epic: this is Epic XII in `ROADMAP.md`, scheduled ahead of Epic X 10.6 to avoid colliding with the package move. Status of section 2 claims: reviewed by the Epic X session on 2026-11-17 against the code; ward capacity is not settable from outside today (`createState(patients, {}, rng)`; the `wardCapacity` argument is a test-only path that makes every bed kelas-3).

## 7. Non-goals

Forecasting a real hospital, using real patient data, changing the default Indonesian layout, or claiming validated results before a backtest on one partner hospital's past aggregates.

## 8. Milestone 12.0 notes (2026-11-17)

Done: `createWorld(patientCount, journalPath, seed, layout?)` and `createState(patients, {}, rng, layout?)` take a `HospitalLayout` (`state-store.ts`: `WardSpec`, `HospitalLayout`). No layout means the old `BUILDING_LAYOUT` path, untouched. Answers open question 6: ward capacity is now settable from outside, for scenarios only.

Corrections and facts for 12.1+:
- Bed ids carry a **hospital-wide** running index, not a per-ward one (`Internal-Medicine-01` ... `Executive-Pavilion-01` is not how it works; for example NICU beds continue the count). A scenario layout changes every later bed id. Do not key anything on bed id across layouts; key on ward and class.
- A layout entry is one class in one ward; a multi-class ward repeats the ward name. `bedOrder: "class-neutral"` interleaves classes inside a ward. With one class per ward (the 12.x scenario) the option has no effect, and fill order across wards is the order of the list.
- `specialties`, `bedsPerRoom`, `areaPerBedM2` are stored on `state._layout` but nothing reads them yet (routing is 12.2, money 12.3). Admission still uses the existing "first free bed in the specialty's ward, else any free bed" (`markov.ts`), so a custom layout whose ward names do not match the specialty ward names falls back to any free bed. That is only acceptable until 12.2.

**12.0 regression (2026-11-17, owner-approved):** Kaggle kernel `hoe-regress-12-0` (dataset `hoe-src-12-0-d11e3bb`, `git archive` of commit `d11e3bb`, paths src, scripts, package.json, tsconfig.json, facts.yaml). E1 `runner.ts 10 1000` run twice: CSV `084024be6e8b9661...` and summary `068b07b2238ecd55...` both times. Finance golden `6f25fe37ac62a6a4`, `a5e2afe343457617`, `05e3e2568db1179f`. All equal to the frozen values: **the Indonesian default is byte-identical after 12.0.**

## 9. Milestone 12.1 design decisions (accepted by the owner 2026-11-17)

Scenario path only; the default path keeps today's patient pool and admission cap, and the E1 and finance-golden hashes must stay byte-identical.

1. **Own random stream.** Demand uses a separate rng stream seeded from the world seed, generated per tick. Bed count and layout can not shift any other draw, so the same seed gives the same demand under every layout.
2. **Queue.** Patients who cannot be placed wait. A wait limit (input, stated default, sensitivity run; no real-hospital figure exists) turns a waiting patient into a diverted one. First come first served; priority later.
3. **Length of stay unchanged** (fixed 3-7 days) in 12.1, so layout is the only variable. Stay by class or specialty is a later calibration item that needs a data source.
4. **New arrival generator** for the scenario path (arrival rate is an input; payer and specialty from the existing patient attributes). It does not draw from the recurring pool, because the pool ties demand back to capacity.

Arrival rate and wait limit have no real data behind them: results are scenarios, not forecasts.

## 10. Milestone 12.1 implemented (2026-11-17)

`createWorld(patientCount, journalPath, seed, layout?, demand?)`; `demand` is `{ arrivalsPerDay (default 19), waitLimitMinutes (default 1440) }`. With it, `state._demand` exists and `admissionHandler` hands over to `scenarioDemandStep` (`src/engine/scenario-demand.ts`); without it that one line is a no-op and the default path is unchanged. The per-patient placement code was moved unchanged from `admissionHandler` into `admitPatientToBed` (`markov.ts`), the only refactor of the default path, so the gate must be re-run.

- Arrivals: one Bernoulli per minute (p = arrivalsPerDay/1440) on the handler's own sub-stream; patient, payer, diagnosis and stay length are drawn at arrival and stored, so the same seed gives identical `arrivalLog` under every layout (tested, 6 beds vs 60).
- Queue: FIFO; waiting longer than the limit counts as diverted (exactly limit + 1 minutes, tested). `arrived = admitted + diverted + queued` always.
- Placement still uses the default rule (specialty ward, else any free bed). Class routing, spillover and the no-fallback-into-VIP/ICU rule are 12.2.
- Stats on `state._demand`: arrived, admitted, diverted, waitMinutesAdmitted, maxQueueLength, arrivalLog, divertedLog.

Facts found:
- Demand patients join `state.patients` once admitted, so the existing outpatient handler also gives them outpatient visits (as it does for any patient). Count inpatient encounters only (`type === "inpatient"`).
- "Same demand" means same arrivals, payer, diagnosis and stay length. Deaths and ancillary orders still draw from their own per-tick sub-streams, so the clinical course is not identical across layouts.
- Occupancy starts empty. With default stays of 3-7 days a layout takes several simulated days to fill, so a scenario needs a warm-up (12.3 reports should drop it).
- The arrival default (19 per day) comes from the existing clinical-v2 calibration comment (about 70% occupancy for 131 beds). It is not real-hospital data.

**12.1 regression (2026-11-17, owner-approved):** Kaggle kernel `hoe-regress-12-1` (dataset `hoe-src-12-1-019f113`, `git archive` of `019f113`, same slim paths). E1 `runner.ts 10 1000` run twice: CSV `084024be6e8b9661...`, summary `068b07b2238ecd55...` both times. Finance golden `6f25fe37ac62a6a4`, `a5e2afe343457617`, `05e3e2568db1179f`. All equal to the frozen values: **the Indonesian default is byte-identical after 12.1 (including the `admitPatientToBed` extraction).**

## 11. Milestone 12.2 implemented (2026-11-17)

Scenario path only (`src/engine/scenario-routing.ts`, used by `scenarioDemandStep`); the default admission path is untouched in 12.2. No random draws in routing.

- **Policy table** (`DemandConfig.routing`, default `DEFAULT_ROUTING`): payer -> classes in order of preference; first = own class, later = spillover up. BPJS Kesehatan and Jasa Raharja and Self-pay: kelas-3, kelas-2, kelas-1. BPJS Ketenagakerjaan: kelas-2, kelas-1. Private Insurance: kelas-2, kelas-1. Unlisted payer (for example US payers): kelas-3, kelas-2, kelas-1. **This table is an assumption, not a verified rule** (open questions 1-3 are still open); it is an input so it can be corrected without code.
- **Inside a class:** a ward that serves the patient's specialty (a "general" ward serves all), else any free bed of the class.
- **No fallback:** no eligible class has a free bed -> the patient waits and the 12.1 wait limit diverts. Nothing outside the table is used, so VIP, VVIP, ICU, HCU, NICU and PICU stay empty unless the table lists them (tested for every payer).
- **Counters on `state._demand`:** `admittedByClass`, `admittedByPayerClass` ("payer|class"), `spilledUp`, `spilledByPath` ("payer|own->used"), `divertedByPayer`.
- Consequence for 12.1: placement is now class-aware, so a layout needs beds in every class a payer may use (a Kelas-3-only layout diverts Private Insurance patients). The 12.1 "ample beds" test was changed to a three-class layout for that reason.
- Not done (12.3): money. Whether a BPJS patient spilled up pays the difference, or the hospital absorbs it, is open and drives the margin result.

**12.2 regression (2026-11-17, owner-approved):** Kaggle kernel `hoe-regress-12-2` (dataset `hoe-src-12-2-687bf80`, `git archive` of `687bf80`, same slim paths). E1 `runner.ts 10 1000` run twice: CSV `084024be6e8b9661...`, summary `068b07b2238ecd55...` both times. Finance golden `6f25fe37ac62a6a4`, `a5e2afe343457617`, `05e3e2568db1179f`. All equal to the frozen values: **the Indonesian default is byte-identical after 12.2.**

## 12. Milestone 12.3 implemented (2026-11-17)

Scenario path only. No change to the default path or to engine admission beyond refit closures (a scenario-only `closures` list in `DemandConfig`, read in `scenarioDemandStep`).

- `src/engine/scenario-money.ts`, `scenarioReport(state, MoneyConfig)`: a pure function of a finished scenario state (no rng). Counts only inside the window after `warmupTicks` (default 7 days): room revenue by class for non-package payers (list price x class multiplier x bed-days, pro-rated by minute); INA-CBG package revenue once at discharge for BPJS Kesehatan and Ketenagakerjaan (BPJS room days earn nothing separately; discharges with no tariff are counted in `bpjsWithoutTariff` and earn 0); cost per **occupied** bed-day by class; one-off refit cost; margin; occupancy, admitted, diverted (total and by payer) and spilled-up counts. Ancillary revenue and cost are excluded: the same patients generate them under any layout, so they cancel in a comparison.
- **Spilled-up BPJS** is an explicit setting `spillRule`: `"hospital-absorbs"` (default, **assumption**: no extra revenue, the hospital pays the higher-class bed cost) or `"patient-pays-difference"` (the patient pays the room price difference per day). The cost of the higher-class bed is the same either way.
- **Refit:** `refitCostIdr` (subtracted from margin) and `closures: [{ roomClass, beds, fromTick, toTick }]` (the last N beds of a class are out of service in that window; free beds only, an occupied bed is not evicted).
- `src/experiment/scenario-compare.ts`: `runScenario`, `runAcrossSeeds` (min, median, max, mean per metric), `compareLayouts` (paired by seed, so identical demand; delta = b minus a). The file's CLI is a tiny smoke run.
- **Not done:** the break-even occupancy between two layouts (section 3.5) and any real run: see the speed note.

**Unsourced inputs** (also returned in every report as `unsourcedInputs`):
1. Cost per occupied bed-day by class (default 0.6 x the list room price): no hospital cost data.
2. `spillRule` default: Indonesian rules on temporary placement in a higher class are not verified.
3. `bpjsClaimPaidShare` default 1: no denial or delay rate applied.
4. `refitCostIdr` and closure windows: no renovation cost source.
5. The routing table (BPJS entitlement by member tier, KRIS, upgrade rules).
6. Arrivals per day (19) and the wait limit (1440 min): calibration comment only.
7. Room list price (350,000 IDR x multiplier) and INA-CBG tariffs: engine tables, not checked against current Kemenkes tariffs.
8. Stay length 3-7 days regardless of class.

**Speed note (measured):** the full handler stack is slow. About 2,900 ticks (2 simulated days) took roughly 30 s per run in the unit-test environment, and run time grows with the number of patients and encounters. A real comparison (20+ days, several seeds, two layouts) is a Kaggle or VPS job, as the owner rule says; do not run it on the laptop. A lighter scenario engine (skipping unrelated handlers) would be a follow-up if comparisons become routine.

**12.3 regression (2026-11-17, owner-approved):** Kaggle kernel `hoe-regress-12-3` (dataset `hoe-src-12-3-2b390db`, `git archive` of `2b390db`, same slim paths). E1 `runner.ts 10 1000` run twice: CSV `084024be6e8b9661...`, summary `068b07b2238ecd55...` both times. Finance golden `6f25fe37ac62a6a4`, `a5e2afe343457617`, `05e3e2568db1179f`. All equal to the frozen values: **the Indonesian default is byte-identical after 12.3.**

## 13. Milestone 12.4 results (2026-11-17): SCENARIO AND SENSITIVITY, NOT A FORECAST

Full tables, assumptions and the 36-setting sensitivity grid: `docs/experiments/EPIC-XII-12-4-RESULTS-A-vs-B.md` (the owner's example) and `docs/experiments/EPIC-XII-12-4-RESULTS-A-vs-C.md` (bed-matched). Kaggle kernel `hoe-grid-12-4c`, 360 runs (3 layouts x 6 arrival rates x 20 seeds), 28 simulated days with 7 days warm-up dropped, paired by seed and rate (arrival digests identical). Commit `4d1dd22`. Raw run files (11 MB, JSON) are NOT in the repo: the durable copy is the output of Kaggle kernel `hoe-grid-12-4c` plus a local copy in the owner's session notes folder (`epic-xii-12-4-runs`). The sensitivity pages were rebuilt from those files after adding flat-cost settings (no rerun).

**Layouts.** A = 10 K2 rooms x 2 beds = 20 K2 beds. B = 5 K2 rooms x 2 + 10 K3 rooms x 4 = 10 K2 + 40 K3 beds (**2.5 times A's beds**). C = 10 K2 + 10 K3 beds (bed-matched to A; not the owner's example). Beds per room (K2 = 2, K3 = 4) were chosen by the owner and have no source. Each is a standalone general ward.

**Findings (default money settings; all unsourced inputs apply):**
1. **A vs B is mostly a capacity effect.** B has more beds, so it admits more and diverts fewer patients at every rate: margin difference B minus A from +17M IDR (2 arrivals/day) to +638M IDR (14/day) over the 21-day window, BPJS diversions down by up to about 120 per run. A is already at about 90% occupancy at 4 arrivals/day. This says "more beds earn more", not "this class mix is better".
2. **Bed-matched (A vs C) isolates the class mix and shows no robust effect.** Occupancy, admissions and diversions are almost identical (median diversion difference 0 at every rate). The default-settings margin gain of C over A (about +15 to +34M IDR per 21 days) is the cost placeholder itself: cost per bed-day is 0.6 x list price, so a Kelas 2 bed-day "costs" 315k and a Kelas 3 one 210k, and in A the BPJS patients sit in Kelas 2. With a FLAT cost per bed-day (same for both classes, 250k or 350k) the median difference falls to about zero (-3 to +12M IDR, seeds disagreeing in sign) and with spilled-up BPJS paying the room price difference it turns negative (about -20 to -35M IDR). Conclusion: under spill-allowed routing, the class mix at equal capacity changes margin only through the unsourced cost-by-class and spill-rule inputs, not through demand.
3. **The sign depends on unsourced inputs.** Counted per spill rule over 30 settings each (cost mode x non-room cost x non-room revenue; recounted 2026-11-18 after separating the rules): A vs B, hospital-absorbs: 12 of 30 settings cross zero, none materially (the crossings are a million or two at 2 arrivals/day under flat cost); patient-pays-difference: 30 of 30 cross zero, all materially (A leads at low demand, B at high). A vs C, hospital-absorbs: 12 of 30 cross zero, none materially; patient-pays-difference: 9 of 30 cross, 5 materially. So B is ahead everywhere unless spilled-up BPJS patients pay the room price difference; the cost mode (list-price ratio or flat) and the spill rule decide the sign; non-room cost and revenue per admission are second order here.
4. **Break-even.** At default settings there is no crossing in the tested range for either comparison. Where a crossing exists (pay-difference rule), it is near 4 arrivals/day for A vs B (A's occupancy about 90% there, seeds disagree around it). For A vs C a printed crossing sits between cells where seeds disagree on the sign: treat it as no reliable crossing.

**Routing was held fixed** at DEFAULT_ROUTING (BPJS and Self-pay may spill up into Kelas 2), so the findings above are conditional on spill-allowed routing. The strict reading (each payer only its own class) is section 14 and the rule-aware reading is section 16. Under the pay-difference rule, A's lead comes from every spilled-up BPJS patient paying the difference in a ward that has no Kelas 3.

**What this does not show.** Real costs, tariffs, BPJS entitlement, refit cost and downtime (set to zero), the rest of the hospital, any validation against a real hospital. A manager would need real cost per bed-day by class and the real room-to-bed conversion before using any number here.

**Method notes.** The full handler stack proved unusable beyond a few simulated days (Kaggle pilot: day 1 about 27 s, day 5 about 7 min, same for every layout and rate; 4 runs hit the 25-minute cap at day 5), so 12.4 runs on the lite scenario world (`src/experiment/scenario-lite.ts`: only `admissionHandler`; tested identical to the full world for admissions, diversions and demand over half a day). Money is computed from an admission ledger because the engine prunes old encounters. Pilot kernels `hoe-pilot-12-4` and the first grid `hoe-grid-12-4` and the datasets `hoe-src-12-4-*` are private and can be deleted. Keep `hoe-grid-12-4c` (its output is the durable copy of the runs) until the run files are stored elsewhere.

## 14. Milestone 12.4 follow-up: strict routing (2026-11-17), SCENARIO AND SENSITIVITY, NOT A FORECAST

Same grid, seeds and lite world as section 13 (Kaggle kernel `hoe-grid-12-4s`, commit `42f2290`, 360 runs), with `STRICT_ROUTING`: each payer may use only its own class (BPJS Kesehatan, Jasa Raharja and Self-pay: Kelas 3; Private Insurance and BPJS Ketenagakerjaan: Kelas 2), no spillover. Pages: `docs/experiments/EPIC-XII-12-4-RESULTS-A-vs-B-STRICT.md` and `-A-vs-C-STRICT.md`. Raw runs: kernel output and a local copy in the owner's notes folder (`epic-xii-12-4-runs-strict`). Same unsourced inputs and caveats as section 13.

**Findings:**
1. **Layout A (10 Kelas 2 rooms only) cannot place BPJS Kesehatan, Jasa Raharja or Self-pay patients at all under strict routing**, because it has no Kelas 3. It admits only the Private and BPJS Ketenagakerjaan patients: median admissions 6 to 42 per 21 days across the rates against 39 to 77 in the bed-matched C, and essentially all BPJS Kesehatan arrivals are diverted (median 35 per run at 2 arrivals/day, 231 at 14/day). This reading of the owner's premise ("more BPJS inpatients") is harsh by construction, not tuned.
2. **B and C beat A at every rate, with no sign change in any of the 60 money settings** (0 of 60 for both comparisons). At equal capacity (C minus A) the median margin difference is +144 to +216M IDR per 21 days at default settings and the seeds agree on the sign; with flat cost per bed-day it is about the same (+168 to +208M IDR), so unlike the spill-allowed run the result does not hinge on the cost placeholder.
3. **Contrast with section 13.** Whether adding Kelas 3 beds matters depends almost entirely on whether BPJS patients may use Kelas 2 when their own class is not available (unverified, design doc open questions 1-3). With free spill-up the class mix at equal capacity is worth about nothing; with no spill-up it is worth about 40 to 50 occupancy points at moderate demand. A real hospital lies between the two readings. Which one applies is the single most valuable fact to find out before anyone uses these numbers.
4. **Break-even:** none (B and C are ahead at every tested rate). Occupancy of B reaches 91-97% at 10-14 arrivals/day, where B itself starts diverting (up to 83 patients per run).
5. **Not covered:** same as section 13 (real costs, tariffs, entitlement, refit cost and downtime, the rest of the hospital); a mixed table (BPJS may spill into Kelas 2 only for some tiers) was not run.

## 15. KRIS and regulation note (2026-11-18). SECONDARY SOURCES ONLY (news and aggregator sites), NOT PRIMARY TEXT

The owner's session relayed the facts below from news and aggregator pages. None was checked against the primary legal text (Perpres, Permenkes, Kemenkes circulars). Treat all of it as unconfirmed.

- **(a) KRIS deadline and status.** Perpres 59/2024 required KRIS (Kelas Rawat Inap Standar) by 30 June 2025; the Health Minister proposed an extension to 31 December 2025. 2026 status is **conflicting**: January 2026 sources say the classes were not officially removed and iuran stayed class-based; August 2026 aggregator sites say the rollout is phased over two years with no new iuran as of 2 August 2026. Unconfirmed.
- **(b) Bed standards.** Private hospitals: at least 40% of beds to KRIS standard; government hospitals 60%. Maximum 4 beds per room, 1.5 m between beds. This is a KRIS share, **not** a minimum for the lowest class. (Layout B's Kelas 3 rooms of 4 beds sit exactly at the 4-bed maximum; a denser room, such as the 6-bed option the owner did not choose, would break it.)
- **(c) Upgrades.** Voluntary upgrade one class up only, member pays the INA-CBG tariff difference (Permenkes 51/2018 art 10(5)). Forced upgrade because the entitled room is full costs the member nothing. PBI and Kelas 3 members cannot upgrade voluntarily (Perpres 59/2024).
- **If KRIS applies fully** the scenario becomes "standard rooms versus premium rooms" rather than Kelas 1/2/3. The 12.x engine models classes, so a KRIS reading needs a new routing table (standard versus premium), not new code.

**How this is used in the model.** The rule-aware routing variant (section 16) implements (c) only as a forced one-class-up spill with the hospital absorbing the cost (voluntary upgrade out of scope). It splits BPJS Kesehatan members into entitlement tiers (PBI in Kelas 3) with an **unsourced placeholder mix**. Nothing here implements (a) or (b).

## 16. Milestone 12.4 follow-up: rule-aware routing (2026-11-18), SCENARIO AND SENSITIVITY, NOT A FORECAST

Routing built from the rules in section 15 (secondary sources, unverified): BPJS Kesehatan members are split by entitlement tier (PBI counted in Kelas 3) using an **UNSOURCED placeholder mix**; each tier uses its own class first and is moved at most one class up when its class is full (K3 to K2, K2 to K1, K1 stays in K1, no VIP); the hospital absorbs the cost; voluntary upgrade is out of scope; other payers follow the default table. The tier is a zero-rng hash of the patient id. Three placeholder mixes for K3 (PBI included) / K2 / K1: 70/20/10, 85/10/5, 50/30/20. Same grid, seeds and lite world as sections 13-14: Kaggle kernel `hoe-grid-12-4r` (1080 runs, commit `1bb8244`; the report CLI was fixed afterwards and the pages rebuilt locally from the run files). Pages: `docs/experiments/EPIC-XII-12-4-RESULTS-A-vs-B-RULE-<mix>.md` and `A-vs-C-RULE-<mix>.md`. All ten result pages (spill-allowed, strict, three rule-aware mixes, each A vs B and A vs C) were rebuilt with the final builder from the stored run files on 2026-11-18, so they share one format and flip-count method. Raw runs: `runs.tar.gz` in the owner's notes folder (`epic-xii-12-4-runs-rule-aware.tar.gz`) and the kernel output.

**Findings (default money settings, medians; all unsourced inputs apply):**
1. **Rule-aware routing lands close to the spill-allowed reading, not the strict one.** Forced upgrade K3 to K2 lets layout A, which has no Kelas 3, take the K3-tier BPJS members into its Kelas 2 beds, so A still admits most BPJS demand. At equal capacity (A vs C) the median margin difference is small (+8 to +30M IDR per 21 days) with seeds disagreeing on the sign at several rates (85/10/5 at 4/day is all positive); diversions and occupancy differ by about zero.
2. **A vs B stays mostly a capacity effect (B has 2.5 times A's beds).** The margin difference B minus A at 10 arrivals/day is about +497M IDR (85/10/5), +395M (70/20/10) and +234M (50/30/20), against +535M (spill-allowed) and +797M (strict). The mix effect has two parts: a larger K2 share works through A's Kelas 2 beds, which serve those members; and **the K1 share is removed demand in every layout** (finding 4), so it lowers the margin of all of them. The two are not separated here; a mix with zero K1 would separate them (not run; the owner's call).
3. **Sign flips, counted for hospital-absorbs only** (a forced upgrade costs the member nothing, so the pay-difference rows are not run; 30 settings per page): A vs B, 12 of 30 settings cross zero in each mix, none materially (above +5M and below -5M IDR in different rates). A vs C: 12 of 30 (50/30/20, all material), 12 of 30 (70/20/10, none material), 8 of 30 (85/10/5, none material). Only the 50/30/20 mix at equal capacity shows a material sign change.
4. **K1 tier is removed demand.** No tested layout has Kelas 1 beds, so the K1 share (5 to 20 percent of BPJS Kesehatan) is never placed and is diverted in A, B and C alike; it cuts BPJS demand in every layout. Check on real runs (layout B, 2 arrivals/day, all seeds): the placed K3:K2 split and the diverted K1 share match the mixes (70/20/10: K3 71.0, K2 18.2, diverted K1 10.7 percent; 85/10/5: 85.4, 8.8, 5.8; 50/30/20: 52.3, 28.2, 19.5). This does not change the A-versus-C comparison, but it makes the rule-aware absolute margins lower than the spill-allowed ones for a reason unrelated to the layout.
5. **Ordering of the three routing readings** (B versus A margin at 10/day): strict > spill-allowed > rule-aware, but the rule-aware gap carries the K1 demand cut, so it is not a pure routing effect. Which reading is closest to practice is unknown; sections 5 and 15 list what to verify.
5. **Not covered:** voluntary upgrade; Kelas 1 and VIP beds in the layouts; the tier mix of a real hospital; KRIS standard-versus-premium rooms; refit cost and downtime; validation against any real hospital.

**Regression on HEAD (2026-11-18, owner-approved):** Kaggle kernel `hoe-regress-gate-head` (dataset `hoe-src-gate-f39651d`, `git archive` of `f39651d`, the HEAD after 12.2, 12.3, 12.4, strict and rule-aware routing; slim paths src, scripts, package.json, tsconfig.json, facts.yaml). E1 `runner.ts 10 1000` run twice: CSV `084024be6e8b9661...`, summary `068b07b2238ecd55...` both times. Finance golden `6f25fe37ac62a6a4`, `a5e2afe343457617`, `05e3e2568db1179f`. All equal to the frozen values: **the Indonesian default is byte-identical at `f39651d`.**

## 17. Standard routing, small Kelas 1 ward and break-even analysis (2026-11-18), SCENARIO AND SENSITIVITY, NOT A FORECAST

**What changed (owner instruction 2026-11-18, KRIS skipped for now).** Rule-aware routing (section 16: BPJS Kesehatan by entitlement tier, PBI in Kelas 3, own class first, forced spill one class up, hospital absorbs) is now the standard scenario setting of the runner; spill-allowed (section 13) and strict (section 14) stay as labelled sensitivities. The tier mix is an **UNSOURCED placeholder** and no mix is crowned: every page exists for 70/20/10, 85/10/5 and 50/30/20 (Kelas 3 incl. PBI / Kelas 2 / Kelas 1). Layouts A, B, C (no Kelas 1 beds) and A1, B1, C1 (the same plus an identical **4-bed Kelas 1 ward, an ASSUMPTION**, 2 rooms x 2 beds). On the owner's choice the Kelas 1 beds are **reserved for the K1 tier** (no other payer or tier spills into them), because a local check showed an open 4-bed ward saturating at 10 arrivals/day and being crowded out unevenly by spillover. Run: Kaggle kernel `hoe-grid-12-4k`, 2,880 new runs, plus the earlier runs; 20 seeds; rates 1, 2, 3, 4, 4.5, 5, 5.5, 6, 8, 10, 14 per day (finer around 4 to 6, where A saturates); 28 days, 7 warm-up days dropped; lite world. Pages: 16 files `docs/experiments/EPIC-XII-12-4-RESULTS-*.md` (rule-aware x 3 mixes x {A,B,C vs A1,B1,C1 variants}, plus spill-allowed and strict, which stay on the coarse six-rate grid). Raw runs: tarballs in the owner's notes folder and kernel outputs.

**New inputs and tools.** `fixedCostPerAvailableBedDayIdr` (staffing, utilities and upkeep of beds that exist occupied or not; applied to every open bed-day, closed beds excluded; **UNSOURCED**, default 0 in the model, swept 0 to 200k IDR in the break-even section, zero in the main tables so earlier numbers stand); run records now keep the routing key per arrival and diversion and the closures; `layout-12-4-breakeven.ts` (crossing finder, reliability rule, fixed-cost break-even, payback). **Reliability rule (fixed in code before results):** a crossing is reliable only if the median curve has exactly one zero crossing and at least 80 percent of seeds have the median's sign at both bracketing rates; otherwise "no reliable crossing". Bootstrap resamples whole seeds, all rates together. Payback = (refit cost + downtime loss) / daily margin gain, "never" when the gain is not positive; **refit cost (50, 150, 300M IDR) and downtime (14, 30, 60 days) are UNSOURCED placeholders**, and the downtime loss is arithmetic, not a simulated closure.

**Findings** (default money settings otherwise; all unsourced inputs apply; numbers for the three mixes are quoted as ranges):
1. **The Kelas 1 ward does not change any paired comparison.** Because its beds are reserved, A1 vs B1 and A1 vs C1 give the same paired margin and diversion differences as A vs B and A vs C (checked on the paired-difference tables; the break-even tables match). Only the occupancy-point differences shrink, because the ward adds the same beds to both denominators. It changes absolute margins and diversions only. The distortion the owner worried about (K1-tier BPJS always diverted) therefore cancels in comparisons; it still matters for any absolute figure. At 10 arrivals/day, though, the 4-bed ward is saturated (placed 25 to 52 of 119 K1-tier arrivals in the local check), so absolute K1 figures are still limited by the assumed ward size.
2. **Break-even fixed cost (A vs B, B has 2.5 times A's Kelas 2/3 beds).** F* = margin difference at zero fixed cost divided by the 630 extra open bed-days. For 70/20/10, median F* per bed-day: 10k IDR at 1/day, 18k at 2, 37k at 4, 92k at 5, 214k at 6, 393k at 8, 627k at 10, 940k at 14 (ranges across seeds are wide at low demand, for example 8k to 109k at 4/day). So B beats A only if fixed cost per available bed-day is below that line: at plausible placeholders of 50 to 200k, B is behind A at about 4 arrivals/day or less and ahead above about 6. For equal-bed pairs (A vs C) fixed cost cancels: no break-even fixed cost by construction.
3. **Break-even demand (A vs B, rule-aware).** At F = 0 there is no crossing: B is ahead at every rate. At F = 50k, 100k, 200k the median curve crosses at about 4.0 to 5.3, 4.6 to 5.9 and 5.4 to 7.6 arrivals/day across the three mixes. **None of these meets the 80 percent rule** (seeds agree at the bracketing rates only 50 to 100 percent, often 55 to 75), so the result is "no reliable crossing" by the rule; the per-seed crossings are spread wide (for 70/20/10 at 100k: 3.8 to 6.2, median 5.1; bootstrap 95% over seeds 4.6 to 5.3, which is tighter than the seed spread because it describes the median). Occupancy at the crossing is about 81 to 92 percent for A and 37 to 50 percent for B. Read this as "the layouts trade places between roughly 4 and 7 arrivals/day, depending on fixed cost and mix", not as a precise rate. Under spill-allowed routing (coarse grid) one reliable crossing exists, at F = 200k: 4.98/day (bootstrap 4.70 to 5.26, A 95 percent and B 48 percent occupied); under strict routing there is no crossing at any F (B ahead everywhere, A cannot place BPJS Kesehatan patients without a Kelas 3).
4. **Equal capacity (A vs C): no crossing at any routing and no fixed-cost effect.** C is ahead of A in the median at every rate, by small amounts (about 0.3 to 1.1M IDR per day), with seeds disagreeing; refit payback at the central placeholder (150M IDR, 30 days) is 350 to 690 days with "never" in up to 5 of 20 seeds (70/20/10, F is irrelevant for equal beds), over the placeholder grid roughly 150 to 1,370 days. Together with section 13 this says: at equal capacity the class mix is worth little and its sign rests on the unsourced cost-by-class inputs.
5. **Refit payback for A to B (70/20/10, central 150M and 30 days).** At F = 0: 322 days at 4/day, 141 at 5, 62 at 6, 34 at 8, 22 at 10, 14 at 14. At F = 100k: never at 4/day and below (the daily gain is negative), 118 days at 6/day (never in 2 of 20 seeds), 45 at 8, 26 at 10, 16 at 14. The payback is dominated by whether demand is above the break-even and by the fixed cost placeholder; it is not an investment estimate.
6. **What the results are NOT:** a forecast, a recommendation, or validated against any hospital. Every figure rests on unsourced inputs: tier mix, Kelas 1 ward size, fixed cost per bed-day, cost per bed-day by class, refit cost and downtime, arrival rates, stay length, tariffs, beds per room.

**Not covered.** KRIS (skipped by the owner for now), voluntary upgrade, a finer Kelas 1 ward size sweep, a mix with no Kelas 1 members, refit cost and downtime inside the simulation (only arithmetic), the rest of the hospital.
