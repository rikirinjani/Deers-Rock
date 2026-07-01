# Peer Review Simulation

> **Final Decision: 🟠 Major Revision** | Overall Score: **6/10**

## Editor-in-Chief Decision

**Decision:** 🟠 Major Revision
**Score:** 6/10

This is an ambitious and well-written manuscript describing an event-driven healthcare simulation platform with genuinely novel architectural contributions — deterministic replay, culturally-contextualized patient generation, and FHIR interoperability in a single framework. However, the paper's central tension is unresolved: it claims to establish a "new category" of simulation platform while presenting demonstration results from only 16.7 hours of simulated time, with no real-world validation, a 19% implausible cause-of-death rate, and an average length of stay of 83 simulated minutes for a referral hospital. The architecture is compelling; the evidence that it works as claimed is not yet sufficient. The auxiliary documents (research-calibration.md, proposals) reveal a healthy self-awareness of these gaps, which strengthens the project's credibility but does not substitute for addressing them before publication.

---

## Reviewer Reports

### Reviewer 1: Methodology Expert

**Recommendation:** 🟠 Major Revision | **Score:** 5/10

**Overall impression:** The paper presents an elegant architecture but the experimental demonstration falls short of what is needed to support the claimed contributions.

**Major Concerns:**
- **N=10 runs at 1000 ticks is insufficient for reproducibility claims.** At 1 tick/min, 1000 ticks represents only ~16.7 hours of simulated hospital operations. A referral hospital runs 24/7/365. The 95% CIs reported (mortality ±1.2 deaths, LOS ±6.4 ticks) describe variance across 10 seeds, not statistical confidence in the model's behavior. Without running to at least 100,000 ticks (69 days) or demonstrating steady-state equilibrium, the claim that the platform produces "consistent outcome distributions" is premature. The observed bed occupancy of 98% (130.9/133) suggests the system has not reached equilibrium — it is saturating.
- **Length of stay is clinically implausible.** The average LOS of 82.9 ticks = ~83 minutes for a Tier A referral hospital. Even accounting for the bimodal distribution (ED fast-track + scheduled inpatients), an average of 83 minutes means either the inpatient stays are nowhere near long enough or the ED volume completely dominates the average. Paper text acknowledges this as a "limitation" but the abstract and conclusion present the LOS as a demonstration result rather than a calibration artifact.
- **19% implausible cause-of-death attribution is a serious modeling flaw.** A patient dying of "hyperlipidemia" is not a minor edge case — it indicates that the mortality model lacks a pathophysiological chain. The paper's workaround (aggregating to infectious vs. NCD categories) partially mitigates this but does not fix the underlying modeling error. This should be flagged as a HIGH-severity issue, not a future-work item.
- **Agent learning loop cannot be validated.** With <5 encounters per diagnosis across 1000 ticks, the "learning" mechanism has insufficient sample size to converge. The experiments-proposal.md (E3) correctly flags this: "Expect no statistically significant difference." This raises the question: why is the learning loop presented as a key feature when the authors' own research plan predicts it will not work at the demonstrated time scale?

**Minor Suggestions:**
- Report the actual number of encounters per ICD code (not totals) to substantiate the sparsity claim.
- Include a power analysis for the N=10 runs: what effect size can be detected at 10 replications with the observed variance?
- The mulberry32 PRNG should be cited or its properties briefly justified.

---

### Reviewer 2: Domain Specialist

**Recommendation:** 🟡 Minor Revision | **Score:** 7/10

**Overall impression:** The architectural vision is compelling and well-articulated. The five claimed properties (deterministic replay, cultural contextualization, modular composability, AI agent support, FHIR interoperability) are genuinely unduplicated in existing platforms. The related work section is fair and thorough. The paper's philosophy of "simulation as self-critique" is intellectually mature and sets the right expectations.

**Major Concerns:**
- **Related work omissions.** The paper cites SimPy, AnyLogic, and MedModel but does not discuss SOFA (Simulation Open Framework Architecture), MASON, or GAMA — agent-based simulation platforms that support modular composition and have been applied to healthcare. The claim that "no existing platform" provides these five properties is likely true, but the comparison set is narrow. Additionally, the digital twin literature is richer than cited: the NHS DIGIT programme reference (ref 9) is a URL, not a peer-reviewed source.
- **Cultural contextualization claim needs sharper evidence.** The calendar engine (Ramadan, Lebaran, New Year) is genuinely novel and is the strongest differentiator. However, the paper presents no evidence that these cultural modifiers produce clinically realistic admission patterns. Are the surge multipliers (1.6x for Lebaran) based on published Indonesian hospital admission data, or are they author estimates? Without calibration, this feature remains a demonstration of mechanism, not a validated capability.
- **The "simulation as self-critique" framing is philosophically interesting but underdeveloped in the paper.** The abstract promises that reports "expose their own modeling assumptions." In practice, the paper describes the architecture and presents results but does not demonstrate self-critique in action — e.g., a section where the simulation identifies a surprising pattern and traces it to a specific modeling assumption. The M&M conference module is a start, but it is described as a feature rather than an example of the philosophy in practice.

**Minor Suggestions:**
- The papers/proposals documents reveal a multi-paper strategy (Paper 2: systems engineering, Paper 3: runtime). Consider explicitly positioning this as "Paper 1 of N" to clarify scope.
- Indonesia context strategy (lead with it in Paper 1, de-emphasize in subsequent papers) is sound. The platform-paper.md appendix is insightful and should be distilled into the main manuscript's framing.
- Constitution amendments (proposed-constitution-amendments.md) show strong governance thinking. Consider citing the project's governance model briefly as a reproducibility mechanism.
- The reference list has references 9 and 10 out of sequential order and some refs (11-14) are tangentially relevant. Trim the reference list to the most impactful citations.

---

### Reviewer 3: Devil's Advocate

**Recommendation:** 🔴 Major Revision | **Score:** 5/10

**Overall impression:** This is a well-written paper about a platform that does not yet do what it claims to do. The gap between architectural ambition and demonstrated results is wider than the paper's confident tone suggests.

**Major Concerns:**
- **The emperor has no data.** The paper describes 9 departments, 30+ agent roles, and 7 disaster types, but the experimental demonstration covers only 1000 ticks (16.7 hours). How many of the 9 departments actually processed meaningful events in 16.7 hours? Dialysis sessions run 3-4 hours. Radiotherapy fraction schedules span weeks. CSSD sterilization cycles take 30-60 minutes. In 1000 ticks, most of these departments likely processed zero or trivial events. The platform may compose 35 handlers per tick, but the throughput data (780 encounters, 500 lab orders, 500 medication orders) describes a very low-volume clinic, not a "full Tier A referral hospital."
- **The FHIR adapter is not validated.** The paper states the FHIR R4 adapter "successfully exposed" resources. Successfully exposed to what? Was it tested against an actual EHR sandbox? Did an external consumer successfully read and interpret the data? Simply serving JSON at an endpoint does not constitute FHIR compliance. The adapter's claim that it enables "a new testing paradigm" for HIS validation requires at minimum a demonstration of a real FHIR client consuming the simulation data.
- **Cause-of-death: 19% implausible is not a limitation, it's a fatal flaw for the mortality analysis.** If nearly 1 in 5 deaths in the simulation have an incorrect cause assigned, then any mortality analysis at the ICD level is unreliable. The paper's workaround (aggregating to infectious vs. NCD) is reasonable for the present paper, but the cause-of-death modeling gap undermines the entire mortality analysis as evidence of the platform's clinical fidelity. This should be listed as a HIGH-severity methodological concern, not a future enhancement.
- **Counterfactual claims are aspirational, not demonstrated.** The paper emphasizes "counterfactuals by construction" as a design principle, but the experimental section reports only default runs (no counterfactuals). Not a single branching experiment is demonstrated. The infrastructure exists (snapshots, seeds), but the paper presents zero counterfactual results. This is the central claim of the paper's philosophy, and it is entirely unsubstantiated by evidence.
- **The non-falsifiable "platform distinction" is a rhetorical shield.** The paper argues that HOE is the architecture and Deer's Rock is the reference implementation, and that the architecture is the contribution, not the algorithm. This framing makes it difficult to falsify: if the hospital simulation fails to validate, the authors can pivot to "but the architecture is still sound." The paper should commit to specific, testable claims about the hospital model's fidelity and state what would constitute failure.

**Minor Suggestions:**
- The constitution amendments and research-calibration.md documents are more honest about the project's limitations than the main paper. Consider bringing that level of transparency into the manuscript's limitations section.
- The Australian wildfires are a notable gap in the disaster scenarios for Indonesia (which experiences significant fire events). Consider the completeness of the 7 disaster types.
- The paper mentions "M&M conference" generating structured data for AI explainability research, but no example output is shown. A representative example in supplementary material would strengthen this claim.

---

## Final Decision: Major Revision

### Priority Action Items

- [ ] **Run experiments to at least 50,000-100,000 ticks** to demonstrate steady-state behavior, not just startup transients. The 98% bed occupancy at 1000 ticks is a saturation artifact, not a meaningful result.
- [ ] **Fix cause-of-death attribution** or explicitly classify the 19% implausible rate as a HIGH-severity limitation that invalidates ICD-level mortality analysis, and adjust all mortality claims accordingly.
- [ ] **Demonstrate at least one counterfactual experiment** (branch from a snapshot, change one variable, report outcome diff) to substantiate the paper's central philosophical claim.
- [ ] **Validate the FHIR R4 adapter** against a real or sandboxed EHR system and report the results, or downgrade the interoperability claims.
- [ ] **Calibrate length of stay** to clinically plausible values (days, not minutes) before presenting LOS as a demonstration result. The average 83-minute stay undermines medical credibility.

| Reviewer | Score | Recommendation |
|----------|-------|----------------|
| Editor-in-Chief | 6/10 | Major Revision |
| Methodology Expert | 5/10 | Major Revision |
| Domain Specialist | 7/10 | Minor Revision |
| Devil's Advocate | 5/10 | Major Revision |
