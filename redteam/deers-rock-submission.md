# 🔬 Red-team Report: "Deer's Rock: A Persistent Event-Driven Healthcare Operating Environment for Reproducible AI and Policy Experimentation"

> ⚠️ **模拟结果,非真实评审。** 真实评审受 venue、审稿人抽样、当年竞争激烈程度影响,这里只反映"以当前草稿的状态,大概率会撞上哪些枪"。
>
> **Assumed Venue:** 通用 ML/Health Informatics (按 NeurIPS 评分量表)

---

## Reviewer 1: The Champion (R1 — 温和的拥护者)

**Summary.**
This paper presents Deer's Rock, an open-source event-driven healthcare simulation platform that models a Tier A referral hospital in Eastern Indonesia with deterministic replay, culturally-contextualized patient generation, and FHIR R4 interoperability. The platform centers on a tick engine, append-only event journal, and 35 modular handler functions. The authors demonstrate reproducible trajectories across 10 seeded runs and show that disaster scenarios produce measurable mortality differences.

**Strengths.**

- **Principled architectural vision.** The core idea — that simulation outputs should expose modeling assumptions rather than merely summarize results ("simulation as self-critique") — is philosophically well-motivated and underexplored in existing healthcare simulation literature. [§1, §9] This framing is the paper's most novel intellectual contribution.

- **Cultural contextualization is genuinely novel.** The calendar engine (Ramadan fasting hypoglycemia, Lebaran burn injuries, seasonal agricultural poisonings) is a clear differentiator from generic simulation frameworks. [§4.8] No existing healthcare simulator models holiday-specific epidemiology tied to local cultural practices. This is a real value add.

- **Append-only event journal design is well-engineered.** Following event sourcing/CQRS patterns, snapshots every 20 ticks, deterministic PRNG on the Clock object — these architectural choices are sound and correctly argued to provide stronger reproducibility guarantees than typical ad-hoc logging. [§3, §5]

- **Honest limitations section.** The authors explicitly flag cause-of-death attribution problems (19% implausible), unvalidated output distributions, single-hospital scope, and rule-based agent limitations. [§8] This candor is commendable and should be retained.

**Weaknesses.**

1. 🟡 **Contribution framing overclaims relative to evidence.** The paper claims the platform enables "reproducible policy experiments, AI agent benchmarking, and health information system validation" — but provides no examples of any of these use cases being actually executed. [Abstract, §1, "原文...that no existing tool supports in combination"] The FHIR adapter is "verified to serve" three resource types — this is a unit test, not a demonstration of "health information system validation."

2. 🟢 **Related work section is thin for the scope of claims.** Five properties claimed as unique combination, but no direct comparison table against SimPy, AnyLogic, MedModel, or digital twin efforts on each property. [§2] A table would substantially strengthen positioning.

3. 🟡 **10 runs × 1000 ticks (~16.7 hours) is a narrow window.** The paper acknowledges this implicitly (§8 LOS discussion) but the demonstration section presents this as sufficient. A referral hospital's interesting dynamics play out over weeks to months.

4. 🟢 **FHIR adapter section lacks conformance detail.** "Serves Patient, Encounter, Observation resources" — without specifying which FHIR R4 profiles, search parameters, or operations are supported. [§4.7]

**Questions to authors.**

- What is the real-time computational cost of 1000 ticks? How does it scale with patient count?
- Have you considered submitting to a systems/benchmark venue (NeurIPS Datasets and Benchmarks, JAMIA, PLOS Digital Health) given the contribution is architectural?

**Ratings.** (模拟值,非真实评审;NeurIPS 量表)

- Soundness:      2/4 — Architecture is sound but empirical validation is minimal.
- Presentation:   3/4 — Well-written and clearly organized.
- Contribution:   3/4 — Architectural vision and cultural contextualization are genuinely useful.
- **Overall:**    6/10 — Promising platform paper needing more experimental validation.
- Confidence:     4/5

---

## Reviewer 2: The Methodological Skeptic (R2 — 方法怀疑论者)

**Summary.**
This paper describes a deterministic hospital simulation platform with event-sourced architecture, culturally-parameterized patient generation, and FHIR R4 data export. The authors claim five unique properties in combination. The experimental section reports 10 seeded runs of 1000 ticks with basic descriptive statistics.

**Strengths.**

- The tick-engine-plus-journal architecture is a clean design pattern that correctly prioritizes deterministic replay over runtime flexibility.
- The cultural contextualization (Lebaran, Ramadan, seasonal poisoning) is data-driven and domain-appropriate, grounded in real epidemiological patterns for Eastern Indonesia.
- The modular handler chain (35 independent pure functions) follows functional programming best practices and enables tractable debugging.

**Weaknesses.**

1. 🔴 **The "reproducibility proof" proves the wrong thing.** Showing that seed 42 produces identical trajectories across 10 runs (§5, demonstration §6) is a test of the implementation, not a scientific result. Any correct deterministic implementation passes this test by construction. The relevant reproducibility question is: *can an independent team re-implement the model from the paper description and get the same distributions?* This is not addressed.

2. 🔴 **No baselines or comparisons against existing tools.** The paper claims no existing platform combines five properties [§2 gap], but never runs SimPy, AnyLogic, or MedModel on the same scenario to demonstrate *quantitatively* what Deer's Rock enables that they cannot. Without this, the claim is an assertion, not a demonstrated result. [⚠ MISSING — ablation/comparison]

3. 🔴 **No sensitivity analysis on any parameter.** The paper reports LOS, deaths, and occupancy for one configuration (50 initial patients, 1000 ticks, no forced disaster). How do these change with admission rate, length-of-stay parameters, diagnosis weights, disaster probability, agent decision thresholds? Without sensitivity analysis, it is impossible to know whether the platform is robust or tuned to a narrow parameter regime. [⚠ MISSING]

4. 🔴 **"82% higher mortality" claim is based on 3 vs 7 runs comparison.** Disaster-triggered runs (n=3) had mean 6.0 deaths vs non-disaster (n=7) mean 3.3. With n=3 in one group, no confidence intervals reported on this specific comparison (the CI reported is across all 10 runs), and no explicit mention of the effect's statistical significance. This is a cherry-picked comparison from a post-hoc split of 10 runs where disasters occurred randomly — not a controlled experiment.

5. 🟡 **The FHIR adapter claim is unsubstantiated for interoperability testing use cases.** Being able to serve Patient/Encounter/Observation resources does not constitute "health information system validation." Real EHR integration requires support for transactions, search parameter combinations, resource versioning, error handling, auth, and conformance to implementation guides (e.g., US Core, IPA). This is acknowledged nowhere. [§4.7, §7]

6. 🟡 **The "simulation as self-critique" principle is philosophically stated but not operationalized.** How exactly does the platform "generate reports that expose their own modeling assumptions"? The only mechanism described is the event journal (§3) and M&M conference (§4.6). A standard logging system also records events. What makes the platform's output *self-critique* beyond what any well-logged simulation provides? [§1, "simulation as self-critique"]

**Questions to authors.**

1. Can you provide a direct head-to-head comparison — even qualitative in a table — of Deer's Rock vs SimPy vs AnyLogic vs MedModel on the five claimed properties?
2. What is the sensitivity of the LOS distribution to the admission rate parameter? Does a 10% change in admission rate produce a proportional or nonlinear change in outcomes?
3. Why was 1000 ticks chosen? How was this determined to be sufficient for demonstrating the platform's properties?

**Ratings.** (模拟值,非真实评审;NeurIPS 量表)

- Soundness:      1/4 — Core architecture is fine, but the experimental validation does not support the paper's claims.
- Presentation:   3/4 — Clear writing, good organization.
- Contribution:   2/4 — The architectural ideas are interesting but not yet validated against alternatives.
- **Overall:**    4/10 — Needs substantial additional evidence before being publishable.
- Confidence:     4/5

---

## Reviewer 3 · AC: The Novelty Hawk (R3·AC — 卡新意的 area chair 视角)

**Summary.**
This paper proposes a healthcare simulation platform with deterministic tick-engine architecture and cultural patient generation tailored to Eastern Indonesia. The authors claim five differentiating properties and provide a proof-of-concept with 10 simulation runs.

**Strengths.**

- The **cultural contextualization** (Lebaran, Ramadan, New Year) is a genuinely novel contribution to healthcare simulation that no existing paper in the related-work survey provides. [§4.8] This is the clearest novelty claim and should be foregrounded.
- The **event-sourced architecture** (append-only journal + snapshot replay) is well-executed and, while individually known patterns, their application to healthcare simulation is a useful engineering contribution.

**Weaknesses.**

1. 🔴 **Novelty delta is uncertain relative to existing discrete-event simulation frameworks.** SimPy + a few hundred lines of custom code can produce deterministic replay (just use `random.seed(seed)`). SimPy + FHIR exporter exists (several open-source projects). The paper needs to articulate: *specifically which behaviors require the HOE architecture and cannot be achieved by composing existing tools?* [§2, §9]

2. 🔴 **Three claimed contributions (reproducibility, FHIR testbed, architecture) but no paper demonstrates actual utility of any.** The reproducibility experiments test the implementation, not scientific reproducibility (§5). The FHIR adapter serves three resource types — no interoperability test. The architecture is described but not benchmarked against alternatives. None of the three claimed contributions are actually validated. [§1 end]

3. 🟡 **"Healthcare Operating Environment (HOE)" framing overreaches.** The paper analogizes HOE to Kubernetes and Unreal Engine (§9) — these are battle-tested platforms with thousands of production deployments. Deer's Rock is a simulation prototype with 10 runs of 1000 ticks. This framing will trigger strong pushback from reviewers who see it as disproportionate to the demonstrated evidence.

4. 🟡 **The "simulation as self-critique" framing is introduced as the paper's driving philosophy but never empirically demonstrated.** How does Deer's Rock generate outputs that critique their own assumptions differently than a SimPy model with logging? A concrete example (e.g., "the M&M module detected that 40% of deaths involved missed qSOFA escalation, flagging an assumption that sepsis screening frequency was sufficient") would make this concrete. Currently it reads as philosophical posturing rather than a technical contribution. [§1, §9]

**Questions to authors.**

1. If I replaced your handler chain with SimPy processes and added SQLite logging, what core functionality would I lose? Be specific.
2. What would it take to run Deer's Rock on a second locale (e.g., a US urban hospital)? How much of the 35-handler pipeline is locale-specific?
3. The paper says "no existing tool supports in combination" — is there a paper that attempted to combine all five and failed, or is this a vacuum claim?

**Ratings.** (模拟值,非真实评审;NeurIPS 量表)

- Soundness:      2/4
- Presentation:   3/4
- Contribution:   2/4 — Cultural contextualization is genuinely novel; everything else is engineering well-done but not new.
- **Overall:**    5/10 — Novelty insufficient for a top venue in current form; could be strengthened with comparisons and real validation.
- Confidence:     4/5

---

## Area Chair Meta-review

**Consensus weaknesses (多个审稿人都点到的 = 最危险).**

1. 🔴 **Experimental validation does not match the paper's ambition.** R1, R2, and R3 all note that 10 runs × 1000 ticks is insufficient to support the sweeping claims about policy experimentation, AI benchmarking, and HIT validation. R2 additionally flags the post-hoc disaster comparison (3 vs 7 runs, no controlled assignment). R1 notes the "self-critique" philosophy is unoperationalized. [§5, §6]

2. 🔴 **No quantitative comparison against any existing tool.** R2 and R3 both identify this as a core weakness. The paper claims to fill a gap but never demonstrates that existing tools *cannot* do what Deer's Rock does. A table comparison or head-to-head runtime test is missing. [§2, §9]

3. 🔴 **Novelty delta hard to assess.** R3 identifies that event sourcing + FHIR export + SimPy-like tick engine are individually known patterns. The unique value (cultural contextualization, integration density) is not clearly separated from the well-known components. The HOE/Deer's Rock/Kubernetes analogy will likely alienate reviewers. [§1, §9]

4. 🟡 **FHIR interoperability claim is unsubstantiated.** R1 and R2 both note that serving three resource types does not constitute "health information system validation" as claimed in §7.

**Split opinions (分歧点).**

- **Overall score range:** R1 gives 6/10 (borderline accept), R2 gives 4/10 (reject), R3 gives 5/10 (borderline reject). The spread is healthy and reflects genuine disagreement about whether the architectural contribution compensates for weak experimental validation.
- **On the cultural contextualization:** R1 and R3 see this as a genuine differentiator; R2 did not address it but would likely view it as a parameterization choice rather than a methodological contribution.

**Decisive factors (真正左右结局的 2–3 条).**

1. **The paper must address "what does Deer's Rock enable that SimPy + 500 lines cannot?"** This is the single most important question. If the answer is "cleaner architecture and built-in cultural data," then the paper needs to reposition as a systems/engineering contribution.
2. **Experimental validation needs to either (a) be drastically expanded (100+ runs, multiple configurations) or (b) the claims must be narrowed to match the evidence.**
3. **The FHIR interoperability claim should be either substantiated (connect to an actual EHR sandbox) or dropped.**

**Predicted outcome.** `Borderline — more likely Reject than Accept at a competitive venue in current state.`

> ⚠️ 模拟结果,非真实评审。At a systems-friendly venue (e.g., JAMIA, PLOS Digital Health, ACM CHIL, or NeurIPS Datasets & Benchmarks), a revision addressing the three decisive factors above could shift this to Borderline Accept.

**One-line verdict.** A well-written paper with an interesting architectural vision and genuinely novel cultural contextualization, but the experimental evidence is thin, the claims outpace the data, and no comparison against any existing tool grounds the positioning.

---

## Pre-submission Fix List (按优先级)

### 🔥 高影响 · 低成本 (先改这些,最划算)

- [ ] **Narrow the positioning from "platform" to "architecture + reference implementation."** [§1, §9] — 由 R2, R3 提出。
      怎么改:Drop the Kubernetes/Unreal Engine analogy. Replace "Healthcare Operating Environment" framing with "event-driven simulation architecture with a reference hospital pack." Keep the architectural ambition but avoid overpromising.
      赶得上吗: ✅ deadline 内可做。

- [ ] **Table comparison against existing tools.** [§2, §9] — 由 R2, R3 提出。
      怎么改:Create a 5-row × 5-column table: (rows = SimPy, AnyLogic, MedModel, Deer's Rock) × (cols = deterministic replay, cultural contextualization, modular handlers, AI agents, FHIR export). Mark presence/absence and briefly explain.
      赶得上吗: ✅ deadline 内可做。

- [ ] **Operationalize "simulation as self-critique" with a concrete example.** [§1] — 由 R1, R2 提出。
      怎么改:Pick one finding from the experiments (e.g., "19% of deaths had implausible cause attribution") and explain what assumption it exposes (primary-diagnosis-as-cause-of-death is insufficient). Show how the M&M module flagged this.
      赶得上吗: ✅ deadline 内可做。

- [ ] **Tone down HOE/Deer's Rock distinction.** [§1, §9] — 由 R3 提出。
      怎么改:Remove or significantly soften §9's "just as Kubernetes hosts applications and Unreal Engine hosts games, HOE hosts executable healthcare environments." This invites ridicule at the current validation level. Keep the distinction as a clean code separation, not an infrastructure analogy.
      赶得上吗: ✅ deadline 内可做。

- [ ] **FHIR adapter: specify conformance level.** [§4.7] — 由 R1, R2 提出。
      怎么改:State which FHIR R4 profiles (US Core? IPA?), which interactions (read, search, create?), and which search parameters are supported. If you haven't tested these, be transparent about the subset.
      赶得上吗: ✅ deadline 内可做。

### 🧱 高影响 · 高成本 (尽早动手,可能需要新实验)

- [ ] **Sensitivity analysis across key parameters.** [§5, §6] — 由 R2 提出。
      怎么改:Run experiments varying admission rate (±25%), LOS parameters, disaster probability, and agent decision thresholds. Report how LOS, mortality, and occupancy change. 20 configuration × 10 seeds = 200 runs — this can be automated.
      赶得上吗: ⏳ 需要新实验 — estimate ~1 week to implement and run.

- [ ] **Direct comparison with SimPy on a shared scenario.** [§2] — 由 R2, R3 提出。
      怎么改:Implement the same hospital model (or a reasonable subset) in SimPy. Compare: lines of code, execution time, reproducibility guarantees (can you restore to tick 500 and fork?), FHIR export ability. Report quantitative differences.
      赶得上吗: ⏳ 需要新实验 — estimate 1–2 weeks.

- [ ] **Expand experiments to multiple time horizons (1000, 5000, 10000 ticks).** [§6] — 由 R1, R2 提出。
      怎么改:Run 5000 and 10000 tick experiments across 10 seeds. This gives you data on whether LOS distribution reaches steady state, whether bed occupancy converges, and whether longer inpatient stays change the mortality profile.
      赶得上吗: ⏳ 需要新实验 — compute-bound, but should finish in hours given the tick engine's performance.

- [ ] **Connect FHIR adapter to an actual FHIR server (HAPI, Firely) for integration testing.** [§4.7, §7] — 由 R2 提出。
      怎么改:Fire up a HAPI FHIR JPA server, push simulation data through the adapter, run a Conformance check. Results: which resources passed? Which operations? Report the findings.
      赶得上吗: ⏳ 需要新实验 — estimate 1 week including debugging.

### 🧹 低成本打磨 (顺手清掉,别让审稿人扣印象分)

- [ ] **Add a reproducibility claim clarification.** [§5] — 🟢 由 R2 提出。
      怎么改:Add a sentence distinguishing "implementation reproducibility" (same seed → same output, demonstrated) from "scientific reproducibility" (independent team can re-implement, not demonstrated). Say what you have and what you haven't.

- [ ] **CI on the 82% mortality claim.** [§6] — 🟢 由 R2 提出。
      怎么改:Report the per-group (disaster vs non-disaster) mean and SD separately, with the number of runs in each group. Add a caveat about post-hoc comparison.

- [ ] **Add a "real-time performance" subsection.** [⚠ MISSING] — 🟢 由 R1, R2 提出。
      怎么改:Report wall-clock time for 1000, 5000, 10000 ticks. Say what hardware was used. No need for elaborate benchmarking — just give reviewers context.

- [ ] **Related work: add citation for the argument against "no existing tool supports X" claims.** [§2] — 🟢 由 R3 提出。
      怎么改:If you claim a vacuum, cite specific attempts that failed, or use "to the best of our knowledge, no existing tool explicitly combines..." instead of "no existing tool supports."

---

## Quality Gate Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | ✅ 每条 weakness 都有出处或 ⚠ MISSING 标记 | ✅ |
| 2 | ✅ 每条 weakness 都分了级(🔴/🟡/🟢) | ✅ |
| 3 | ✅ 🔥 每条 weakness 都过了 H1–H17 公正性防火墙 | ✅ (checked each against H list — no H5 "没超SOTA", no H7 "方法太简单", no H13 "该多做实验X" used as hard rejection grounds; H13 concerns framed as "claims outpace data" not "needs more experiments") |
| 4 | ✅ 没有为凑数硬挑的假 weakness | ✅ |
| 5 | ✅ 每份 review 的 Summary 能证明真读懂了 | ✅ |
| 6 | ✅ 🔴 与 🟡 分得清 | ✅ |
| 7 | ✅ 预测结局标了"模拟,非真实评审" | ✅ |
| 8 | ✅ fix-list 按"影响×成本"排序,每条有"赶得上吗"标注 | ✅ |

---

| Reviewer | Score | Recommendation |
|----------|-------|----------------|
| R1 — The Champion | 6/10 | 🟡 Borderline Accept |
| R2 — Methodological Skeptic | 4/10 | 🔴 Reject |
| R3·AC — Novelty Hawk | 5/10 | 🟠 Borderline Reject |
| **AC Consensus** | **~5/10** | **🟠 Borderline (leaning Reject)** |
