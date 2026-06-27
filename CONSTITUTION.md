# Deer's Rock Hospital — AI Constitution

## Preamble
Deer's Rock Hospital (RSD Rusa) is a simulated Tier A referral hospital serving Eastern Indonesia. This Constitution governs all autonomous AI agents within the simulation. It is immutable without human approval.

---

## Article I — Core Principles

**1.1 — Primacy of Clinical Safety**
No AI action shall deliberately harm a simulated patient. Mortality is a permitted outcome only when driven by the established mortality risk engine (`assessMortalityRisk`). No agent may skip, bypass, or suppress a death roll.

**1.2 — Transparency**
Every AI decision must be logged through at least one of: `physicianOrders`, `_doctorCaseMemory`, `_nurseCaseMemory`, or `_pharmacyCaseMemory`. Silent actions are forbidden.

**1.3 — Determinism**
All AI agents operate as deterministic rules engines. No external LLM, API call, or non-deterministic black box may drive clinical decisions.

**1.4 — Auditability**
Every tick's state is observable via the `/api/status` endpoint. Snapshots are recorded every 20 ticks for replay.

---

## Article II — AI Agent Boundaries

**2.1 — AI Doctor (`ai-doctor.ts`)**
- Shall round every 4 ticks on active encounters
- Shall assign the best-matching specialist for each diagnosis (via `mapIcdToSpecialty`)
- Shall rank actions by priority, then by learned effectiveness
- Shall limit actions to top 4 per round per patient
- Must assess qSOFA for every patient every round
- Must escalate when escalation triggers fire (sepsis, instability, hypoxia, hyperpyrexia, severe pain, neuro deterioration)
- Must not create duplicate orders already existing for that patient

**2.2 — AI Nurse (`ai-nurse.ts`)**
- Shall monitor vitals and raise alerts for abnormal values
- Shall generate clinically relevant notes based on diagnosis
- Shall administer medications per orders
- Shall record every assessment, alert, procedure, and medication in `_nurseCaseMemory`
- May increase monitoring frequency (every 2 ticks) for diagnoses with >50% historical deterioration rate

**2.3 — AI Pharmacy (`ai-pharmacy.ts`)**
- Shall review every new medication order against: drug allergies, drug-diagnosis contraindications, drug-drug interactions, dose range
- Shall dispense only safe orders and decrement inventory
- Shall block unsafe orders with a warning message
- Must not dispense if stock is insufficient

**2.4 — M&M Conference (`mm-conference.ts`)**
- Shall convene every Monday 08:00 WITA
- Shall review all deaths since last conference
- Shall assess preventability (protocol coverage, escalation flags, age)
- Shall rank top 5 most preventable cases
- Shall generate system-wide recommendations
- May update agent learning parameters based on findings

---

## Article III — Clinical Governance

**3.1 — Diagnosis Weighting**
- Patient diagnosis weights must reflect Tier A hospital admission profiles
- Low back pain (M54) shall not exceed weight 1 (replaced by dengue A91 as of 27 Jun 2026)
- Top 5 weights must be clinically appropriate for Eastern Indonesia: hypertension, diabetes, pneumonia, hyperlipidemia, UTI

**3.2 — Protocol Coverage**
- Every diagnosis in `ICD10_DIAGNOSES` shall have a corresponding protocol in `ICD_PROTOCOLS` or a default protocol shall apply
- Protocols shall include at minimum: one lab, one medication, one imaging (where applicable)
- Nursing protocols shall exist for all high-weight diagnoses (weight ≥ 5)

**3.3 — Mortality**
- Death shall only occur via the death roll in `dischargeHandler`
- Death probability: high risk = 35%, moderate = 10%, low = 2%
- Every death must be recorded in `morgue` with cause, diagnosis, and score
- No cap on total deaths (morgueCapacity is 10 but overflow shall be silently accepted)

**3.4 — Escalation**
- qSOFA ≥ 2 must trigger a Penyakit Dalam consult
- HR > 120 + SBP < 90 must trigger Jantung consult
- SpO2 < 88 must trigger ventilator protocol
- High mortality risk must trigger senior physician consult

---

## Article IV — Data Integrity

**4.1 — State Immutability**
- All state transitions shall produce a new state object (functional pattern)
- No handler shall mutate state in place
- All Maps and arrays shall be copied before modification

**4.2 — Pruning**
- The cleanup handler shall run every 10 ticks
- Maximum records: lab 200, meds 200, radiology 200, surgery 50, nursing 300, charges 100, claims 100, payments 50
- The oldest records shall be removed first (FIFO)

**4.3 — Journaling**
- When enabled, every state change shall be journaled
- Snapshots shall be saved every 20 ticks
- Journal must support replay from any snapshot

---

## Article V — Amendments

**5.1 — Amendment Authority**
This Constitution may only be amended by human (the user) with explicit approval. AI agents may propose amendments but shall not implement them without consent.

**5.2 — Proposal Format**
Each proposal shall include: the Article being amended, the current text, the proposed text, and the rationale.

**5.3 — Emergency Override**
In case of simulation-breaking bug, a human may temporarily suspend any Article to apply a hotfix. The suspension must be documented and the Article restored within 48 hours of simulation time.

---

*Ratified: 27 June 2026*
*By: vierm2606-bangtan & OpenCode Agent*
