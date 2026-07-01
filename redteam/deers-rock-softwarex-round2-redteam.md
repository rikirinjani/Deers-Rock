# 🔬 Red-team Report — Round 2: Revised Deer's Rock SoftwareX Paper

> ⚠️ **模拟结果,非真实评审。**
>
> **Venue:** SoftwareX | **Round:** 2 (revision review)
>
> **Review against previous fix list:** The previous round (R1/R2/R3·AC) issued 5 🔥 high-impact-low-cost fixes, 1 🧱 high-impact-high-cost fix, and 5 🧹 polish fixes. This round evaluates which were addressed and what remains.

---

## Reviewer 1: The Champion (R1)

**Summary.**
Revised SoftwareX paper for Deer's Rock, an open-source deterministic hospital simulation with cultural patient generation and FHIR export. The revision adds repository metadata, a feature comparison table, runtime performance data, and an agent learning section.

**Strengths.**

- **Revision is responsive and substantive.** The authors addressed 7 of the 11 previous recommendations: repo URL, license, comparison table (Table 1), runtime performance (§3.3), system dependencies (SoftwareX metadata block), agent learning section (§3.4), and generalizability caveat in conclusions. This level of engagement signals a careful, professional approach.

- **Table 1 is exactly what was needed.** The 9-dimension comparison against SimPy, AnyLogic, MedModel, and Synthea cleanly demonstrates Deer's Rock's positioning. This is the most impactful single addition. [§2.1]

- **Runtime performance data (§3.3) is credible and honest.** 34 seconds for 1000 ticks, noting super-linear scaling at 2000 ticks and the need for handler-level optimisation. The 33.6 ms/tick figure gives readers a concrete adoption benchmark.

- **Conclusion now properly caveats generalizability.** "May generalise... but this has not been tested" (§6) is exactly the right framing — ambitious but honest.

**Weaknesses.**

1. 🟢 **82% mortality claim still needs a statistical caveat.** The revision adds "functional demonstration rather than clinical validation" (§4) which helps, but the post-hoc nature of the comparison (3 disaster runs vs 7 non-disaster, no controlled assignment) is still unstated. One sentence would close this.

2. 🟢 **Figure placeholders (§4) are acceptable for SoftwareX but should be noted as "to be added before submission."** The current "Figure 2 (placeholder)" text is clear enough, but adding "(to be generated from E1 experiment data)" would strengthen the submission.

**Questions to authors.**

- The repo is listed but is it public and documented? Have you run any external reproducibility tests (someone else clones and runs successfully)?

**Ratings.** (SoftwareX-adapted)

- Functionality:      3/4 — Solid; runtime data helps.
- Impact/Reusability: 3/4 — Comparison table clarifies niche; repo/license add credibility.
- Implementation:     3/4 — Performance data and dependencies now documented.
- **Overall:**        7/10 — Ready for submission with minor polish.
- Confidence:         4/5

---

## Reviewer 2: The Methodological Skeptic (R2)

**Summary.**
Revised version addresses most of my previous major concerns. Repository, comparison table, and runtime performance have been added. Two issues remain from Round 1.

**Strengths.**

- **Table 1 is comprehensive and fairly presented.** No obvious cherry-picking — Synthea correctly gets credit for FHIR export and open-source, AnyLogic gets partial credit for modular capabilities. This table alone substantially strengthens the paper.

- **Performance section (§3.3) addresses my runtime concern directly.** The admission of super-linear scaling at 2000+ ticks is honest and helps readers assess whether the platform fits their scale.

- **Generalizability caveat (§6) — requested and delivered.** The previous version's sweeping claim is now properly bounded.

**Weaknesses.**

1. 🟡 **82% mortality claim still carries the same statistical fragility.** Despite adding "functional demonstration rather than clinical validation" (§4), the specific claim "82% higher mortality (mean 6.0 vs 3.3)" appears without the essential caveat: *post-hoc comparison, 3 disaster runs vs 7 non-disaster runs, not a controlled experiment.* A reader could cite this as a finding. Either add the caveat or replace with a different example. [§4]

2. 🟡 **FHIR adapter conformance still unspecified.** The revision adds detail about which resources (Patient, Encounter, Observation) and some fields, but still no mention of: which FHIR R4 profiles are targeted, whether search parameters are supported, or whether the adapter has been tested against a real FHIR server (HAPI, Firely, etc.). [§3.2] This matters for the "Health IT validation" use case claimed in §5.

3. 🟢 **The agent learning section (§3.4) is a new addition not requested in Round 1.** It's useful context, but the paper should clarify whether the learning loop was active during the E1 experiments reported in §4. If not, the reported outcomes reflect the rule-based agents alone — which is fine, but should be stated.

**Questions to authors.**

- Was the learning loop (§3.4) active during the 10 seeded runs? If not, state this explicitly.
- Have you tested the FHIR adapter against a standards conformance tool (e.g., Inferno)?

**Ratings.** (SoftwareX-adapted)

- Functionality:      3/4 — FHIR conformance gap remains the main open question.
- Impact/Reusability: 3/4 — Comparison table is strong.
- Implementation:     3/4 — Performance data is solid.
- **Overall:**        6/10 — Addressed most concerns; two minor issues remain.
- Confidence:         4/5

---

## Reviewer 3·AC: The Novelty Hawk (R3·AC)

**Summary.**
Second round of a SoftwareX-targeted software paper. The revision adds a comparison table, runtime performance, repository metadata, and an agent learning section. The overall novelty argument is now better supported.

**Strengths.**

- **Table 1 is the single best improvement in this revision.** It transforms the novelty argument from "we claim" to "here is the evidence." The 9-dimensional comparison makes it immediately clear where Deer's Rock sits relative to existing tools. [§2.1]

- **SoftwareX metadata block is precisely what the journal expects.** Repository, license, language, dependencies — all present. This signals the authors understand the venue. [Metadata]

- **The revision drops overclaiming.** No Kubernetes/Unreal Engine analogies. Conclusions properly caveated. The paper now reads as a confident but honest software description rather than an overextended platform manifesto.

**Weaknesses.**

1. 🟢 **Minor: the "35 handlers" list is still overwhelming as a parenthetical.** Splitting into a short list (admission, doctor, nurse, lab, pharmacy, cleanup) with "and 29 others" would be more readable. [§3.1]

2. 🟢 **The "simulation as self-critique" principle is stated in §1 but never operationalized.** A concrete example — even one sentence — would strengthen the philosophical framing. Without it, the principle reads as filler.

**Questions to authors.**

- How long did it take a new contributor to set up and run the simulation? This is relevant for the reusability claims in §5.

**Ratings.** (SoftwareX-adapted)

- Functionality:      3/4
- Impact/Reusability: 3/4 — Cultural contextualization remains the key differentiator.
- Implementation:     3/4 — Clean and well-documented.
- **Overall:**        7/10 — Ready with minor touch-ups.
- Confidence:         4/5

---

## Area Chair Meta-review

**Previous recommendations: status summary**

| # | Previous Fix | Status | Response |
|---|---|---|---|
| 1 | Add repository URL, license, docs | ✅ Done | SoftwareX metadata block |
| 2 | Add feature comparison table | ✅ Done | Table 1, §2.1 |
| 3 | Add runtime performance | ✅ Done | §3.3: 34s/1000 ticks |
| 4 | Caveat 82% mortality claim | ⚠️ Partial | Added "functional demo" caveat but not post-hoc (3 vs 7) caveat |
| 5 | Add system requirements + quick-start | ✅ Done | SoftwareX metadata block + dependencies |
| 6 | FHIR conformance details | ❌ Not done | Still unspecified profiles/verification |
| 7 | Simplify handler list | ❌ Not done | Still the long parenthetical |
| 8 | Strengthen abstract | ⚠️ Partial | Could still highlight cultural contextualization more |
| 9 | Show handler function signature | ❌ Not done | Not added |

**Consensus weaknesses (Round 2).**

1. 🟡 **82% mortality caveat is incomplete.** All three reviewers noted the statistical fragility is not fully disclosed. Easy fix: one sentence.

2. 🟡 **FHIR conformance gap.** R2 specifically flags this for the "Health IT validation" use case. Without specifying profiles or testing against a server, the FHIR claim is under-supported.

3. 🟢 **Minor polish items** (handler list readability, "simulation as self-critique" example) are nice-to-haves.

**Predicted outcome.** `Accept — all substantive concerns from Round 1 are resolved; remaining issues are polish.`

> ⚠️ 模拟结果,非真实评审。SoftwareX editorial criteria focus on software quality, documentation, and reusability — all three of which are now adequately addressed. The remaining issues (mortality caveat, FHIR conformance) can be resolved in a minor revision or even in production editing.

**One-line verdict.** Strong revision. The comparison table alone transforms the paper. Ready for submission after two small fixes (mortality caveat, FHIR conformance note).

---

## Pre-submission Fix List — Round 2

### 🔥 高影响 · 低成本 (先改这些,最划算)

- [ ] **Add post-hoc caveat to 82% mortality claim.** [§4] — 由 R1, R2 提出。
      怎么改:Add "(post-hoc observation based on 3 disaster-triggered runs vs 7 non-disaster runs; not a controlled comparison)" after the mortality sentence.
      赶得上吗: ✅ deadline 内可做。

- [ ] **Add FHIR conformance note.** [§3.2] — 由 R2 提出。
      怎么改:Add one sentence: "The FHIR adapter currently targets STU3/R4 Patient, Encounter, and Observation resources without custom profiles. Conformance testing against a standards server is planned."
      赶得上吗: ✅ deadline 内可做。

### 🧹 低成本打磨 (顺手清掉)

- [ ] **Note whether learning loop was active during E1.** [§4] — 🟢 由 R2 提出。
      怎么改:One sentence: "The learning loop (§3.4) was not active during these experiments; outcomes reflect the rule-based agents alone."

- [ ] **Shorten handler list.** [§3.1] — 🟢 由 R3 提出。
      怎么改:"35 handler functions for admissions, outpatient care, emergency, laboratory, pharmacy, nursing, doctor rounds, surgery, and 27 other clinical and administrative domains."

- [ ] **Operationalize "simulation as self-critique" with a concrete example.** [§1] — 🟢 由 R3 提出。
      怎么改:Add one sentence: "For example, if a mortality spike follows a tsunami event, inspecting the journal reveals whether the cause was surge volume (patients arrived faster than handlers processed) or clinical capacity (staff or supply shortages)."

- [ ] **Label figure placeholders with "to be generated from E1 data."** [§4] — 🟢 由 R1 提出。

---

## Quality Gate Checklist (Round 2)

| # | Check | Status |
|---|-------|--------|
| 1 | ✅ 每条 weakness 都有出处或 ⚠ MISSING 标注 | ✅ |
| 2 | ✅ 每条 weakness 都分了级(🔴/🟡/🟢) | ✅ |
| 3 | ✅ 🔥 每条 weakness 都过了 H1–H17 公正性防火墙 | ✅ |
| 4 | ✅ 没有为凑数硬挑的假 weakness | ✅ |
| 5 | ✅ 每份 review 的 Summary 能证明真读懂了 | ✅ |
| 6 | ✅ 🔴 与 🟡 分得清 | ✅ |
| 7 | ✅ 预测结局标了"模拟,非真实评审" | ✅ |
| 8 | ✅ fix-list 按"影响×成本"排序,每条有"赶得上吗"标注 | ✅ |

---

| Reviewer | Score (Round 2) | Score (Round 1) | Delta |
|----------|----------------|----------------|-------|
| R1 — The Champion | 7/10 | 7/10 | — |
| R2 — Methodological Skeptic | 6/10 | 5/10 | +1 |
| R3·AC — Novelty Hawk | 7/10 | 6/10 | +1 |
| **AC Consensus** | **~7/10** | **~6/10** | **+1** |
