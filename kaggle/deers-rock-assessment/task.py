@kbench.task(name="deers-rock-platform-assessment", description="GPT-6 Astra review of Deer's Rock hospital simulation")
def deers_rock_assessment(llm) -> dict:
    BASE = "You are a tough but fair principal-engineer assessor reviewing a deterministic hospital simulation platform. Judge on 5 equally-weighted 0-5 criteria: core-premise, model-quality, simulation-output, clinical-plausibility, production-readiness. Be specific; quote evidence. Do not be polite - be useful."
    CONTENT = "Deer's Rock: deterministic hospital sim for Eastern Indonesia (Makassar, Tier C). 326 tests pass, 1 skipped (42 files). tsc clean. CI green. Fixed-seed replay verified. 100k ticks = 33.12s on Kaggle CPU (linear O(n), 330ms/tick). Before fix: 482.72s (superlinear O(n^2)). 205 drugs, 147 ICD-10 codes, 165 protocols, 165 CBG tariffs. Claim lifecycle: submitted->verifying->adjudicated->paid|denied. Payer mix: BPJS 82%/Ketenagakerjaan 8%/Private 7%/Self-pay 3%. Referral: geo hierarchy (Puskesmas->RS D->RS C->RS B->RS A), ESI-lite, ambulance dispatch (BLS/ALS), Jasa Raharja provenance. Live: 16,800+ ticks, 1,997 patients, RSS 283MB/512MB. All non-Epic-X Epics complete. Epic X deferred."
    SECTIONS = [
        ("core-premise", "Is deterministic-replay + seeded-RNG scientifically credible for hospital sim? Does 1-tick=1-min scale work for ED + chronic care? Is single Tier C in Makassar defensible? What are limitations vs calibrated digital twin?"),
        ("model-quality", "Is 205 drugs / 147 ICD / 165 protocols sufficient for Tier C? How credible are INA-CBG claim rules? Does 326 tests give confidence? What gaps limit research validity?"),
        ("simulation-output", "Does 100k-tick (33s, linear) validate production readiness? Are state sizes realistic? Is claim pipeline economically plausible? What would 1M ticks look like (~5.5 min)?"),
    ]
    SYNTH = "Synthesize three sections. Score each criterion 0-5 with one-sentence evidence + one-sentence risk. Provide: top-3 fixes, top-3 strengths, overall verdict (Ready/Needs rework/Not ready), timeline to production."
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
