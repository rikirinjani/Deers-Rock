import subprocess
import sys
import os
import time
import json
from datetime import datetime

print("=" * 60)
print("  Deers-Rock 100k Tick Benchmark")
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
    print("BUILD FAILED:", r.stderr[:1000])
    sys.exit(1)
print("✓ TypeScript check: PASS")

print("\nEmitting JS to dist/...")
r = subprocess.run(["npm", "run", "build"], capture_output=True, text=True)
if r.returncode != 0:
    print("EMIT FAILED:", r.stderr[:1000])
    sys.exit(1)
print("✓ Build: PASS")

# ── Write benchmark JS to file (avoids node -e path issues) ───────────
BENCHMARK_JS = os.path.join(REPO_DIR, "_benchmark_scaling.cjs")
with open(BENCHMARK_JS, "w") as f:
    f.write(r'''
const { createWorld, runWorld } = require('./dist/engine/world.js');

const TARGETS = [5000, 10000, 20000, 30000, 50000, 100000];
const results = [];

for (const TARGET of TARGETS) {
  const w = createWorld(200, undefined, 42);
  const start = process.hrtime.bigint();
  for (let i = 0; i < TARGET; i++) {
    runWorld(w, 1);
  }
  const end = process.hrtime.bigint();
  const totalMs = Number(end - start) / 1e6;
  const occ = Array.from(w.state.beds.values()).filter(b => b.patientId).length;
  console.log(JSON.stringify({
    tick: TARGET,
    total_ms: Math.round(totalMs),
    total_seconds: parseFloat((totalMs / 1000).toFixed(2)),
    ms_per_tick: parseFloat((totalMs / TARGET * 1000).toFixed(3)),
    patients: w.state.patients.size,
    occupied: occ,
    encounters: w.state.encounters.size,
    morgue: w.state.morgue.length,
    physicianOrders: w.state.physicianOrders.size,
    charges: w.state.charges?.size || 0,
    nurseNotes: w.state.nurseNotes?.size || 0,
    waitingRoom: w.state.waitingRoom,
    finalTick: w.clock.tick,
  }));
}

// Scaling analysis
console.log(JSON.stringify({
  scaling_analysis: true,
  message: "Run each chunk independently to measure linear scaling"
}));
''')

print("\n--- Running scaling benchmark ---")
result = subprocess.run(
    ["node", BENCHMARK_JS],
    capture_output=True, text=True, timeout=900
)

print("\nBenchmark output:")
for line in result.stdout.strip().split('\n'):
    if line.strip():
        try:
            d = json.loads(line)
            if 'scaling_analysis' in d:
                print(f"  {d['message']}")
            elif 'tick' in d:
                print(f"  tick {d['tick']:>6} | {d['total_seconds']:>6.2f}s total | {d['ms_per_tick']:>6.3f}ms/tick | occ:{d['occupied']} enc:{d['encounters']} morgue:{d['morgue']}")
            else:
                print(f"  {line}")
        except:
            print(f"  {line}")

if result.stderr:
    print("\nSTDERR:", result.stderr[:500])

# ── Test suite ─────────────────────────────────────────────────────────
print("\n--- Running test suite ---")
r = subprocess.run(["npm", "test"], capture_output=True, text=True, timeout=300)
for line in r.stdout.split('\n'):
    if 'passed' in line.lower() or 'failed' in line.lower() or 'Tests' in line or 'Duration' in line:
        print(line.strip())

if r.returncode != 0:
    print(f"Tests FAILED (exit {r.returncode})")
    sys.exit(1)
print("✓ Tests: PASS")

print("\n" + "=" * 60)
print("  100k Benchmark Complete")
print("=" * 60)
