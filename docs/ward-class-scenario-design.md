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

1. **KRIS.** Perpres 59/2024 moves BPJS toward a single standard inpatient room. Status and deadlines in 2026 are **not verified** here. If the classes go away, the scenario becomes "standard rooms versus premium rooms".
2. BPJS class entitlement by member tier and the rules for upgrading to a higher class.
3. Minimum share of beds a private hospital must give to the lowest class, if any (**not verified**).
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
