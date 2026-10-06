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
print("✓ Build: PASS")

# ── 100k tick benchmark ─────────────────────────────────────────────────
print("\n--- Running 100k ticks ---")
script = """
const { createWorld, runWorld } = require('./dist/engine/world.js');

const w = createWorld(200, undefined, 42);
const start = process.hrtime.bigint();
const TARGET = 100000;
const CHECKPOINTS = [10000, 25000, 50000, 75000, 100000];
let lastEnc = 0;
let lastOcc = 0;

for (let i = 0; i < TARGET; i++) {
  const w2 = runWorld(w, 1);
  // Checkpoint output at key ticks
  if (CHECKPOINTS.includes(i + 1)) {
    const occ = Array.from(w2.state.beds.values()).filter(b => b.patientId).length;
    const enc = w2.state.encounters.size;
    console.log(JSON.stringify({
      tick: i + 1,
      patients: w2.state.patients.size,
      occupied: occ,
      encounters: enc,
      morgue: w2.state.morgue.length,
      physicianOrders: w2.state.physicianOrders.size,
      charges: w2.state.charges?.size || 0,
      nurseNotes: w2.state.nurseNotes?.size || 0,
      msSinceStart: null // will be filled after loop
    }));
  }
  // Release old ref
  if (i < TARGET - 1) w._state = w2.state;
}

// Actually we need to keep the world, let me redo this properly
"""

# Proper benchmark script
benchmark_script = r'''
const { createWorld, runWorld } = require('./dist/engine/world.js');

const w = createWorld(200, undefined, 42);
const start = process.hrtime.bigint();
const TARGET = 100000;
const checkpoints = [10000, 25000, 50000, 75000, 100000];
let wCurrent = w;

for (let i = 0; i < TARGET; i++) {
  wCurrent = runWorld(wCurrent, 1);
  if (checkpoints.includes(i + 1)) {
    const occ = Array.from(wCurrent.state.beds.values()).filter(b => b.patientId).length;
    const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(JSON.stringify({
      tick: i + 1,
      elapsed_ms: Math.round(elapsed),
      patients: wCurrent.state.patients.size,
      occupied: occ,
      encounters: wCurrent.state.encounters.size,
      morgue: wCurrent.state.morgue.length,
      physicianOrders: wCurrent.state.physicianOrders.size,
      charges: wCurrent.state.charges?.size || 0,
      nurseNotes: wCurrent.state.nurseNotes?.size || 0,
      msPerTick: parseFloat((elapsed / (i + 1) * 1000).toFixed(2)),
    }));
  }
}

const end = process.hrtime.bigint();
const totalMs = Number(end - start) / 1e6;
console.log(JSON.stringify({
  summary: true,
  total_ticks: TARGET,
  total_ms: Math.round(totalMs),
  total_seconds: parseFloat((totalMs / 1000).toFixed(2)),
  ms_per_tick: parseFloat((totalMs / TARGET * 1000).toFixed(3)),
  patients: wCurrent.state.patients.size,
  occupied: Array.from(wCurrent.state.beds.values()).filter(b => b.patientId).length,
  encounters: wCurrent.state.encounters.size,
  morgue: wCurrent.state.morgue.length,
  physicianOrders: wCurrent.state.physicianOrders.size,
  charges: wCurrent.state.charges?.size || 0,
  nurseNotes: wCurrent.state.nurseNotes?.size || 0,
  waitingRoom: wCurrent.state.waitingRoom,
  finalTick: wCurrent.clock.tick,
}));
'''

result = subprocess.run(
    ["node", "-e", benchmark_script],
    capture_output=True, text=True, timeout=600
)

print("\nBenchmark output:")
for line in result.stdout.strip().split('\n'):
    if line.strip():
        try:
            d = json.loads(line)
            if 'summary' in d:
                print(f"\n{'='*50}")
                print(f"  100k TICKS COMPLETE")
                print(f"{'='*50}")
                print(f"  Total duration: {d['total_seconds']}s ({d['total_ms']}ms)")
                print(f"  Avg per tick:   {d['ms_per_tick']}ms")
                print(f"  Final state:")
                print(f"    Patients:     {d['patients']}")
                print(f"    Occupied:     {d['occupied']}")
                print(f"    Encounters:   {d['encounters']}")
                print(f"    Morgue:       {d['morgue']}")
                print(f"    Charges:      {d['charges']}")
                print(f"    Nurse notes:  {d['nurseNotes']}")
                print(f"    Phy orders:   {d['physicianOrders']}")
                print(f"    Waiting room: {d['waitingRoom']}")
                print(f"{'='*50}")
            elif 'tick' in d:
                print(f"  tick {d['tick']:>6} | {d['elapsed_ms']:>8}ms total | {d['msPerTick']:>6}ms/tick | occ:{d['occupied']} enc:{d['encounters']} morgue:{d['morgue']}")
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
