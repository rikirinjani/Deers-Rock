# Astra v12 (gpt-6-astra run 5514025), 2026-10-26

- Task `dr-khanza-e2e-full-assessment` version 14, built by `tools/kaggle/build_astra_task_r12.py`
  (merged method, CONTENT 297,625 chars, sha256 prefix bfa1a8f19345583e). The push itself started the
  validation run on gemini-3.8-flash (run 5513904, completed, output kept); Astra was then run explicitly.
- **Score 71/100, "Needs targeted rework"** (claim-honesty 7.5, gate-correctness 7, oracle-validity 8,
  reproducibility 7, e2e-design 8.5, external-validity 4.5). Trajectory 35 → 43 → 43 → 52 → 58 → 60 → 62 → 63 → 66 → 71.
- Cost, summed from the two conversations of `astra_v12_5514025.run.json` (nanodollar fields):
  gpt-6-astra 100,873 input + 11,805 output tokens = $1.0087 + $0.5903 = **$1.60**;
  gemini-3.8-flash validation run 5513904 = **$0.12**; total **$1.72**.
  (Gemini: 113,500 + 4,435 input, 4,687 + 4,461 output tokens: $0.0885 + $0.0342.)
  The Astra input token count is about half of v11's with a similar content size; not investigated.
- Astra's own qualification: its synthesis "relies on the six supplied assessments, not a fresh
  inspection of the repository or execution logs".
- Single next step (Astra): complete the 300-encounter experiment with independently captured
  form-side charge-code provenance (C3): instrument the form model or save path, assert a specified line
  representation, inject a same-name/same-price wrong form-side code (baseline passes, mutation fails);
  first make writer termination and XML restoration mandatory safety conditions and archive the existing
  artifacts (historical `.bak_*` bytes on the sole VPS).
- Top-3 issues: (1) financial identity unobservable form-side; (2) success and cleanup contracts porous
  (restore failure propagation, writer death, ownership-safe setup in the controls); (3) evidence not
  durably available or independently reconstructible.
- Seven "new problems" were listed (reporting variable `a` reused for the table count in the clone
  check, unsafe setup in the safety tester, registration-control mismatch, snapshot freshness vs
  provenance, A28' simulating a result string not a failed restore, drift hook cardinality unasserted,
  handoff divergence). **None is checked against the source yet** (standing rule: verify before acting).
