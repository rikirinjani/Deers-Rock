# Astra v11 (gpt-6-astra run 5496287), 2026-10-26

- Task `dr-khanza-e2e-full-assessment` version 13, built by `tools/kaggle/build_astra_task_r11.py`
  (merged method, CONTENT 315,717 chars, sha256 prefix ecb3609a3a6619e8).
- **Score 66/100, "Needs targeted rework"** (claim-honesty 7, gate-correctness 6, oracle-validity 7.5,
  reproducibility 6.5, e2e-design 8, external-validity 4.5). Trajectory 35 → 43 → 43 → 52 → 58 → 60 → 62 → 63 → 66.
- Cost (run.json nanodollar fields): gpt-6-astra 207,568 input + 23,228 output tokens = $2.0757 + $1.1614
  = **$3.24**; gemini-3.8-flash validation run 5496266 = $0.1829 + $0.1121 = **$0.29**; total **$3.53**.
- Single next step (Astra): make the 300-encounter line identity discriminating without using the
  expected ledger to pick the actual code (EQUAL-CTX), add a same-name same-price wrong-code mutation,
  gate on payment/model equality and cardinality, retain per-encounter results; first fix clone-refusal
  and cleanup safety (global `pkill`, cleanup before validation).
- Findings not yet checked against the source (standing rule: verify before acting).
