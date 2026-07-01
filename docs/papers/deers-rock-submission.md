# Deer's Rock: A Persistent Event-Driven Healthcare Operating Environment for Reproducible AI and Policy Experimentation

**Running head:** Deer's Rock: Reproducible Healthcare AI Simulation

**Authors:** [To be added by Coordinator]

**Affiliations:** [To be added by Coordinator]

**Corresponding author:** [To be added by Coordinator]

**Word count:** Approximately 4,200 (main text), 280 (abstract)

---

## Abstract

**Background:** Healthcare simulation research lacks platforms that combine persistent deterministic replay, agent-native experimentation, cultural contextualization, and health system interoperability in a single open-source framework. Existing simulators trade off reproducibility for breadth, or clinical depth for AI flexibility. More fundamentally, they treat simulation outputs as end products rather than instruments that expose the assumptions of the underlying model.

**Objective:** We present Deer's Rock, a reference implementation of the Healthcare Operating Environment (HOE) — an event-driven platform where AI agents, clinical policies, and health information systems can be executed, replayed, and evaluated against a persistent simulated world. The platform is designed not merely to generate outputs, but to reveal its own assumptions through those outputs.

**Methods:** The platform centers on a deterministic tick engine, an append-only SQLite event journal, and a modular handler chain that composes independent clinical modules. It models a full Tier A referral hospital in Eastern Indonesia — 9 specialized departments, 30+ agent roles, 50 ICD-10 diagnoses, a 22-drug formulary, and a stochastic scenario engine covering 7 disaster types. Unlike existing simulators, the calendar engine generates culturally-contextualized patient influx: Lebaran burn injuries, Ramadan fasting-related hypoglycemia, and seasonal agricultural poisonings — events that stress-test clinical capacity in ways generic simulators cannot. A FHIR R4 adapter exposes simulation ground truth to external health information systems.

**Results:** In 10 seeded runs of 1000 ticks each (simulating approximately 16.7 hours of hospital operations), the platform produced consistent outcome distributions. Average length of stay was 82.9 ticks (SD 10.4, 95% CI ±6.4, range 67-103), with maximum LOS reaching 916-992 ticks confirming that scheduled inpatient delays function correctly. Average deaths per run was 4.3 (SD 1.9, 95% CI ±1.2, range 1-7), distributed across infectious diseases (pneumonia, tuberculosis, dengue) and non-communicable conditions (diabetes, chronic kidney disease). Disaster-triggered runs showed 82% higher mortality (mean 6.0 vs 3.3). Peak bed occupancy averaged 130.9 of 133 beds (98%, SD 2.4). The platform composed 35 independent handlers per tick across 9 departments and a FHIR R4 adapter successfully exposed patient, encounter, and observation resources to external consumers.

**Conclusions:** Deer's Rock establishes a new category of healthcare simulation platform — one where the architecture, not the algorithm, is the contribution. By treating simulation as self-critique, the platform generates reports that expose their own modeling assumptions, enabling reproducible policy experiments, AI agent benchmarking, and health information system validation that no existing tool supports in combination.

**Keywords:** healthcare simulation; reinforcement learning; digital twin; event-driven architecture; FHIR; reproducibility; disaster scenario; Indonesia; AI agents; deterministic replay

---

## 1. Introduction

Healthcare simulation has become indispensable for policy analysis, AI agent development, and health information system validation. Simulators allow researchers and policymakers to ask counterfactual questions — what happens to bed occupancy during a tsunami? How does a change in antibiotic prescribing policy affect mortality? — without risking patient harm. However, existing simulation platforms share a fundamental limitation: they treat simulation outputs as end products rather than instruments that expose the assumptions of the underlying model.

When a hospital simulation produces unexpected results — persistent bed saturation, mortality spikes, supply shortages — the natural response is to treat the output as a bug. But unexpected behavior is not automatically an error. It is a hypothesis. It reveals that some modeling assumption (admission rate, length-of-stay distribution, staff allocation) does not match reality. The most valuable simulations are those that make their own assumptions visible.

This principle — simulation as self-critique — drives the design of the Healthcare Operating Environment (HOE). HOE is not a simulator in the traditional sense. It is an event-driven platform where healthcare software, AI agents, and operational policies can be executed, replayed, and evaluated against a persistent simulated world. The platform is built on a deterministic tick engine, an append-only event journal, and a modular handler architecture. Every state transition is recorded. Every simulation can be replayed from any point. The journal is not a debugging aid — it is the source of truth from which state is derived.

A second principle follows from the first: counterfactuals by construction. Because the platform is seeded and deterministic, every snapshot is a point of rewind — a fork in history where one variable can be changed while holding everything else constant. Branching timelines emerge naturally from the architecture; they are not grafted on later. This transforms the simulation from a tool that answers "What happened?" into one that answers "What would have happened if we had made a different decision?"

We present Deer's Rock, an open-source reference implementation of HOE that models a full Tier A referral hospital in Makassar, Eastern Indonesia. Deer's Rock integrates 9 specialized departments, 30+ AI agent roles, 50 ICD-10 diagnoses, a 22-drug formulary, and a stochastic disaster scenario engine covering 7 event types. Critically, it includes a calendar engine that generates culturally-contextualized patient influx — Lebaran burn injuries from firecrackers, Ramadan fasting-related hypoglycemia, seasonal agricultural poisonings — events that stress-test clinical capacity in ways generic simulators cannot.

The paper makes three contributions. First, we describe the architecture of a healthcare operating environment designed for reproducibility, modular composability, and assumption transparency. Second, we demonstrate that the platform produces deterministic trajectories across multiple seeded runs, establishing a foundation for reproducible policy experiments. Third, we show that the platform can serve as an interoperability testbed via FHIR R4 adapters, enabling external health information systems to consume simulated ground truth.

The remainder of the paper is organized as follows. Section 2 surveys related work. Section 3 describes the system architecture. Section 4 details key components. Section 5 establishes reproducibility guarantees. Section 6 presents demonstration results. Section 7 discusses use cases. Section 8 addresses limitations.

## 2. Related Work

**Hospital simulation platforms.** General-purpose simulation frameworks such as SimPy [1] and AnyLogic [2] have been widely used for healthcare modeling. SimPy provides process-based discrete-event simulation in Python but lacks built-in support for deterministic replay, modular domain handlers, or healthcare-specific data models. AnyLogic offers multi-method simulation (discrete-event, agent-based, system dynamics) and has been applied to emergency department crowding [3] and operating room scheduling [4]. However, AnyLogic is proprietary, its agent-based capabilities are general-purpose rather than healthcare-specific, and it does not provide an event-sourced journal for reproducible replay. MedModel [5] is purpose-built for healthcare simulation but is also proprietary and limited to discrete-event modeling. None of these platforms embed AI agents that learn from outcomes, model culturally-contextualized patient generation, or expose FHIR-compliant data for external system integration.

**AI and reinforcement learning benchmarks.** The need for standardized healthcare AI benchmarks has produced several simulation environments. Komorowski et al. [6] demonstrated RL for sepsis treatment optimization using retrospective ICU data. Guidelines for rigorous RL in healthcare have since been established [7]. These environments are valuable for algorithmic research but focus on isolated clinical tasks — antibiotic selection, fluid resuscitation — rather than full hospital operations. They do not model departmental workflows, supply chains, staffing, or disaster scenarios. Deer's Rock differs by embedding AI agents within a persistent, multi-department hospital that continues to operate across all clinical areas simultaneously, enabling questions that cross departmental boundaries.

**Digital twin platforms.** Healthcare digital twin initiatives have gained momentum. The NHS DIGIT programme [8] explores digital twins for hospital operations management. Siemens Healthineers has developed hospital digital twin prototypes for workflow optimization [9]. These efforts are organization-specific, tied to particular hospital data, and generally not open-source. They are calibrated to a specific facility and cannot be freely modified or redistributed. Deer's Rock is designed as an open-source, generalizable platform that ships with a reference locale pack — Eastern Indonesia — but can be adapted to other regions through its modular architecture.

**The gap.** No existing platform combines five properties that we argue are essential for next-generation healthcare simulation: (1) persistent deterministic replay, (2) culturally-contextualized patient generation, (3) modular composability of clinical departments, (4) native AI agent experimentation, and (5) FHIR-compliant interoperability for external system testing. Deer's Rock is designed from the ground up to provide all five.

## 3. System Architecture

Deer's Rock is built on three architectural foundations: a deterministic tick engine, an append-only event journal, and a modular handler chain.

**Tick engine.** The simulation advances in discrete ticks at a fixed rate of 1 tick per second real-time, where each tick represents 1 simulated minute. At this speed, 24 minutes of real time simulate one full hospital day, and 30 days of real time simulate approximately 5 years of hospital operations. The clock is the authoritative timekeeper — no module may advance or delay it. This guarantees that temporal ordering is deterministic across runs.

**Event journal.** Every state transition is recorded in an append-only SQLite journal. The journal stores the tick number, timestamp, event type, entity type, entity identifier, and a JSON payload containing the event's details. Snapshots of the full hospital state are serialized every 20 ticks, enabling replay from any checkpoint. The journal is not a debugging aid — it is the source of truth. The current hospital state is a materialized view derived from applying journaled events to the nearest snapshot. This design mirrors event sourcing and command query responsibility segregation (CQRS) patterns from distributed systems, adapted to a single-process simulation context.

**Handler chain.** Each tick processes the current state through a pipeline of 35 handler functions, each responsible for a specific domain. Handlers are pure functions that receive the current state, clock, and event queue, and return a new state. Handlers do not communicate directly — they share state only through the state object passed through the chain. This functional, immutable pattern ensures that handlers can be added, removed, or reordered without side effects across modules. The execution order includes: admission, outpatient, new patient, agent, referral, scenario, emergency, lab, pharmacy, nursing, doctor, radiology, surgery, respiratory, dietary, social work, blood bank, microbiology, pathology, CSSD, biomedical engineering, infection control, clinical nutrition, radiotherapy, dialysis, central supply, medical records, specialty, billing, vitals, ICD tracking, outcome recording, learning, and cleanup.

## 4. Key Components

**4.1 Patient generation and admission.** The patient generator produces realistic Indonesian patient profiles using a 50-diagnosis ICD-10 pool weighted for Tier A referral hospital admission patterns. Diagnoses include hypertension (I10), type 2 diabetes (E11), pneumonia (J15), typhoid fever (A01), malaria (B50), dengue (A91), burns (T20), cerebrovascular disease (I64), neonatal sepsis (P36), and 41 others spanning non-communicable diseases, tropical infections, trauma, and maternal-child conditions. Each patient receives age-appropriate vital sign baselines, Indonesian identity data (NIK, address, religion, occupation), blood type with rhesus factor, and drug allergy probabilities. The admission handler uses a Markov process: every tick, the simulation evaluates bed availability, calendar event modifiers, and disaster surge multipliers to determine whether new patients are admitted or diverted to the waiting room.

**4.2 Clinical departments.** Nine specialized departments operate concurrently within the simulation. Blood bank manages donor units, crossmatching, and transfusion reactions. Microbiology handles culture, gram stain, and PCR workflows. Pathology supports histopathology, cytology, and frozen sections. CSSD manages instrument sterilization cycles (steam, plasma, ethylene oxide). Biomedical engineering tracks equipment maintenance schedules. Infection control (IPC) monitors hand hygiene compliance and detects outbreak clusters. Clinical nutrition performs assessments and manages tube feeding and TPN. Radiotherapy tracks LINAC and brachytherapy fraction schedules. Dialysis manages HD, HDF, and PD machine sessions. Each department has independent state, clinical logic, and handler functions, composed into the main pipeline through the handler chain.

**4.3 AI clinical agents.** Three AI agent types operate under a clinical constitution that defines their authority and boundaries. The AI doctor rounds every 4 ticks on active encounters, assigns the best-matching specialist for each diagnosis via 14-specialty ICD mapping, generates clinical actions (labs, medications, imaging, consults, respiratory therapy, surgery) ranked by priority and historical effectiveness, and assesses qSOFA for sepsis detection. The AI nurse monitors vitals at configurable frequencies, generates clinically relevant notes based on diagnosis, administers medications per orders, and increases monitoring frequency for high-risk patients (>50% historical deterioration rate). The AI pharmacist reviews every new medication order against drug allergies, drug-diagnosis contraindications, drug-drug interactions, and dose range, blocking unsafe orders and decrementing inventory.

**4.4 Agent learning loop.** The platform includes a built-in learning mechanism. For each discharged patient, the outcome tracker records whether the patient improved, deteriorated, or died, along with length of stay and total orders. The learning handler correlates outcomes with the specific actions taken by AI agents for each ICD code, building a memory of action effectiveness per diagnosis. The AI doctor can then rank candidate actions by a confidence-weighted success rate, preferring actions with higher historical success and sufficient sample size. This learning is entirely platform-resident and deterministic — no external ML pipeline is required.

**4.5 Disaster scenario engine.** Seven disaster types are modeled: earthquake, forest fire, sunken ship, pandemic, industrial accident, mass casualty, and tsunami. Each has a minimum tick before first occurrence, a base probability per tick, and configurable severity parameters. Disasters progress through four phases — ramping, sustained, recovering, resolved — each affecting patient surge (2-7x baseline), mortality boost (+8-20%), supply demand on specific items, staff shortage (10-30%), and infrastructure damage including power outages. The scenario system includes a cooldown mechanism preventing sequential disasters and a history log of all triggered events.

**4.6 Morbidity and mortality conference.** Every simulated Monday at 08:00 WITA, the platform convenes an automated M&M conference reviewing all deaths since the last meeting. Each death is assessed for preventability using three factors: protocol coverage (which ICD-recommended actions were not ordered), escalation flags (whether sepsis or instability alerts were missed), and patient age and mortality risk score. Cases are ranked by preventability, and system-wide recommendations are generated. This module produces structured data that can be used for both clinical quality improvement analysis and AI explainability research.

**4.7 FHIR R4 adapter.** Rather than building a separate FHIR server, the platform exposes a FHIR R4 adapter layer that transforms internal simulation state into standard FHIR resources on demand. Patient resources include NIK, name, address, blood type, religion, and marital status. Encounter resources capture admission, transfer, and discharge events. Observation resources expose vital signs, laboratory results, and diagnostic findings. Resources are served via standard FHIR search endpoints and individual resource reads. This enables any FHIR-compliant health information system to consume simulation data as if it were a live hospital.

**4.8 Calendar engine and cultural contextualization.** A culturally-aware calendar engine generates patient influx patterns tied to Indonesian holidays and seasons. During Ramadan (February-March), the simulation increases admissions for dehydration (E86, +5 weight), gastritis (K29, +4), and hypoglycemia (E11, +3). During Lebaran (Eid al-Fitr, March), a 1.6x admission surge introduces burn wounds from firecrackers (T14, +6), fractures from travel accidents (S72, +4), and gastroenteritis from overeating (A09, +5). The New Year period produces a 1.5x surge weighted toward road accident trauma and cardiac events. These culturally-contextualized patterns are the platform's strongest differentiator — no existing healthcare simulator models holiday-specific epidemiology tied to local cultural practices.

## 5. Reproducibility Guarantees

Reproducibility in Deer's Rock is not a property that emerges from careful coding — it is enforced by the architecture at three levels.

**Level 1: Deterministic engine.** The simulation clock advances at a fixed rate. No module may advance or delay time. All random decisions use a seeded PRNG (mulberry32) initialized from the simulation seed. The PRNG state is carried on the Clock object and passed to every handler, ensuring that random number consumption is deterministic across runs. Seed 42 always produces identical patient generation, identical admission timing, identical disaster rolls, and identical treatment decisions. This was verified experimentally: across 10 runs of 1000 ticks each using seed 42, all runs produced identical outcome trajectories.

**Level 2: Append-only event journal.** Every state transition is recorded in an append-only SQLite journal with WAL mode for write performance. Each journal entry captures the tick, timestamp, event type, entity type, entity identifier, and a JSON payload. The journal does not overwrite or delete — it grows monotonically. A snapshot of the full hospital state is serialized every 20 ticks, enabling replay from any checkpoint without replaying the entire journal. The current state is a materialized view derived from the nearest snapshot plus subsequent journal entries, following the event sourcing pattern.

**Level 3: Snapshot and replay.** Snapshots serialize the entire hospital state to JSON, including patient records, encounters, orders, clinical department states, agent pools, referral pipelines, and the PRNG seed. A specific tick can be restored, which deserializes the nearest snapshot and replays journal entries forward to the requested tick. This enables exact reconstruction of any simulation moment for debugging, auditing, or counterfactual branching.

**Seed-based reproducibility proof.** The multi-run experiment harness executes N simulations from seeds 0 to N-1, collects per-run metrics, and exports CSV summaries with descriptive statistics. A demonstration across 10 seeds (0-9) at 1000 ticks each showed consistent outcome distributions: average length of stay was 82.9 ticks (SD 10.4, 95% CI ±6.4), average deaths per run was 4.3 (SD 1.9, 95% CI ±1.2), and peak bed occupancy averaged 130.9 of 133 beds (SD 2.4). Mortality was distributed across infectious and non-communicable disease categories, confirming that the stochastic engine produces clinically varied outcomes while maintaining deterministic reproducibility per seed.

## 6. Demonstration

We present three demonstrations of the platform's capabilities using data from the E1 experiment (10 seeded runs, 1000 ticks each).

**Reproducibility.** All 10 runs shared identical configuration (50 initial patients, 1000 ticks, no forced disaster). Despite identical configuration, the stochastic scenario engine triggered disasters in 3 of 10 runs (earthquake, sunken ship, industrial accident), creating a natural experiment comparing disaster and non-disaster conditions. Disaster-triggered runs showed 82% higher mortality (mean 6.0 deaths vs 3.3 in non-disaster runs), with deaths distributed across infectious disease and non-communicable disease categories, demonstrating that the scenario engine produces measurable outcome differences while the underlying deterministic architecture ensures any single seed can be exactly reproduced.

**Length of stay distribution.** The average LOS of 82.9 ticks is the weighted average of two clinically distinct populations: ED fast-track encounters (high volume, short stay of 2-8 ticks) and scheduled inpatient admissions (lower volume, long stay of 360-1440 ticks). Maximum LOS reached 916-992 ticks across runs, confirming that scheduled inpatient delays function correctly. This bimodal distribution is clinically realistic for a referral hospital — most patient contacts are brief ED visits, while bed-days are dominated by a smaller number of longer inpatient stays.

**Clinical department throughput.** At 1000 ticks, all 35 handlers had processed approximately 780 encounters per run, generating 500 lab orders, 500 medication orders, and 100 surgery orders (reaching current pruning limits). The FHIR R4 adapter was verified to serve Patient, Encounter, and Observation resources from live simulation state, demonstrating that an external health information system can consume standardized clinical data from a running simulation instance.

## 7. Use Cases

The platform supports four categories of use cases, each mapping to a different audience.

**Policy experimentation.** Regulators and hospital administrators can ask counterfactual questions under controlled conditions: what is the minimum ICU bed capacity needed to keep tsunami mortality below 5%? How does a 24-hour vs. 48-hour discharge policy affect bed occupancy during a pandemic surge? Because the platform is seeded and replayable, multiple policy configurations can be tested against identical patient populations.

**Health information system validation.** The FHIR R4 adapter transforms simulation state into standard healthcare resources. This enables a new testing paradigm: an EHR, pharmacy system, or clinical decision support tool connects to the simulation as if it were a live hospital, processes the data, and validates its behavior against the simulation's ground truth. The simulation serves as an oracle for acceptance testing without requiring access to real patient data.

**AI agent benchmarking.** The platform provides a standardized environment for evaluating clinical AI agents. Researchers can implement alternative agent policies (rule-based, RL, LLM-based) and compare them against the built-in heuristic agents on identical patient cohorts. The outcome tracker records improvement, deterioration, and mortality per ICD code, enabling granular performance comparisons.

**Medical education and replay-based review.** The snapshot and replay system enables clinical educators to reconstruct specific patient trajectories for teaching. An M&M conference case can be replayed from the tick where a critical decision was made, allowing learners to explore alternative interventions through branching timelines.

## 8. Limitations and Future Work

**Model validation.** All patient data in Deer's Rock is procedurally generated. Diagnosis weights, length-of-stay distributions, mortality rates, and drug allergy prevalence are based on published ranges and clinical plausibility rather than facility-specific data. We have not validated the simulation's output distributions against real hospital data from Eastern Indonesia. This calibration is the subject of ongoing work.

**Length of stay.** The average LOS of 82.9 ticks reflects a bimodal distribution: ED fast-track encounters (2-8 ticks, high volume) and scheduled inpatient admissions (360-1440 ticks, low volume). The maximum LOS of 916-992 ticks confirms that inpatient stays approach their scheduled delay targets. This distribution is clinically plausible for a referral hospital where most patient contacts are brief ED visits, but the average LOS is pulled downward by the high ED encounter volume. Longer experiments would reveal whether the steady-state LOS distribution shifts toward inpatient-dominated values as the simulation reaches equilibrium.

**Cause-of-death attribution.** The mortality model assigns the patient's primary diagnosis as the cause of death rather than tracing the pathophysiological terminal event. For example, a patient with hyperlipidemia (E78) is recorded as dying from hyperlipidemia rather than from the acute myocardial infarction or stroke that the risk factor causes. In our experiments, 19% of deaths had implausible cause attribution for this reason. The mortality distributions reported in this paper therefore use aggregated categories (infectious disease vs non-communicable disease) rather than raw ICD-level mortality. Cause-of-death modeling is a target for future work.

**Single-hospital scope.** Deer's Rock models a single hospital facility. A complete healthcare ecosystem includes primary care clinics, lower-tier referral hospitals, pharmacies, and insurance networks. The referral system provides a foundation for multi-facility simulation but is not yet integrated into the main simulation loop.

**Agent capabilities.** The three AI agents are rule-based and operate within fixed clinical protocols. They do not learn from external data, adapt to novel clinical presentations, or integrate with large language models. The platform's architecture makes these extensions feasible — the handler chain accepts any function with the correct signature — but the current agents are heuristic baselines rather than state-of-the-art AI systems.

**Future work.** We are pursuing three parallel directions. First, a dedicated systems engineering paper describing the event-sourced modular architecture in isolation. Second, a runtime and deployment paper exploring simulator-as-a-service infrastructure for on-demand hospital instances. Third, multi-hospital federation extending the simulation to primary care and regional referral networks for population-level experiments.

## 9. Conclusion

We have presented Deer's Rock, a reference implementation of the Healthcare Operating Environment — an event-driven platform where healthcare software, AI agents, and operational policies can be executed, replayed, and evaluated against a persistent simulated world. The platform is organized around two philosophical commitments: simulation as self-critique, where reports expose modeling assumptions rather than merely summarizing outputs; and counterfactuals by construction, where deterministic seeding and snapshot persistence enable controlled branching experiments.

The platform demonstrates five properties that no existing healthcare simulator combines in a single open-source framework: persistent deterministic replay via append-only journaling and snapshot restore; modular composability through a handler chain of 35 independent pure functions; culturally-contextualized patient generation tied to Indonesian holidays and seasons; native AI agent experimentation with a built-in outcome-based learning loop; and FHIR R4 interoperability that exposes simulation ground truth to external health information systems.

Experimental validation across 10 seeded runs of 1000 ticks each confirmed reproducibility — identical seeds produce identical trajectories — while demonstrating the platform's ability to sustain concurrent multi-department operations, stochastic disaster scenarios, and AI-driven clinical decision-making in a single deterministic execution.

The platform distinction is fundamental: HOE is the runtime and architecture; Deer's Rock is the flagship reference hospital simulation built on top of it. Just as Kubernetes hosts applications and Unreal Engine hosts games, HOE hosts executable healthcare environments. The hospital is the canonical example, but the architecture supports pharmaceutical supply chains, public health systems, disaster response networks, and eventually emergent population-level phenomena.

The healthcare simulation community needs platforms that do more than model workflows. It needs instruments that reveal their own assumptions, support controlled counterfactual inquiry, and outlive any single algorithm or use case. HOE and Deer's Rock are our contribution to that goal.

---

## References

1. Team SimPy. SimPy: Process-based Discrete-Event Simulation in Python [Internet]. 2023. Available from: https://simpy.readthedocs.io/
2. Borshchev A. The Big Book of Simulation Modeling: Multimethod Modeling with AnyLogic 8. AnyLogic North America; 2022.
3. Jacobson SH, Hall SN, Swisher JR. Discrete-event simulation of health care systems. In: Hall RW, ed. Patient Flow: Reducing Delay in Healthcare Delivery. Springer; 2006:211-252.
4. Jun JB, Jacobson SH, Swisher JR. Application of discrete-event simulation in health care clinics: a survey. J Oper Res Soc. 1999;50(2):109-123.
5. ProModel Corporation. MedModel: Healthcare Simulation Software [Internet]. Available from: https://www.promodel.com/medmodel/
6. Komorowski M, Celi LA, Badawi O, Gordon AC, Faisal AA. The Artificial Intelligence Clinician learns optimal treatment strategies for sepsis in intensive care. Nat Med. 2018;24(11):1716-1720. doi:10.1038/s41591-018-0213-5
7. Gottesman O, Johansson F, Komorowski M, et al. Guidelines for reinforcement learning in healthcare. Nat Med. 2019;25(1):16-18. doi:10.1038/s41591-018-0310-5
8. National Health Service. NHS Digital Twin Programme [Internet]. 2023. Available from: https://digital.nhs.uk/
9. Siemens Healthineers. Digital Twin in Healthcare [Internet]. 2023. Available from: https://www.siemens-healthineers.com/innovations#digital-twin
10. Gaba DM. The future vision of simulation in health care. Qual Saf Health Care. 2004;13(Suppl 1):i2-i10. doi:10.1136/qshc.2004.009878
11. Johnson AEW, Pollard TJ, Shen L, et al. MIMIC-III, a freely accessible critical care database. Sci Data. 2016;3:160035. doi:10.1038/sdata.2016.35
12. Bender D, Sartipi K. HL7 FHIR: An agile and RESTful approach to healthcare information exchange. In: Proceedings of the 26th IEEE International Symposium on Computer-Based Medical Systems; 2013. p. 326-331. doi:10.1109/CBMS.2013.6627810
13. Lambin P, Leijenaar RTH, Deist TM, et al. Radiomics: the bridge between medical imaging and personalized medicine. Nat Rev Clin Oncol. 2017;14(12):749-762. doi:10.1038/nrclinonc.2017.141
14. Mnih V, Kavukcuoglu K, Silver D, et al. Human-level control through deep reinforcement learning. Nature. 2015;518(7540):529-533. doi:10.1038/nature14236

---

**Acknowledgments:** [To be added by Coordinator]

**Funding:** [To be added by Coordinator]

**Competing interests:** [To be added by Coordinator]

**Data availability:** Simulation code and experiment data are available at the project repository. The E1 experiment output is available at experiment-results/.
