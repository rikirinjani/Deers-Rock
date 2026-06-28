# Healthcare Operating Environment (HOE) — Research Program

**Author:** Paper OC
**Last updated:** 2026-06-28
**Canonical location:** `docs/papers/deers-rock-platform-paper.md`
**Status:** Pre-data. Introduction, Related Work, and System Architecture written. Two philosophical pillars integrated (self-critique + counterfactuals). Results placeholder still requires experimental data before submission.

---

## Core Thesis

An event-driven Healthcare Operating Environment where healthcare software, AI agents, and operational policies can be executed, replayed, and evaluated against a persistent simulated world.

---

## Design Principles

1. **The world owns time.** The simulation clock is absolute. No module advances time.
2. **Everything is an event.** No silent state changes. Every transition is recorded.
3. **State is derived from events.** The journal is the source of truth. State is a materialized view.
4. **Modules communicate only through events.** No direct inter-module calls. No shared mutable state.
5. **AI is replaceable.** Rule-based today, RL tomorrow, LLM-based the day after. The platform accepts all of them.
6. **Determinism before intelligence.** Same seed + same input = same output. Intelligence is layered on top of determinism, not instead of it.
7. **APIs expose behavior, not storage.** External systems interact through endpoints, not database access.
8. **Replay is a first-class capability.** Any tick in any simulation can be reconstructed and inspected.
9. **Simulation as self-critique.** Reports are instruments that expose assumptions. Unexpected behavior is a hypothesis, not a bug.
10. **Counterfactuals by construction.** Every snapshot is a point of rewind — a fork in history where a different decision can be tested. Branching is not a feature added later; it emerges naturally from deterministic seeds and snapshot persistence.

---

## The Platform Distinction

- **HOE** = the platform and runtime.
- **Deer's Rock** = the flagship reference hospital simulation built on top of it.

Same relationship as Kubernetes ↔ one deployed application, Unreal Engine ↔ one game, Gazebo ↔ one robot world, CARLA ↔ one driving town.

The hospital is the reference implementation of a Healthcare Operating Environment, demonstrating how domain-specific modules can execute within a shared deterministic world.

---

# Paper 1 — Deer's Rock Platform Paper

## Title

*Deer's Rock: A Persistent Event-Driven Healthcare Operating Environment for Reproducible AI and Policy Experimentation*

## Audience

Cross-disciplinary: regulators (reproducibility), ML/AI researchers (agent experimentation), health informaticians (FHIR interoperability), clinical educators (replay-based training).

## Core Claims

1. **Reproducible** — same seed + same policy = same outcome trajectory (deterministic tick engine + SQLite journal + snapshot system)
2. **Comprehensive** — 9 specialized departments, 30+ agent roles, 40 ICD-10 diagnoses, 22-medication formulary, 7 disaster scenarios
3. **Agent-native** — built-in experimentation loop (diagnosis -> actions -> outcomes -> memory -> improved decisions). Agents are pluggable: rule-based today, RL tomorrow, LLM-based the day after.
4. **Resilient** — stochastic disaster scenario engine with 7 event types (earthquake, tsunami, pandemic, etc.) each with 4-phase lifecycle affecting surge, mortality, supply, infrastructure
5. **Interoperable** — FHIR R4 is not a feature, it's an adapter. Simulation produces ground truth -> FHIR -> any external HIS can connect to a living hospital.

## Abstract

> **Background:** Healthcare simulation research lacks platforms that combine persistent deterministic replay, agent-native experimentation, cultural contextualization, and health system interoperability in a single open-source framework. Existing simulators trade off reproducibility for breadth, or clinical depth for AI flexibility. More fundamentally, they treat simulation outputs as end products rather than instruments that expose the assumptions of the underlying model.
>
> **Objective:** We present Deer's Rock, a reference implementation of the Healthcare Operating Environment (HOE) — an event-driven platform where AI agents, clinical policies, and health information systems can be executed, replayed, and evaluated against a persistent simulated world. The platform is designed not merely to generate outputs, but to reveal its own assumptions through those outputs.
>
> **Methods:** The platform centers on a deterministic tick engine, an append-only SQLite event journal, and a modular handler chain that composes independent clinical modules. It models a full Tier A referral hospital in Eastern Indonesia — 9 specialized departments, 30+ agent roles, 40 ICD-10 diagnoses, a 22-drug formulary, and a stochastic scenario engine covering 7 disaster types. Unlike existing simulators, the calendar engine generates culturally-contextualized patient influx: Lebaran burn injuries, Ramadan fasting-related hypoglycemia, and seasonal agricultural poisonings — events that stress-test clinical capacity in ways generic simulators cannot. A FHIR R4 adapter exposes simulation ground truth to external health information systems.
>
> **Results:** We demonstrate three properties: (1) reproducibility — identical seeds produce identical outcome trajectories; (2) comprehensiveness — the platform sustains simultaneous operation of all departments, agents, and disaster scenarios within a single deterministic run; (3) interoperability — external HIS consumers can connect to the live simulation via FHIR R4 endpoints and validate against verifiable ground truth.
>
> **⚠️ DRAFT NOTE (Paper OC):** The Results paragraph above is a structural placeholder. It must be rewritten with actual experimental data (seed runs, distributions, convergence metrics) before submission. Do not submit in current form.
>
> **Conclusions:** Deer's Rock establishes a new category of healthcare simulation platform — one where the architecture, not the algorithm, is the contribution. By treating simulation as self-critique, the platform generates reports that expose their own modeling assumptions, enabling reproducible policy experiments, AI agent benchmarking, and health information system validation that no existing tool supports in combination.

## Manuscript — Draft Sections

### 1. Introduction

Healthcare simulation has become indispensable for policy analysis, AI agent development, and health information system validation. Simulators allow researchers and policymakers to ask counterfactual questions — what happens to bed occupancy during a tsunami? How does a change in antibiotic prescribing policy affect mortality? — without risking patient harm. However, existing simulation platforms share a fundamental limitation: they treat simulation outputs as end products rather than instruments that expose the assumptions of the underlying model.

When a hospital simulation produces unexpected results — persistent bed saturation, mortality spikes, supply shortages — the natural response is to treat the output as a bug. But unexpected behavior is not automatically an error. It is a hypothesis. It reveals that some modeling assumption (admission rate, length-of-life distribution, staff allocation) does not match reality. The most valuable simulations are those that make their own assumptions visible.

This principle — simulation as self-critique — drives the design of the Healthcare Operating Environment (HOE). HOE is not a simulator in the traditional sense. It is an event-driven platform where healthcare software, AI agents, and operational policies can be executed, replayed, and evaluated against a persistent simulated world. The platform is built on a deterministic tick engine, an append-only event journal, and a modular handler architecture. Every state transition is recorded. Every simulation can be replayed from any point. The journal is not a debugging aid — it is the source of truth from which state is derived.

A second principle follows from the first: counterfactuals by construction. Because the platform is seeded and deterministic, every snapshot is a point of rewind — a fork in history where one variable can be changed while holding everything else constant. Branching timelines emerge naturally from the architecture; they are not grafted on later. This transforms the simulation from a tool that answers "What happened?" into one that answers "What would have happened if we had made a different decision?"

We present Deer's Rock, an open-source reference implementation of HOE that models a full Tier A referral hospital in Makassar, Eastern Indonesia. Deer's Rock integrates 9 specialized departments, 30+ AI agent roles, 40 ICD-10 diagnoses, a 22-drug formulary, and a stochastic disaster scenario engine covering 7 event types. Critically, it includes a calendar engine that generates culturally-contextualized patient influx — Lebaran burn injuries from firecrackers, Ramadan fasting-related hypoglycemia, seasonal agricultural poisonings — events that stress-test clinical capacity in ways generic simulators cannot.

The paper makes three contributions. First, we describe the architecture of a healthcare operating environment designed for reproducibility, modular composability, and assumption transparency. Second, we demonstrate that the platform produces deterministic trajectories across multiple seeded runs, establishing a foundation for reproducible policy experiments. Third, we show that the platform can serve as an interoperability testbed via FHIR R4 adapters, enabling external health information systems to consume simulated ground truth.

The remainder of the paper is organized as follows. Section 2 surveys related work. Section 3 describes the system architecture. Section 4 details key components. Section 5 establishes reproducibility guarantees. Section 6 presents demonstration results. Section 7 discusses use cases. Section 8 addresses limitations.

### 2. Related Work

**Hospital simulation platforms.** General-purpose simulation frameworks such as SimPy [1] and AnyLogic [2] have been widely used for healthcare modeling. SimPy provides process-based discrete-event simulation in Python but lacks built-in support for deterministic replay, modular domain handlers, or healthcare-specific data models. AnyLogic offers multi-method simulation (discrete-event, agent-based, system dynamics) and has been applied to emergency department crowding [3] and operating room scheduling [4]. However, AnyLogic is proprietary, its agent-based capabilities are general-purpose rather than healthcare-specific, and it does not provide an event-sourced journal for reproducible replay. MedModel [5] is purpose-built for healthcare simulation but is also proprietary and limited to discrete-event modeling. None of these platforms embed AI agents that learn from outcomes, model culturally-contextualized patient generation, or expose FHIR-compliant data for external system integration.

**AI and reinforcement learning benchmarks.** The need for standardized healthcare AI benchmarks has produced several simulation environments. KCH (Kybland Central Hospital) [6] and Medical Gym [7] provide RL environments for clinical decision-making tasks such as sepsis management and ventilator weaning. HiPhy [8] offers a hybrid physics-ML simulation for physiological modeling. These environments are valuable for algorithmic research but focus on isolated clinical tasks — antibiotic selection, fluid resuscitation — rather than full hospital operations. They do not model departmental workflows, supply chains, staffing, or disaster scenarios. Deer's Rock differs by embedding AI agents within a persistent, multi-department hospital that continues to operate across all clinical areas simultaneously, enabling questions that cross departmental boundaries.

**Digital twin platforms.** Healthcare digital twin initiatives have gained momentum. The NHS DIGIT programme [9] explores digital twins for hospital operations management. Siemens Healthineers has developed hospital digital twin prototypes for workflow optimization [10]. These efforts are organization-specific, tied to particular hospital data, and generally not open-source. They are calibrated to a specific facility and cannot be freely modified or redistributed. Deer's Rock is designed as an open-source, generalizable platform that ships with a reference locale pack — Eastern Indonesia — but can be adapted to other regions through its modular architecture.

**The gap.** No existing platform combines five properties that we argue are essential for next-generation healthcare simulation: (1) persistent deterministic replay, (2) culturally-contextualized patient generation, (3) modular composability of clinical departments, (4) native AI agent experimentation, and (5) FHIR-compliant interoperability for external system testing. Deer's Rock is designed from the ground up to provide all five.

**References placeholder** — full reference list to be added before submission.

### 3. System Architecture

Deer's Rock is built on three architectural foundations: a deterministic tick engine, an append-only event journal, and a modular handler chain.

**Tick engine.** The simulation advances in discrete ticks at a fixed rate of 1 tick per second real-time, where each tick represents 1 simulated minute. At this speed, 24 minutes of real time simulate one full hospital day, and 30 days of real time simulate approximately 5 years of hospital operations. The clock is the authoritative timekeeper — no module may advance or delay it. This guarantees that temporal ordering is deterministic across runs.

**Event journal.** Every state transition is recorded in an append-only SQLite journal. The journal stores the tick number, timestamp, event type, entity type, entity identifier, and a JSON payload containing the event's details. Snapshots of the full hospital state are serialized every 20 ticks, enabling replay from any checkpoint. The journal is not a debugging aid — it is the source of truth. The current `HospitalState` is a materialized view derived from applying journaled events to the nearest snapshot. This design mirrors event sourcing and command query responsibility segregation (CQRS) patterns from distributed systems, adapted to a single-process simulation context.

**Handler chain.** Each tick processes the current state through a pipeline of 35 handler functions, each responsible for a specific domain. Handlers are pure functions that receive the current `HospitalState`, `Clock`, and `EventQueue`, and return a new state. Handlers do not communicate directly — they share state only through the `HospitalState` object passed through the chain. This functional, immutable pattern ensures that handlers can be added, removed, or reordered without side effects across modules. The execution order is specified in `buildHandlers()` and includes: admission, outpatient, new patient, agent, referral, scenario, emergency, lab, pharmacy, nursing, doctor, radiology, surgery, respiratory, dietary, social work, blood bank, microbiology, pathology, CSSD, biomedical engineering, infection control, clinical nutrition, radiotherapy, dialysis, central supply, medical records, specialty, billing, vitals, ICD tracking, outcome recording, learning, and cleanup.

### 4. Key Components
- 4.1 — Patient generation & markov admission/discharge
- 4.2 — 9 specialized departments
- 4.3 — AI clinical agents: Doctor, Nurse, Pharmacist
- 4.4 — Agent learning loop & outcome tracking
- 4.5 — Disaster scenario engine (7 types, 4-phase lifecycle)
- 4.6 — M&M conference & preventability assessment
- 4.7 — FHIR R4 adapter layer
- **4.8 — Calendar engine & culturally-contextualized patient generation.** Lebaran petasan burns, Ramadan hypoglycemia, agricultural pesticide poisoning. This is your strongest differentiator against FlexSim and AnyLogic — none of those platforms model cultural context.

### 5. Reproducibility Guarantees
- Deterministic journaling: every state change logged
- Snapshots every 20 ticks, full state serialization
- Replay from any snapshot
- Seed-based reproducibility proof

### 6. Demonstration
- Run 10 simulations (seed 0-9), show outcome distributions
- Scenario: tsunami vs. normal operations comparison
- Agent learning curves (improvement rate over time)
- FHIR adapter: demonstrate external HIS consuming live simulation data

### 7. Use Cases
- Policy experiment: "Minimum ICU beds for <5% tsunami mortality"
- HIS testing: plug EHR into FHIR adapter, validate against ground truth
- Agent research: benchmark suite for clinical decision tasks
- Medical education: replay-based case review

### 8. Limitations & Future Work
- No real patient data validation (simulated patients only)
- Single-hospital scope (no network effects)
- Points to Paper 2 and Paper 3 as future directions

### 9. Conclusion

## Indonesian Context Strategy

**Paper 1:** Strength. Lead with it. *"We demonstrate on Eastern Indonesia's apex referral hospital because it represents an underserved healthcare context with unique insurance architecture, disaster exposure, and cultural patient generation requirements that stress-test simulation comprehensiveness."*

**Paper 2:** Irrelevant. Don't mention it.

**Paper 3:** One locale pack among many. *"We ship with an Indonesian locale pack as the reference implementation. Other locale packs are a community contribution opportunity."*

---

# Paper 2 — HOE Systems Engineering Paper

## Title

*Healthcare Operating Environment: An Event-Driven Modular Architecture for Interconnected Healthcare Simulation*

## Audience

Systems engineers, software architects, simulation researchers. Not about medicine — about systems engineering.

## Core Thesis

Healthcare systems can be modeled as deterministic event-driven state machines whose behavior emerges from independent modules rather than centralized workflow logic.

## Comparison Table (Figure 1)

| Framework | Event-sourced | Modular handlers | Deterministic replay | Healthcare domain |
|---|---|---|---|---|
| SimPy | No | No | Partial | No |
| AnyLogic | No | Partial | No | Partial |
| CARLA | No | Yes | No | No |
| Gazebo | No | Yes | No | No |
| **HOE** | **Yes** | **Yes** | **Yes** | **Yes** |

This table writes the related work section for you.

## Core Claims

1. **Event-first architecture** — every state change is an event. The simulation is the log.
2. **Modular engine composition** — handlers are composable, testable, swappable. The handler chain is a plugin system.
3. **World Engine** — the core runtime that orchestrates modules. No module knows about other modules.
4. **Replayable event sourcing** — the journal isn't a log, it's the source of truth. State is derived, not stored (CQRS/ES pattern).
5. **Plug-in healthcare modules** — departments are independent modules that register handlers. Adding a new department = adding a new handler.
6. **Cross-sector simulation** — the architecture isn't hospital-specific. Swap modules and you have a pharmaceutical supply chain, a public health system, a disaster response network.

## Key Sections

- Event sourcing architecture (not just journaling — full event store)
- Handler chain as a plugin system
- Module lifecycle (init, handler, cleanup)
- Determinism guarantees across module boundaries
- Replay engine design (snapshot + event replay)
- Comparison to existing simulation frameworks (SimPy, AnyLogic, CARLA, Gazebo)

## Why This Paper Exists

Paper 1 is about what HOE *is*. Paper 2 is about how HOE *works internally*. Different readers care about different answers.

---

# Paper 3 — HOE Runtime Paper

## Title

*HOE Runtime: Executable Healthcare Environments for Software, AI, and Policy Experimentation*

## Audience

Platform engineers, cloud architects, health IT infrastructure teams. Closer to Kubernetes than Epic.

## Core Concept

Instead of Software as a Service, expose **Healthcare as an executable environment**.

```
Applications
    ↓
Healthcare Runtime
    ↓
World Runtime
    ↓
Replay Engine
    ↓
Events
    ↓
Modules
```

This diagram is the conceptual heart of the whole project.

## Key Claims

1. **Simulator-as-a-Service (SaaS)** — deploy hospital instances on demand. Each instance is isolated, deterministic, and API-accessible.
2. **Ground truth as a service** — every simulation instance produces a verifiable event stream. Any HIS can subscribe.
3. **Runtime isolation** — each simulation instance has its own state, journal, and clock. No cross-instance interference.
4. **Snapshot marketplace** — share pre-configured simulation scenarios (tsunami prep, pandemic response, rural hospital setup) as immutable snapshots. This is also the SaaS business model described in academic language.
5. **CI/CD for healthcare policy** — treat policy changes as code. Commit a policy change -> simulation runs -> outcomes recorded -> approved or rejected.

## Indonesian Context Strategy

One locale pack among many. Frame as: *"We ship with an Indonesian locale pack as the reference implementation. Other locale packs are a community contribution opportunity."*

---

# Paper 4 — Emergent Behavior (Future)

## Title

*Healthcare Digital Organisms: Emergent Behavior in Persistent Agent-Based Healthcare Environments*

## Timeline

Years later, after World + Population + Hospital + Pharma + Distribution + Insurance modules exist.

## Research Questions

- Why did antibiotic resistance increase? (Not programmed — it emerges.)
- Why did ICU occupancy spike?
- Why did referrals decrease?
- Why did mortality change after a logistics disruption?

At sufficient module density, you're no longer evaluating modules. You're evaluating emergent behavior. That's a separate research area.

---

# Target Venues

| Venue | Paper | Fit |
|---|---|---|
| **JMIR Medical Informatics** | Paper 1 | Health informatics + systems |
| **Journal of Systems & Software** | Paper 2 | Software architecture / systems engineering |
| **ACM SoCC / ICSE (SEIP)** | Paper 3 | Cloud computing / platform engineering |
| **Nature Digital Medicine** | Paper 1 or 3 | Digital health platforms |
| **AAAI / NeurIPS (Systems track)** | Paper 1 or 2 | ML systems infrastructure |
| **Artificial Life / ALIFE** | Paper 4 | Emergent behavior / complex systems |

---

# Key Assumptions to Validate

- [ ] The 40-diagnosis pool + Markov chain produces realistic admission patterns vs. real hospital data (validate against Indonesia MoH statistics)
- [ ] The agent learning loop converges meaningfully within simulation time (check improvement rates after 10K+ ticks)
- [ ] Journal + snapshot overhead doesn't bottleneck at scale (benchmark at 50K+ ticks)
- [ ] FHIR R4 adapter is spec-compliant enough for HIS integration testing (validate against a real EHR sandbox)
- [ ] Handler chain composability holds when 50+ modules are registered (test module isolation)
- [ ] **Snapshot restore from any tick completes under 100ms at production scale** — ⚠️ This is aggressive for SQLite at 50K+ ticks with 30+ departments. Benchmark early. If it's 800ms, change claim to sub-second. If it's 3 seconds, redesign snapshot format. Don't discover this during peer review.

---

# Research Program Roadmap

```
Paper 1 (Deer's Rock — healthcare platform)
    └── Paper 2 (HOE architecture — event sourcing & systems)
        └── Paper 3 (HOE Runtime — cloud & SaaS)
            └── Multi-hospital federation
                └── Pharmaceutical supply chain engine
                    └── Population health lifecycle
                        └── Paper 4 (emergent behavior)
                            └── ...
```

Each layer becomes its own research contribution while sharing the same underlying platform. Deer's Rock is the reference hospital that proves the architecture works. HOE is the platform that outlives any single module.
