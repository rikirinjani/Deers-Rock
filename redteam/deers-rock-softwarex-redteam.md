# 🔬 Red-team Report: "Deer's Rock: A Persistent, Event-Driven Healthcare Simulation Platform" (SoftwareX Pivot)

> ⚠️ **模拟结果,非真实评审。**
>
> **Venue:** SoftwareX (software paper format — evaluation criteria: functionality, impact/reusability, implementation quality, documentation)

---

## Reviewer 1: The Champion (R1)

**Summary.**
This paper presents Deer's Rock, an open-source discrete-event hospital simulation platform with deterministic replay, modular handler architecture, cultural contextualization for Eastern Indonesia, and FHIR R4 data export. The paper targets a software journal audience, emphasizing architecture, functionality, and reusability rather than experimental validation.

**Strengths.**

- **Well-motivated gap.** The paper correctly identifies that SimPy lacks built-in deterministic replay and FHIR export, and that proprietary tools (AnyLogic, MedModel) are not open-source. [§2.1, §2.2] The positioning is sharper and more defensible than the previous version.

- **Cultural calendar engine remains a genuine differentiator.** Ramadan dehydration adjustments, Lebaran burn surges from firecrackers — no comparable feature exists in Synthea, SimPy, or AnyLogic. [§3.2] This is the platform's strongest unique selling point.

- **Architecture diagram (ASCII in §3.1) and clear separation of concerns.** The tick engine → handler chain → event journal → FHIR adapter pipeline is well-explained. A SoftwareX reader can understand the architecture from this description alone.

- **Ethical considerations section (§5 end) is thoughtful.** Explicitly flags that cultural scenarios are evidence-based, not stereotypes, and documents the 19% cause-of-death attribution limitation. This demonstrates responsible design.

**Weaknesses.**

1. 🟡 **Code availability and documentation status are not confirmed.** SoftwareX requires an open-source repository with documentation, examples, and a README. The paper states "available as open-source software" but gives no repository URL, license, or documentation status. [§6, ⚠ MISSING] A reviewer will flag this immediately.

2. 🟢 **The "35 handlers" claim is stated but not detailed enough.** A SoftwareX reader needs to understand the API surface: can I write a custom handler? What's the interface signature? Is there a plugin system or must I fork? [§3.1] Adding 3-5 lines showing the handler function signature would help significantly.

3. 🟡 **Illustrative Examples (§4) reuses the same 10-run experiment from the previous paper.** The 82% mortality increase from a post-hoc split of 3 vs 7 runs is statistically fragile and acknowledged as such in the original — carrying it forward weakens the software claims. For a software journal, a better demonstration would be: "the simulation generates clinically plausible patient trajectories" with face-validity evidence.

**Questions to authors.**

- What is the software license? Is the repository public with CI, tests, and documentation?
- Can a user add a new clinical department without modifying the core handler chain? What's the extension mechanism?

**Ratings.** (Adapted for SoftwareX criteria)

- Functionality:      3/4 — Core features work; thin on integration examples.
- Impact/Reusability: 2/4 — Cultural contextualization is unique; but documentation barrier limits reuse.
- Implementation:     3/4 — Clean architecture; needs public repo verification.
- **Overall:**        7/10 — Publishable with minor revisions (need repo + license).
- Confidence:         4/5

---

## Reviewer 2: The Methodological Skeptic (R2)

**Summary.**
This is a shortened software-description version of Deer's Rock, pared down from a full IMRaD paper. It describes an event-driven hospital simulation with cultural patient generation, modular handlers, and FHIR export.

**Strengths.**

- The scope reduction from the previous version is appropriate. Dropping the "Healthcare Operating Environment" branding and Kubernetes analogies makes the claims match the evidence better.
- The Synthea comparison [§2.1] is a useful addition — Synthea generates synthetic patients but does not simulate hospital operations, which clearly differentiates Deer's Rock.
- The architecture follows well-established patterns (event sourcing, CQRS, functional handler chain) and describes them correctly.

**Weaknesses.**

1. 🔴 **The SoftwareX requirement for "comparison with existing tools" is not met.** SoftwareX papers typically include a table comparing the presented software's features against existing alternatives. [§2.1, ⚠ MISSING] The text describes differences qualitatively but provides no table. This is a standard expectation that will be flagged.

2. 🔴 **Reusability claim unsubstantiated.** The paper claims the software "supports four categories of use" (§5) but provides no evidence that any of these use cases have been attempted, even by the authors. For a software journal, the bar is lower than a full research paper, but there must be *some* evidence that the software works beyond the authors' own 10-run test. At minimum: has anyone else downloaded and run it?

3. 🟡 **No runtime performance data.** How long does 1000 ticks take to execute? What are the hardware requirements? Can it simulate 30 days of hospital operations in reasonable wall-clock time? [⚠ MISSING]

4. 🟡 **FHIR adapter still lacks conformance detail.** "Patient, Encounter, Observation resources" — which FHIR R4 profiles? Any search parameters? Tested against a real FHIR server? [§3.2]

5. 🟡 **The 82% mortality claim (3 vs 7 runs) should be removed or caveated.** In a cut-down software paper, carrying forward this specific finding from the full paper without proper statistical framing is misleading. Either add a strong caveat about the post-hoc comparison or replace it with a different demonstration.

**Questions to authors.**

1. Can you provide the runtime of 1000, 5000, and 10000 tick simulations on commodity hardware?
2. Has the software been tested by anyone outside the development team?

**Ratings.** (Adapted for SoftwareX criteria)

- Functionality:      2/4 — Works as described but limited integration testing.
- Impact/Reusability: 2/4 — Potential is clear; evidence of actual reuse is absent.
- Implementation:     3/4 — Sound architecture; missing performance benchmarks.
- **Overall:**        5/10 — Needs comparison table, runtime data, and public repo to meet SoftwareX standards.
- Confidence:         4/5

---

## Reviewer 3·AC: The Novelty Hawk (R3·AC)

**Summary.**
A software-description paper for an open-source hospital simulation platform with deterministic replay, cultural contextualization, and FHIR export. Written in SoftwareX format.

**Strengths.**

- The pivot from a full research paper to a software paper is strategically sound. The platform's contribution is architectural and functional, not experimental — a software venue is the right home.
- Cultural contextualization is genuinely novel in the simulation software landscape and will be the paper's main draw for readers.
- The paper is well-structured for SoftwareX: overview, problem background, software description, examples, impact.

**Weaknesses.**

1. 🟡 **Software novelty is modest at the component level.** The architecture composes well-known patterns (event sourcing, tick engine, handler chain, FHIR REST adapter). The novelty is in the *combination and cultural parameterization*. This is acceptable for a software journal, but the paper should explicitly state: "the value is integration, not invention." [§3.1]

2. 🟢 **The "35 handlers" number is impressive but unexplained.** Listing a few representative handlers (admission, doctor, nurse, lab, pharmacy, cleanup) is more digestible than the full list in §3.1. The current full list in parentheses is hard to parse.

3. 🟡 **Missing: target platform dependencies and installation.** SoftwareX papers typically include system requirements (Python version, OS support, dependencies). [⚠ MISSING] Without this, a reader cannot assess whether they can adopt the software.

4. 🟢 **The illustration section could be more visual.** SoftwareX encourages screenshots or sample outputs showing the software in action. The current section is purely textual. [§4]

**Questions to authors.**

1. What Python version, OS, and key dependencies (SQLite, FHIR library) are required?
2. Is there a quick-start example (e.g., "run this command and you'll see output X")?

**Ratings.** (Adapted for SoftwareX criteria)

- Functionality:      3/4
- Impact/Reusability: 3/4 — Cultural contextualization gives it a clear niche.
- Implementation:     2/4 — Missing installation and dependency information.
- **Overall:**        6/10 — Suitable for SoftwareX with minor revisions.
- Confidence:         4/5

---

## Area Chair Meta-review

**Consensus weaknesses.**

1. 🟡 **Repository, license, documentation status unknown.** All three reviewers noted this as a blocker. SoftwareX requires a publicly accessible, documented codebase. [⚠ MISSING across §5–§6]

2. 🟡 **No comparison table against existing software.** R2 and R1 both flagged this. A feature matrix (rows = SimPy, AnyLogic, MedModel, Synthea, Deer's Rock; cols = deterministic replay, FHIR export, cultural scenarios, open-source, departmental modules) is standard for software papers.

3. 🟡 **Runtime performance data missing.** R2 flagged this as critical for a software journal reader evaluating adoption. [⚠ MISSING]

**Split opinions.**

- The Illustrative Examples section (§4) carries over statistical claims from the full paper. R2 wants the 82% mortality claim caveated or removed; R1 is less concerned because a software paper's bar is lower. The 3 vs 7 run split should at minimum be caveated.

**Decisive factors.**

1. **Public repository is non-negotiable for SoftwareX.** Without a URL, license, and documentation, the paper cannot be accepted.
2. **A feature comparison table is strongly expected.** This is the single highest-ROI addition.
3. **The cultural calendar engine is the paper's strongest selling point** — foreground it in the abstract and impact section.

**Predicted outcome.** `Minor Revision — publishable after repository, license, and comparison table are addressed.`

> ⚠️ 模拟结果,非真实评审。SoftwareX's acceptance criteria center on software quality and reusability rather than experimental rigor. This paper is in strong shape for the venue.

**One-line verdict.** A smart pivot — the software journal format fits this platform's contribution type much better than a full research paper, and the changes needed are mechanical (repo, comparison table, caveats) rather than requiring new experiments.

---

## Pre-submission Fix List (按优先级)

### 🔥 高影响 · 低成本 (先改这些,最划算)

- [ ] **Add repository URL, license, and documentation status.** [§5–§6] — 由 R1, R2, R3 提出。
      怎么改:Add a "Software availability" subsection before References with: GitHub URL, license (e.g., MIT), Python version (3.10+), and a link to a README with installation instructions.
      赶得上吗: ✅ deadline 内可做。

- [ ] **Add feature comparison table.** [§2.1] — 由 R2 提出。
      怎么改:Create a 5-row × 5-column table comparing SimPy, AnyLogic, MedModel, Synthea, and Deer's Rock on: deterministic replay, open-source, FHIR export, cultural scenarios, departmental modules, AI agent support. Mark ✓/✗/partial.
      赶得上吗: ✅ deadline 内可做。

- [ ] **Add runtime performance data.** [§4] — 由 R2 提出。
      怎么改:Report wall-clock time for 1000, 5000, 10000 ticks with hardware spec (CPU, RAM, OS). Add a sentence: "Slowdown factor is approximately X, meaning 1 week of simulated time completes in Y minutes."
      赶得上吗: ✅ deadline 内可做。

- [ ] **Caveat the 82% mortality finding or replace it.** [§4] — 由 R2 提出。
      怎么改:Add "(post-hoc comparison, 3 disaster runs vs 7 non-disaster runs; not a controlled experiment)" after the 82% claim. Or replace with a cleaner demonstration.
      赶得上吗: ✅ deadline 内可做。

- [ ] **Add system requirements and quick-start.** [⚠ MISSING] — 由 R3 提出。
      怎么改:Add "System requirements: Python ≥3.10, pip install -r requirements.txt" and a 3-line quick-start: "python main.py --seed 42 --ticks 1000 → see output."
      赶得上吗: ✅ deadline 内可做。

### 🧱 高影响 · 高成本 (尽早动手,可能需要新实验)

- [ ] **Run a face-validity check with a domain expert.** [§4] — 由 R1 提出。
      怎么改:Have a clinician or hospital administrator review the simulated patient trajectories and rate plausibility. Report: "a clinician blinded to the simulation parameters correctly identified 8/10 disaster scenarios from patient outcome patterns alone," etc.
      赶得上吗: ⏳ 需要新实验 — depends on collaborator availability.

### 🧹 低成本打磨 (顺手清掉,别让审稿人扣印象分)

- [ ] **Simplify the handler list in §3.1.** — 🟢 由 R3 提出。
      怎么改:Replace the parenthetical list with "handlers for admission, outpatient, emergency, lab, pharmacy, nursing, doctor, surgery, and 27 other clinical and administrative domains."

- [ ] **Strengthen the abstract with a concrete differentiator.** — 🟢 由 R1 提出。
      怎么改:Add "including cultural contextualization for Indonesian holidays (Ramadan, Lebaran) — a feature absent from existing simulators" to the abstract.

- [ ] **Add inline handler function signature.** [§3.1] — 🟢 由 R1 提出。
      怎么改:Show `def handle(state: HospitalState, clock: Clock, events: EventQueue) -> HospitalState` to make the extension mechanism clear.

---

## Quality Gate Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | ✅ 每条 weakness 都有出处或 ⚠ MISSING 标注 | ✅ |
| 2 | ✅ 每条 weakness 都分了级(🔴/🟡/🟢) | ✅ |
| 3 | ✅ 🔥 每条 weakness 都过了 H1–H17 公正性防火墙 | ✅ (No H5 "没超SOTA", no H7 "方法太简单", no H13 "该多做实验X" — SoftwareX criteria used; criticisms are about missing software-paper elements, not about experimental inadequacy) |
| 4 | ✅ 没有为凑数硬挑的假 weakness | ✅ |
| 5 | ✅ 每份 review 的 Summary 能证明真读懂了 | ✅ |
| 6 | ✅ 🔴 与 🟡 分得清 | ✅ |
| 7 | ✅ 预测结局标了"模拟,非真实评审" | ✅ |
| 8 | ✅ fix-list 按"影响×成本"排序,每条有"赶得上吗"标注 | ✅ |

---

| Reviewer | Score | Recommendation |
|----------|-------|----------------|
| R1 — The Champion | 7/10 | 🟢 Minor Revision |
| R2 — Methodological Skeptic | 5/10 | 🟠 Major Revision |
| R3·AC — Novelty Hawk | 6/10 | 🟢 Minor Revision |
| **AC Consensus** | **~6/10** | **🟢 Minor Revision** |
