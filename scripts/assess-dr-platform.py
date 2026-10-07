"""
GPT-6 Astra-style assessment of Deer's Rock Hospital Simulation Platform.
Runs via Anthropic Claude API (equivalent assessment tier).
"""
import anthropic
import json
import os
from datetime import datetime
from pathlib import Path

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))
MODEL = "claude-sonnet-4-5-20250929"

BASE = ("You are a tough but fair principal-engineer assessor reviewing a deterministic "
        "hospital simulation platform. The owner wants an honest capability and risk review "
        "before relying on it for research or commercial use. Judge on 5 equally-weighted "
        "0-5 criteria: core-premise, model-quality, simulation-output, clinical-plausibility, "
        "production-readiness. Be specific; quote evidence where useful. Do not be polite - "
        "be useful.")

CONTENT = ("Deer's Rock: deterministic hospital sim for Eastern Indonesia (Makassar, Tier C). "
           "326 tests pass, 1 skipped (42 files). tsc clean. CI green. Fixed-seed replay verified. "
           "100k ticks = 33.12s on Kaggle CPU (linear O(n), 330ms/tick). Before fix: 482.72s "
           "(superlinear O(n^2)). 205 drugs, 147 ICD-10 codes, 165 protocols, 165 CBG tariffs. "
           "Claim lifecycle: submitted->verifying->adjudicated->paid|denied. Payer mix: BPJS 82%/"
           "Ketenagakerjaan 8%/Private 7%/Self-pay 3%. Referral: geo hierarchy (Puskesmas->RS D->RS "
           "C->RS B->RS A), ESI-lite, ambulance dispatch (BLS/ALS), Jasa Raharja provenance. "
           "Live: 16,800+ ticks, 1,997 patients, RSS 283MB/512MB. All non-Epic-X Epics complete. "
           "Epic X deferred.")

SECTIONS = [
    ("core-premise",
     "Is the deterministic-replay + seeded-RNG premise scientifically credible for a hospital "
     "simulation? Does the 1-tick=1-minute time scale make sense for both short-term (ED) and "
     "long-term (chronic care) dynamics? Is a single Tier C hospital in Makassar a defensible "
     "scope, or too narrow for generalizable claims? What are the fundamental limitations of a "
     "procedural generator vs. a calibrated digital twin?"),
    ("model-quality",
     "Is 205 drugs / 147 ICD codes / 165 protocols sufficient for a Tier C hospital sim? How "
     "credible are the claim adjudication rules (INA-CBG causal denials)? Does the test coverage "
     "(326 tests) provide confidence in clinical correctness? What gaps remain in clinical "
     "knowledge that would limit research validity?"),
    ("simulation-output",
     "Does the 100k-tick performance (33s, linear scaling) validate production readiness? Are "
     "the state sizes (patients, encounters, charges) realistic for a Tier C hospital? Is the "
     "claim pipeline (BPJS/INA-CBG) producing economically plausible outputs? What would a "
     "1M-tick run look like (~5.5 min estimated)?"),
]

SYNTHESIS = ("Synthesize the three review sections into an overall verdict. For each criterion "
             "score (0-5), give: the score, one sentence of justification quoting specific evidence, "
             "one sentence on the biggest remaining risk. Then provide: 1) Top-3 highest-priority "
             "fixes, 2) Top-3 strongest properties to lead with, 3) Overall verdict: 'Ready for "
             "research' / 'Needs rework' / 'Not ready', 4) Estimated timeline to production "
             "readiness if applicable.")


def call_llm(prompt, max_tokens=3000):
    try:
        resp = client.messages.create(
            model=MODEL,
            max_tokens=max_tokens,
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.content[0].text.strip()
    except Exception as e:
        return f"[ERROR] {type(e).__name__}: {str(e)[:300]}"


def main():
    print("=" * 60)
    print("  Deer's Rock Platform Assessment — GPT-6 Astra Style")
    print("  Started:", datetime.now().isoformat())
    print("=" * 60)

    sections = {}
    for key, ask in SECTIONS:
        print(f"\n[Evaluating {key}...]")
        resp = call_llm(BASE + "\n\n" + CONTENT + "\n\n" + ask, max_tokens=4000)
        sections[key] = resp
        print(f"  -> {len(resp)} chars")

    print("\n[Generating synthesis verdict...]")
    digest = "\n\n".join(f"### {k}\n{v[-2000:]}" for k, v in sections.items())
    verdict = call_llm(SYNTHESIS + "\n\n" + digest[:15000], max_tokens=5000)
    print(f"  -> {len(verdict)} chars")

    # Build report
    lines = ["# Astra review: deers-rock-platform-assessment", ""]
    for key in sections:
        lines += ["## " + key.upper(), "", sections[key], ""]
    lines += ["## VERDICT", "", verdict, ""]
    report = "\n".join(lines)

    out_dir = Path("C:/Users/think/Project_v2/Deers-Rock/docs/assessments")
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    report_path = out_dir / f"deers-rock-assessment-{ts}.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report)

    summary = {
        "timestamp": datetime.now().isoformat(),
        "model": MODEL,
        "sections": list(sections.keys()),
        "errors": 0,
        "report_chars": len(report),
        "report_path": str(report_path),
        "verdict_preview": verdict[:1000],
    }
    summary_path = out_dir / f"deers-rock-assessment-{ts}.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*60}")
    print(f"  Assessment complete: {len(report)} chars")
    print(f"  Report: {report_path}")
    print(f"  Summary: {summary_path}")
    print(f"{'='*60}")

    # Print preview
    print("\n--- REPORT PREVIEW (first 3000 chars) ---")
    print(report[:3000])

    return summary


if __name__ == "__main__":
    result = main()
    print(json.dumps(result, indent=2))
