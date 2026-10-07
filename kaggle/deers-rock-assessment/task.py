import kbench

BASE = """You are a tough but fair principal-engineer assessor reviewing a deterministic hospital simulation platform. The owner wants an honest capability and risk review before relying on it for research or commercial use. Judge on 5 equally-weighted 0-5 criteria: core-premise, model-quality, simulation-output, clinical-plausibility, production-readiness. Be specific; quote evidence where useful. Do not be polite - be useful."""

CONTENT = """Deer's Rock is a deterministic hospital simulation engine for Eastern Indonesia (Makassar, Tier C hospital). Key facts:

**Architecture:** TypeScript event-driven simulation. 1 tick = 1 simulated minute. AI agents (doctor/nurse/pharmacist) make clinical decisions. 29+ API endpoints. FHIR R4 compliant.
**Tests:** 326 passed / 1 skipped (42 files). tsc clean. CI green.
**Determinism:** Fixed-seed replay produces identical trajectories (verified).
**100k tick benchmark (Kaggle CPU):** 33.12s total (330ms/tick, linear scaling). Before fix: 482.72s (superlinear O(n^2)).
**Clinical coverage:** 205 drugs (36 categories), 147 ICD-10 codes, 165 protocols, 165 CBG tariffs.
**Finance:** Claim lifecycle (submitted->verifying->adjudicated->paid|denied), BPJS/INA-CBG, payer mix (BPJS 82%/Ketenagakerjaan 8%/Private 7%/Self-pay 3%).
**Referral:** Geo hierarchy (Puskesmas->RS D->RS C->RS B->RS A), ESI-lite triage, ambulance dispatch (BLS/ALS), Jasa Raharja provenance.
**Live:** 16,800+ ticks, 1,997 patients, RSS 283MB/512MB. All non-Epic-X Epics complete.
**ADR-016:** Referral & Ambulance Architecture (accepted, wave 1+2 implemented).
**Epic IX M9.3 wave 2:** Just completed — ambulance dispatch + JR incident provenance.
**Roadmap:** 10 Epics (I-X). All non-Epic-X complete. Epic X deferred (commercial).
**Constraints:** No real patient data. Procedural generator. Calibration deferred to research phase."""

SECTIONS = [
    ("core-premise", "Is the deterministic-replay + seeded-RNG premise scientifically credible? Does the 1-tick=1-min scale make sense? Is a single Tier C hospital in Makassar defensible scope? What are the fundamental limitations vs. a calibrated digital twin?"),
    ("model-quality", "Is 205 drugs / 147 ICD / 165 protocols sufficient? How credible are INA-CBG claim rules? Does 326 tests provide confidence? What gaps limit research validity?"),
    ("simulation-output", "Does 100k-tick performance (33s, linear) validate production readiness? Are state sizes realistic? Is the claim pipeline economically plausible? What would 1M ticks look like (~5.5 min)?"),
]

SYNTH = """Synthesize the three sections. For each criterion (0-5): score, one-sentence justification with evidence, one-sentence risk. Then: top-3 fixes, top-3 strengths, overall verdict (Ready/Needs rework/Not ready), timeline to production."""


@kbench.task(name="deers-rock-platform-assessment", description="GPT-6 Astra review of Deer's Rock hospital simulation")
def deers_rock_assessment(llm) -> dict:
    sections = {}
    errors = 0
    for key, ask in SECTIONS:
        try:
            with kbench.chats.new("sec_" + key):
                resp = llm.prompt(BASE + "\n\n" + CONTENT + "\n\n" + ask,
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
    kbench.assertions.assert_true(len(sections) == 3, expectation="all sections produced")
    for key in sections:
        kbench.assertions.assert_true(len(sections[key].strip()) > 100, expectation=f"{key} non-empty")
    kbench.assertions.assert_true(errors == 0, expectation="all LLM calls succeeded")
    kbench.assertions.assert_true(len(verdict.strip()) > 100, expectation="verdict produced")
    return {"sections": list(sections), "errors": errors,
            "verdict": verdict[:2500], "report_chars": len(report)}
