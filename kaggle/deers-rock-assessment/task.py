"""
GPT-6 Astra assessment of Deer's Rock Hospital Simulation Platform.
Uses the same kbench pattern as review-agent-stack-v4.
"""
import kbench

BASE = """You are a tough but fair principal-engineer assessor reviewing a deterministic hospital simulation platform. The owner wants an honest capability and risk review before relying on it for research or commercial use. Judge on 5 equally-weighted 0-5 criteria: core-premise, model-quality, simulation-output, clinical-plausibility, production-readiness. Be specific; quote evidence where useful. Do not be polite - be useful."""

SECTIONS = [
    ("core-premise", """
Review the core premise: a deterministic, seeded, event-driven hospital micro-simulation for Eastern Indonesia (Makassar, Tier C hospital). It runs 100k ticks in ~33s on commodity CPU, uses AI agents (doctor/nurse/pharmacist) for clinical decisions, and supports counterfactual experimentation via branch replay.

Questions:
1. Is the deterministic-replay + seeded-RNG premise scientifically credible for a hospital simulation?
2. Does the 1-tick=1-minute time scale make sense for both short-term (ED) and long-term (chronic care) dynamics?
3. Is a single Tier C hospital in Makassar a defensible scope, or too narrow for generalizable claims?
4. What are the fundamental limitations of a procedural generator vs. a calibrated digital twin?
"""),
    ("model-quality", """
Review the model quality evidence:

**Formulary:** 205 drugs across 36 categories, with costs from Indonesia's e-catalogue.
**ICD-10:** 147 diagnosis codes with weighted probability distributions.
**Protocols:** 165 clinical protocols mapping diagnoses to treatment pathways.
**CBG tariffs:** 165 Indonesian Case-Based Grouping tariffs for BPJS billing.
**Payer mix:** BPJS (82%), Ketenagakerjaan (8%), Private (7%), Self-pay (3%).
**Tests:** 326 passed, 1 skipped across 42 test files. tsc clean.
**Determinism:** Fixed-seed replay produces identical trajectories (verified).
**Scaling:** Linear O(n) after event queue fix (14.6x speedup at 100k ticks).

Questions:
1. Is 205 drugs / 147 ICD codes / 165 protocols sufficient for a Tier C hospital sim?
2. How credible are the claim adjudication rules (INA-CBG causal denials)?
3. Does the test coverage (326 tests) provide confidence in clinical correctness?
4. What gaps remain in clinical knowledge that would limit research validity?
"""),
    ("simulation-output", """
Review the simulation output evidence:

**100k tick benchmark (Kaggle CPU, 2 vCPU, 8GB RAM):**
- Before fix: 482.72s total, ms/tick grew from 300 to 4827 (superlinear O(n^2))
- After fix: 33.12s total, ms/tick flat at ~280-330ms (linear O(n))
- 300 tests pass post-benchmark

**Live run:** 16,800+ ticks, 1,997 patients, RSS ~283 MB / 512 MB
**State:** 205 drugs, 36 categories, 131 beds, referral system with geo hierarchy
**Finance:** Claim lifecycle (submitted -> verifying -> adjudicated -> paid|denied)
**Referral:** ADR-016 wave 2 — ambulance dispatch (BLS/ALS), Jasa Raharja provenance

Questions:
1. Does the 100k-tick performance validate production readiness?
2. Are the state sizes (patients, encounters, charges) realistic for a Tier C hospital?
3. Is the claim pipeline (BPJS/INA-CBG) producing economically plausible outputs?
4. What would a 1M-tick run look like (~5.5 min estimated)?
"""),
]

SYNTH = """
Synthesize the three review sections into an overall verdict.

For each criterion score (0-5), give:
- The score
- One sentence of justification quoting specific evidence
- One sentence on the biggest remaining risk

Then provide:
1. A top-3 list of highest-priority fixes
2. A top-3 list of strongest properties to lead with
3. An overall verdict: "Ready for research" / "Needs rework" / "Not ready"
4. Estimated timeline to production readiness if applicable
"""


@kbench.task(name="deers-rock-platform-assessment", description="GPT-6 Astra review of Deer's Rock hospital simulation platform")
def deers_rock_assessment(llm) -> dict:
    """Astra review of the Deer's Rock hospital simulation platform."""
    sections = {}
    errors = 0
    for key, ask in SECTIONS:
        try:
            with kbench.chats.new("sec_" + key):
                resp = llm.prompt(BASE + "\n\n" + ask,
                                  extra_api_params={"max_tokens": 8000})
        except Exception as e:
            resp = "[ERROR] " + type(e).__name__ + ": " + str(e)[:300]
            errors += 1
        sections[key] = resp
    digest = "\n\n".join("### " + k + "\n" + v[-2000:] for k, v in sections.items())
    try:
        with kbench.chats.new("synthesis"):
            verdict = llm.prompt(SYNTH + "\n\n" + digest[:15000],
                                 extra_api_params={"max_tokens": 10000})
    except Exception as e:
        verdict = "[SYNTHESIS ERROR] " + type(e).__name__ + ": " + str(e)[:300]
        errors += 1
    lines = ["# Astra review: deers-rock-platform-assessment", ""]
    for key in sections:
        lines += ["## " + key.upper(), "", sections[key], ""]
    lines += ["## VERDICT", "", verdict, ""]
    report = "\n".join(lines)
    for p in ["deers-rock-assessment_output.md", "/kaggle/working/deers-rock-assessment_output.md"]:
        try:
            with open(p, "w", encoding="utf-8") as f:
                f.write(report)
        except Exception:
            pass
    for i in range(0, len(report), 3000):
        print(f"---REPORT-CHUNK {i // 3000}---")
        print(report[i:i + 3000])
    kbench.assertions.assert_true(len(sections) == 3,
                                  expectation="all review sections produced")
    for key in sections:
        kbench.assertions.assert_true(len(sections[key].strip()) > 100,
                                      expectation=f"section {key} non-empty")
    kbench.assertions.assert_true(errors == 0,
                                  expectation="all LLM calls succeeded")
    kbench.assertions.assert_true(len(verdict.strip()) > 100,
                                  expectation="verdict produced")
    return {"sections": list(sections), "errors": errors,
            "verdict": verdict[:2500], "report_chars": len(report)}
