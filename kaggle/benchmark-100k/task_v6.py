#!/usr/bin/env python3
"""Deers Rock Assessment v6 - Lean embedded sources (8 files, ~239KB)."""
import base64, os, sys, json

os.environ.setdefault("PYTHONIOENCODING", "utf-8")
os.environ.setdefault("KAGGLE_BENCHMARKS_QUIET", "1")
os.environ.setdefault("LLM_DEFAULT", "openai/gpt-5.4-nano-2026-03-17")
os.environ.setdefault("LLM_DEFAULT_JUDGE", "openai/gpt-5.4-nano-2026-03-17")

import kaggle_benchmarks as kbench

# Lean embedded sources (b64)
EMBEDDED = {
}

# Decode
SOURCES = {}
for _k, _chunks in EMBEDDED.items():
    try: SOURCES[_k] = base64.b64decode("".join(_chunks)).decode("utf-8", errors="replace")
    except: SOURCES[_k] = ""

loaded = sum(1 for v in SOURCES.values() if v and not v.startswith('['))
print(f"Loaded {loaded} sources")

# Source mapping
KEY_MAP = {
    "src_engine_world_ts": "src/engine/world.ts",
    "src_engine_markov_ts": "src/engine/markov.ts",
    "src_engine_finance_ts": "src/engine/finance.ts",
    "src_engine_ai_coder_ts": "src/engine/ai-coder.ts",
    "src_engine_discharge_planning_ts": "src/engine/discharge-planning.ts",
    "src_engine_journal_ts": "src/engine/journal.ts",
    "src_timeline_engine_ts": "src/timeline/engine.ts",
    "src_patient_schema_ts": "src/patient/schema.ts",
    "src_agent_system_ts": "src/agent/system.ts",
    "src_api_rest_ts": "src/api/rest.ts",
    "ROADMAP_md": "ROADMAP.md",
    "src_engine_invariant_validator_ts": "src/engine/invariant-validator.ts",
}

SOURCES_BY_PATH = {}
for safe_key, path in KEY_MAP.items():
    if safe_key in SOURCES:
        SOURCES_BY_PATH[path] = SOURCES[safe_key]

CRITICAL_FILES = {
    "src/engine/world.ts": "Main simulation loop, handler orchestration, HANDLER_SKIP",
    "src/engine/markov.ts": "Patient lifecycle: admission, treatment, discharge, mortality, morgue, priority-based diagnosis selection",
    "src/engine/finance.ts": "Billing, claims lifecycle, BPJS/INA-CBG/private/JR, accident detection",
    "src/engine/ai-coder.ts": "ICD validation, DRG assignment, completeness scoring, learning",
    "src/engine/discharge-planning.ts": "Rujuk balik, chronic condition detection",
    "src/engine/journal.ts": "Persistence, snapshots, branch journal isolation (ADR-019)",
    "src/timeline/engine.ts": "Branch creation w/ intervention validation (ADR-022), execution, comparison",
    "src/patient/schema.ts": "Data model: Patient(morgueId,priority), Encounter, MedicalChart",
    "src/agent/system.ts": "Agent health states, sick leave handler, replacement tracking",
    "src/api/rest.ts": "REST API: 40+ endpoints, auth polyfill, CSV exports",
    "ROADMAP.md": "Project roadmap with Epic status, milestone tracking, test counts",
    "src/engine/invariant-validator.ts": "State invariant validation (ADR-020): morgueId, linkage, discharge",
}

BASE_PROMPT = """You are a principal software engineer assessing Deer's Rock Hospital Simulation Platform (TypeScript).

**Key facts:**
- 381 unit tests passing, TypeScript compiles clean
- 12+ clinical departments, 122 agents, full financial system
- Timeline engine with branch comparison (ADR-009+019)
- AI Medical Coder with ICD validation, DRG assignment, learning (ADR-018)
- State invariant validator (ADR-020), intervention param validation (ADR-022)
- Priority-based diagnosis selection (ADR-021)
- 100k tick benchmark: ~33s on Kaggle CPU (linear O(n))

Assess each code section for: correctness bugs, architecture quality, clinical fidelity, test gaps, performance issues.
Cite file:line references where possible. Rate severity: Critical / Warning / Minor."""

PER_SECTION_QUESTIONS = {
    "src/engine/world.ts": "Check: HANDLER_SKIP orchestration, state immutability, throughput, snapshot cadence, invariant validation hook.",
    "src/engine/markov.ts": "Check: admission/discharge flow, mortality (deathRoll), morgue handling, rujuk balik, agent assignment, priority-based primary diagnosis selection (ADR-021).",
    "src/engine/finance.ts": "Check: INA-CBG tariff lookup, claim lifecycle, denial reasons, private tier, JR cap, admin charges, accident detection logic.",
    "src/engine/ai-coder.ts": "Check: ICD validation, DRG severity inference (CC/MCC), completeness scoring, coder learning accuracy.",
    "src/engine/discharge-planning.ts": "Check: rujuk balik for 18 chronic ICD codes, 80/20 attended/missed, dept consumption recording.",
    "src/engine/journal.ts": "Check: journal append/query, snapshot I/O, branch journal isolation, export, purge. Note: DELETE mode + NORMAL synchronous is intentional trade-off (ADR-023).",
    "src/timeline/engine.ts": "Check: universe/branch lifecycle, intervention param validation (ADR-022), outcome comparison, avgLOS computation.",
    "src/patient/schema.ts": "Check: morgueId on Patient, priority on Diagnosis, MedicalChart _drg/_completeness fields, type consistency.",
    "src/agent/system.ts": "Check: health states, fatigue accumulation, recovery ticks (48/120), sickLeaveHandler.",
    "src/api/rest.ts": "Check: endpoint coverage, auth polyfill ORDER (KEY before polyfill!), CSV exports, error handling.",
    "ROADMAP.md": "Check: Epic statuses match code, test count 381, milestone accuracy.",
    "src/engine/invariant-validator.ts": "Check: 5 invariants (morgueId, encounter/patient link, bed/patient link, discharge endTime for inpatients, charge/encounter link). Environment-gated via DR_VALIDATE_INVARIANTS.",
}

SYNTHESIS_PROMPT = """Produce a markdown assessment report:

## Score: X/100

## Summary
2-3 sentences on current quality state.

## Strengths
Specific what works well, cite code.

## Issues Found
### Critical (data corruption, crashes, security)
### Warnings (design flaws, missing features)
### Minor (style, docs, optimization)

## Top 5 Recommendations

## Verification Status
- Tests: 381/382 pass
- TS compile: PASS
- Invariant validation: ADR-020 (5 invariants, env-gated)
- Intervention validation: ADR-022 (6 types, schema-validated)
- Diagnosis priority: ADR-021 (priority-based selection)
- Calibration: see docs/benchmarks/calibration-benchmarks.md
- Benchmark: ~33s/100k ticks"""


@kbench.task(name="deer-s-rock-assessment", description="Assess Deer's Rock simulation platform v3", version=8)
def assess_deers_rock(llm) -> dict:
    sections_result = {}
    errors = 0

    for path, desc in CRITICAL_FILES.items():
        content = SOURCES_BY_PATH.get(path, "")
        if not content or content.startswith("["):
            sections_result[path] = f"[SKIP] {content}"
            continue
        question = PER_SECTION_QUESTIONS.get(path, f"Review: {desc}")
        try:
            with kbench.chats.new("sec_" + path.replace("/", "_").replace(".", "_")):
                resp = llm.prompt(BASE_PROMPT + "\n\n" + content[:4000] + "\n\n" + question,
                                   extra_api_params={"max_tokens": 1200})
                sections_result[path] = str(resp)
        except Exception as e:
            sections_result[path] = f"[ERROR] {str(e)[:150]}"
            errors += 1

    digest = "\n\n".join(f"=== {p} ===\n{r[:1200]}" for p, r in sections_result.items())
    try:
        with kbench.chats.new("synthesis"):
            verdict = llm.prompt(SYNTHESIS_PROMPT + "\n\n" + digest[:10000],
                                 extra_api_params={"max_tokens": 2500})
    except Exception as e:
        verdict = f"[ERROR] {str(e)}"
        errors += 1

    report = f"# Deer's Rock Assessment (v3)\n\n{verdict}\n\n## Sections\n"
    for path, result in sections_result.items():
        report += f"### {path}\n{result[:500]}\n\n"
    loaded = sum(1 for v in SOURCES_BY_PATH.values() if v and not v.startswith("["))
    report += f"\nErrors: {errors}, Sections: {len(sections_result)}, Files loaded: {loaded}/{len(CRITICAL_FILES)}"

    for p in ["output.md", "/kaggle/working/output.md"]:
        with open(p, "w", encoding="utf-8") as f:
            f.write(report)
        print(f"Wrote {p} ({len(report)} chars)")
    print(report[:2000])

    kbench.assertions.assert_true(errors == 0, expectation="all LLM calls succeeded")
    return {"errors": errors, "report_chars": len(report), "sections": len(sections_result), "files_loaded": loaded}


run = assess_deers_rock.run(llm=kbench.llm)
print(f"Done: errors={run.errors if hasattr(run, 'errors') else 'N/A'}, files_loaded={run.files_loaded if hasattr(run, 'files_loaded') else 'N/A'}")
