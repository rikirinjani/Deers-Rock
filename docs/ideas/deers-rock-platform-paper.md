# Deer's Rock: An Open-Source Persistent Hospital Simulation Environment for Reproducible RL-Based Policy Experimentation

## Problem Statement

How Might We design and validate an open-source, persistent hospital simulation platform that generates reproducible evidence for healthcare regulators, AI researchers, and health informaticians — without requiring access to real patient data?

## Recommended Direction

A **Platform / Architecture Paper** that presents Deer's Rock as a novel class of simulation infrastructure. The paper's core claim: *Deterministic, persistent hospital simulation with embedded RL agents and full audit-trail journaling enables a new category of reproducible experiments for healthcare decision-making.*

The paper should demonstrate that the simulation is:

1. **Reproducible** — same seed + same policy = same outcome trajectory (via SQLite journal + snapshot system)
2. **Comprehensive** — 9 specialized departments, 30+ agent roles, 40 ICD-10 diagnoses, 22-medication formulary
3. **RL-native** — built-in learning loop (diagnosis -> actions -> outcomes -> memory -> improved decisions)
4. **Resilient** — stochastic disaster scenario engine with 7 event types affecting surge, mortality, supply, and infrastructure
5. **Interoperable** — FHIR R4 export endpoints, 33+ REST APIs, full state observability

## Suggested Outline

### 1. Introduction
- The reproducibility crisis in healthcare simulation research
- Need for open-source, persistent, RL-ready testbeds
- Contribution statement

### 2. Related Work
- Hospital simulators (FlexSim, AnyLogic, MedModel)
- Medical RL benchmarks (KCH, Medical Gym, HiPhy)
- Digital twin platforms (NHS DIGIT, Siemens Healthineers)
- Gap: none combine RL + full operations + persistent journal + disaster scenarios

### 3. System Architecture
- Tick-based deterministic engine (1 tick = 1 min, 1 sec real-time)
- Event queue + handler chain (35 handlers per tick)
- State immutability pattern (functional state transitions)
- SQLite journal + snapshot/restore (3.1)

### 4. Key Components
- Patient generation & markov admission/discharge (4.1)
- 9 specialized departments (4.2)
- AI clinical agents: Doctor, Nurse, Pharmacist (4.3)
- RL learning loop & outcome tracking (4.4)
- Disaster scenario engine (7 types, 4-phase lifecycle) (4.5)
- M&M conference & preventability assessment (4.6)
- FHIR R4 interoperability layer (4.7)

### 5. Reproducibility Guarantees
- Deterministic journaling: every state change logged
- Snapshots every 20 ticks, full state serialization
- Replay from any snapshot: `journalReplay(tick)`
- Seed-based reproducibility proof (Table 1)

### 6. Demonstration
- Run 10 simulations (seed 0-9), show outcome distributions
- Scenario: tsunami vs. normal operations comparison
- RL agent learning curves (improvement rate over time)
- Performance benchmarks (scalability, throughput)

### 7. Use Cases
- Policy experiment: "Minimum ICU beds for <5% tsunami mortality"
- HIS testing: plug EHR into FHIR endpoints, validate against ground truth
- RL research: benchmark suite for clinical decision tasks
- Medical education: replay-based case review

### 8. Limitations & Future Work
- No real patient data validation (simulated patients only)
- Rule-based agents (no learned policies integrated yet)
- Single-hospital scope (no network effects)
- Future: multi-hospital federation, PPO/DQN integration

### 9. Conclusion

## Key Assumptions to Validate

- [ ] The 40-diagnosis pool + Markov chain produces realistic admission patterns vs. real hospital data (validate against Indonesia MoH statistics)
- [ ] The RL learning loop converges meaningfully within simulation time (check improvement rates after 10K+ ticks)
- [ ] Journal + snapshot overhead doesn't bottleneck simulation at scale (benchmark at 50K+ ticks)
- [ ] FHIR R4 export is spec-compliant enough for HIS integration testing (validate against a real EHR sandbox)

## MVP Scope (for the first paper)

| In Scope | Out of Scope |
|---|---|
| Full architecture documentation | Multi-hospital federation |
| RL agent learning loop (heuristic-based) | Deep RL (DQN, PPO) integration |
| 7 disaster scenarios demonstration | Validation against real patient data |
| Reproducibility proof (seed experiments) | User study / regulator survey |
| FHIR R4 export (Patient, Encounter, Observation) | All FHIR resources |
| SQLite journal + snapshot system | Real-time streaming export |
| 35-handler engine architecture | Performance optimization deep-dive |

## Target Venues

| Venue | Fit | Format |
|---|---|---|
| **JMIR Medical Informatics** | Health informatics + systems | Full paper (6-8K words) |
| **NEJM AI** | AI in healthcare | Short report (2K words) |
| **Nature Digital Medicine** | Digital health platforms | Article (3-5K words) |
| **ACM TIST** | AI systems | Full paper (10-12 pages) |
| **AAAI / NeurIPS Datasets & Benchmarks** | ML community | 8-page track |

## Open Questions

1. Do we bench-test the RL loop's convergence statistically (with confidence intervals) or just show it qualitatively?
2. Should the codebase be published alongside the paper, or as a separate software release?
3. Is the Indonesian context (Makassar, Eastern Indonesia) a strength (regional relevance) or a limitation (generalizability)?
4. Do we need ethics approval for a simulation-only study?

## Next Steps

1. Generate sufficient simulation data (aim for 10K+ ticks across multiple seed runs)
2. Build the reproducibility experiment framework (seed-based comparison)
3. Write the FHIR R4 export validation
4. Draft each section in order
5. Submit to target venue (recommend starting with JMIR or Systems journal)
