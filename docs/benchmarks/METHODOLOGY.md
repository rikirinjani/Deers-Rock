# Benchmark Methodology

## Hardware
- **Local**: MacBook Pro M2, Node.js 20, TypeScript 5
- **Kaggle CPU**: 2 vCPU, 8GB RAM, Linux container

## Configuration
```bash
# Environment
DR_ADMISSION_RATE=2.0        # Base admission multiplier
DR_DURABLE_QUEUE=0           # Snapshot queue persistence (off by default)
DR_VALIDATE_INVARIANTS=0     # Runtime invariant checks (off by default)
NODE_ENV=development
```

## Procedure
1. `createWorld(patients, journalPath, seed)` — initialize simulation
2. Run N ticks via `runWorld(state, 1)` in a loop
3. Record wall-clock time with `process.hrtime.bigint()`
4. Report: total ms, ms/tick, occupancy, patient count

## Warm-up
- First 100 ticks discarded (initialization transient)
- Measurement starts after tick 100

## Repetitions
- Single run per configuration (deterministic via seed)
- Results are reproducible: same seed → same output

## Metrics Tracked
| Metric | Description |
|--------|-------------|
| `total_ms` | Wall-clock time for N ticks |
| `ms_per_tick` | Average time per tick |
| `occupied` | Bed occupancy at end |
| `patients` | Total patient count |
| `encounters` | Total encounter count |
| `morgue` | Death count |

## 100k Tick Benchmark (Current)
```
Target: 100,000 ticks
Patients: 200
Expected: ~33 seconds on Kaggle CPU
Scaling: Linear O(n) — event queue fix (Epic I M1.4)
```

## Regression Gate
Add to CI:
```bash
npm run benchmark  # runs 100k tick test, fails if > 60s
```
