# Healthcare Operating Environment (HOE) — Research Program

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

---

## The Platform Distinction

- **HOE** = the platform and runtime.
- **Deer's Rock** = the flagship reference hospital simulation built on top of it.

Same relationship as Kubernetes ↔ one deployed application, Unreal Engine ↔ one game, Gazebo ↔ one robot world, CARLA ↔ one driving town.

The hospital is the reference implementation of a Healthcare Operating Environment, demonstrating how domain-specific modules can execute within a shared deterministic world.

---

# Paper 1 — Deer's Rock Platform Paper

## Title

*Deer's Rock: An Open-Source Persistent Hospital Simulation Environment for Reproducible Healthcare AI Research*

## Audience

Cross-disciplinary: regulators (reproducibility), ML/AI researchers (agent experimentation), health informaticians (FHIR interoperability), clinical educators (replay-based training).

## Core Claims

1. **Reproducible** — same seed + same policy = same outcome trajectory (deterministic tick engine + SQLite journal + snapshot system)
2. **Comprehensive** — 9 specialized departments, 30+ agent roles, 40 ICD-10 diagnoses, 22-medication formulary, 7 disaster scenarios
3. **Agent-native** — built-in experimentation loop (diagnosis -> actions -> outcomes -> memory -> improved decisions). Agents are pluggable: rule-based today, RL tomorrow, LLM-based the day after.
4. **Resilient** — stochastic disaster scenario engine with 7 event types (earthquake, tsunami, pandemic, etc.) each with 4-phase lifecycle affecting surge, mortality, supply, infrastructure
5. **Interoperable** — FHIR R4 is not a feature, it's an adapter. Simulation produces ground truth -> FHIR -> any external HIS can connect to a living hospital.

## Suggested Outline

### 1. Introduction
- The reproducibility crisis in healthcare simulation research
- Need for open-source, persistent, agent-ready testbeds
- Contribution statement

### 2. Related Work
- Hospital simulators (FlexSim, AnyLogic, MedModel)
- Medical AI benchmarks (KCH, Medical Gym, HiPhy)
- Digital twin platforms (NHS DIGIT, Siemens Healthineers)
- Gap: none combine agent experimentation + full hospital operations + persistent journal + disaster scenarios + culturally-contextualized patient generation

### 3. System Architecture
- Tick-based deterministic engine (1 tick = 1 min, 1 sec real-time)
- Event queue + handler chain (35 handlers per tick)
- State immutability pattern (functional state transitions)
- SQLite journal + snapshot/restore

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
