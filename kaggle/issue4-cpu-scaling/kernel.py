import subprocess
import sys
import os
import time
import json
from datetime import datetime

print("=" * 60)
print("  Deers-Rock Issue #4: CPU Scaling Validation")
print("  Started:", datetime.now().isoformat())
print("=" * 60)

REPO_DIR = "/kaggle/working/Deers-Rock"
if not os.path.exists(REPO_DIR):
    print("\nCloning repository...")
    subprocess.run(["git", "clone", "https://github.com/rikirinjani/Deers-Rock.git", REPO_DIR], check=True)

os.chdir(REPO_DIR)

print("\nInstalling dependencies...")
subprocess.run(["npm", "ci"], check=True, capture_output=True)

print("\nBuilding TypeScript...")
r = subprocess.run(["npx", "tsc", "--noEmit"], capture_output=True, text=True)
if r.returncode != 0:
    print("BUILD FAILED:", r.stderr)
    sys.exit(1)
print("✓ Build: PASS")

# ── Determinism check ──────────────────────────────────────────────────
print("\n--- Determinism check ---")
result = subprocess.run(
    ["node", "-e", """
const { createWorld, runWorld } = require('./dist/engine/world.js');
const w1 = createWorld(50, undefined, 42);
for (let i = 0; i < 500; i++) runWorld(w1, 1);
const s1 = JSON.stringify({
  patients: w1.state.patients.size,
  encounters: w1.state.encounters.size,
  physicianOrders: w1.state.physicianOrders.size,
  labOrders: w1.state.labOrders.size,
  medicationOrders: w1.state.medicationOrders.size,
  radiologyOrders: w1.state.radiologyOrders.size,
});
const w2 = createWorld(50, undefined, 42);
for (let i = 0; i < 500; i++) runWorld(w2, 1);
const s2 = JSON.stringify({
  patients: w2.state.patients.size,
  encounters: w2.state.encounters.size,
  physicianOrders: w2.state.physicianOrders.size,
  labOrders: w2.state.labOrders.size,
  medicationOrders: w2.state.medicationOrders.size,
  radiologyOrders: w2.state.radiologyOrders.size,
});
console.log(s1 === s2 ? 'DETERMINISTIC' : 'NON-DETERMINISTIC');
console.log('Run1:', s1);
console.log('Run2:', s2);
"""],
    capture_output=True, text=True, timeout=60
)
print(result.stdout)
if "NON-DETERMINISTIC" in result.stdout:
    print("✗ Determinism: FAIL")
    sys.exit(1)
print("✓ Determinism: PASS")

# ── Performance measurement ────────────────────────────────────────────
print("\n--- Performance measurement (scaling check) ---")
result = subprocess.run(
    ["node", "-e", """
const { createWorld, runWorld } = require('./dist/engine/world.js');

function measureTicks(world, nTicks) {
  const start = process.hrtime.bigint();
  for (let i = 0; i < nTicks; i++) runWorld(world, 1);
  const end = process.hrtime.bigint();
  return Number(end - start) / 1e6; // ms
}

const world = createWorld(50, undefined, 42);

// Warm up
for (let i = 0; i < 100; i++) runWorld(world, 1);

// Measure in chunks
const chunks = [
  { target: 200, size: 100 },
  { target: 400, size: 200 },
  { target: 900, size: 500 },
  { target: 1900, size: 1000 },
];

const results = [];
for (const chunk of chunks) {
  const startState = {
    encounters: world.state.encounters.size,
    physicianOrders: world.state.physicianOrders.size,
    labOrders: world.state.labOrders.size,
    medicationOrders: world.state.medicationOrders.size,
    radiologyOrders: world.state.radiologyOrders.size,
  };
  
  const elapsed = measureTicks(world, chunk.size);
  const avgMs = (elapsed / chunk.size) * 1000;
  
  const endState = {
    encounters: world.state.encounters.size,
    physicianOrders: world.state.physicianOrders.size,
    labOrders: world.state.labOrders.size,
    medicationOrders: world.state.medicationOrders.size,
    radiologyOrders: world.state.radiologyOrders.size,
  };
  
  results.push({
    targetTick: chunk.target,
    chunkSize: chunk.size,
    elapsedMs: Math.round(elapsed),
    avgMsPerTick: parseFloat(avgMs.toFixed(2)),
    startState,
    endState,
  });
  
  console.log(JSON.stringify({
    tick: chunk.target,
    ticks_run: chunk.size,
    elapsed_ms: Math.round(elapsed),
    avg_ms_per_tick: parseFloat(avgMs.toFixed(2)),
    encounters_start: startState.encounters,
    encounters_end: endState.encounters,
    physicianOrders_start: startState.physicianOrders,
    physicianOrders_end: endState.physicianOrders,
    labOrders_start: startState.labOrders,
    labOrders_end: endState.labOrders,
  }));
}

// Scaling analysis
if (results.length >= 2) {
  const first = results[0].avgMsPerTick;
  const last = results[results.length - 1].avgMsPerTick;
  const ratio = first > 0 ? last / first : 0;
  console.log(JSON.stringify({ scaling_ratio: parseFloat(ratio.toFixed(2)), verdict: ratio < 3.0 ? 'LINEAR_FIX_VALID' : 'SUPERLINEAR_NEEDS_INVESTIGATION' }));
}

// Full run to tick 3000
const fullStart = process.hrtime.bigint();
for (let i = 0; i < 3000; i++) runWorld(world, 1);
const fullEnd = process.hrtime.bigint();
const fullMs = Number(fullEnd - fullStart) / 1e6;
console.log(JSON.stringify({
  full_run_ticks: 3000,
  full_run_ms: Math.round(fullMs),
  avg_ms_per_tick: parseFloat((fullMs / 3000 * 1000).toFixed(2)),
  final_patients: world.state.patients.size,
  final_encounters: world.state.encounters.size,
  final_deceased: world.state.morgue.length,
}));
"""],
    capture_output=True, text=True, timeout=300
)

print("\nPerformance results:")
for line in result.stdout.strip().split('\n'):
    if line.strip():
        try:
            d = json.loads(line)
            if 'scaling_ratio' in d:
                print(f"  Scaling ratio: {d['scaling_ratio']}x → {d['verdict']}")
            elif 'full_run_ticks' in d:
                print(f"  3000 ticks: {d['full_run_ms']}ms total ({d['avg_ms_per_tick']}ms/tick)")
                print(f"  Final: {d['final_patients']} patients, {d['final_encounters']} encounters, {d['final_deceased']} deceased")
            else:
                print(f"  tick {d.get('tick','?'):>5} | {d.get('ticks_run','?'):>4} ticks | {d.get('elapsed_ms','?'):>6}ms | {d.get('avg_ms_per_tick','?'):>6}ms/tick")
        except:
            print(f"  {line}")

if result.stderr:
    print("STDERR:", result.stderr[:500])

# ── Test suite ─────────────────────────────────────────────────────────
print("\n--- Running test suite ---")
r = subprocess.run(["npm", "test"], capture_output=True, text=True, timeout=300)
for line in r.stdout.split('\n'):
    if 'passed' in line or 'failed' in line or 'Tests' in line or 'Duration' in line:
        print(line.strip())

if r.returncode != 0:
    print(f"Tests FAILED (exit {r.returncode})")
    print(r.stderr[-500:] if len(r.stderr) > 500 else r.stderr)
    sys.exit(1)
print("✓ Tests: PASS")

print("\n" + "=" * 60)
print("  Issue #4 Validation Complete")
print("=" * 60)
