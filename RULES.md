# HARD RULES — Deer's Rock

These rules are mandatory. Every session, every agent. No exceptions.

## Rule 1: Trace every session — central location

Before signing off, write a trace to `C:\Users\think\self-harness\traces\{timestamp}-{agent}-{slug}.json`.

This is the **only** canonical location. Do not write traces to project-local self-harness dirs.

Failure to record is itself a failure. See Constitution Article IA.

## Rule 2: Record failures

If something went wrong — wrong output, wrong approach, process violation — write a failure record to `C:\Users\think\self-harness\failures\{timestamp}-{category}-{slug}.json`.

Include root cause. Include what you actually did wrong. No whitewashing.

## Rule 3: Role boundaries

| Agent | Does | Does NOT do |
|-------|------|-------------|
| Coordinator | Constitution, ADRs, roadmap | Write code |
| Platform | Source code, APIs, infrastructure | Research, clinical validation |
| Research OC | Validation, calibration, experiments | Write production code |
| Paper OC | Papers, figures, public comms | Invent results |

Crossing a role boundary without explicit human approval is a nonconformity. Record it.

## Rule 4: No synthetic records

Traces and failures must come from real execution. Generating fake records to pad counts is a policy violation.

## Rule 5: Leads are responsible

Orchestrator agents: verify Rule 1 before closing any task. If a sub-agent finishes without a trace, don't close — send it back.

## Rule 6: Indonesian SIRS RL compliance

All hospital statistics reporting must follow Permenkes 1171/2011 format (RL 1–9 forms). The `/api/sirs` endpoint is the canonical source. Any new department added to the simulation must have a corresponding RL form entry.

## Rule 7: Code quality gates

Before any merge: `npx tsc --noEmit` must pass, `npx vitest run` must pass. No exceptions.
