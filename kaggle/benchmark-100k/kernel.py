import subprocess
import sys
import os
import time
import json
from datetime import datetime

print("=" * 60)
print("  Deers-Rock 100k Tick Benchmark + Epic VI Pipeline")
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
    capture_output=True, text=True, timeout=600
)
if result.returncode != 0:
    print("Benchmark FAILED:", result.stderr[:500])
    sys.exit(1)
print(result.stdout[:2000])

# ── Run unit tests ────────────────────────────────────────────────────
print("\n--- Running unit tests ---")
r = subprocess.run(
    ["npx", "vitest", "run", "--reporter=dot"],
    capture_output=True, text=True, timeout=300
)
if r.returncode != 0:
    print(f"Tests FAILED (exit {r.returncode})")
    # Print last 50 lines of output for debugging
    lines = r.stderr.split('\n')[-50:]
    print('\n'.join(lines))
    sys.exit(1)
print("✓ Tests: PASS")

print("\n" + "=" * 60)
print("  100k Benchmark Complete")
print("=" * 60)

# ── Epic I M1.4 Throughput Equilibrium ────────────────────────────────
print("\n--- Epic I M1.4: Throughput Equilibrium Test ---")
throughput_code = '''
const { createWorld, runWorld } = require("./dist/engine/world.js");

// Checkpoint data
const checkpoints = [100, 200, 500, 1000, 2000, 3000, 4000, 4500, 5000];
let w = createWorld(30, undefined, 42);
let ci = 0;

for (let i = 0; i < 5000; i++) {
  w = runWorld(w, 1);
  if (ci < checkpoints.length && w.clock.tick === checkpoints[ci]) {
    const occ = Array.from(w.state.beds.values()).filter(b => b.patientId).length;
    const active = Array.from(w.state.encounters.values()).filter(e => e.status === "active").length;
    const disch = Array.from(w.state.encounters.values()).filter(e => e.status === "discharged").length;
    console.log(JSON.stringify({ tick: w.clock.tick, occupied: occ, totalBeds: w.state.beds.size, active, discharged: disch, patients: w.state.patients.size }));
    ci++;
  }
}

// Equilibrium region (ticks 4500-5000)
const occs = [];
for (let i = 4500; i < 5000; i++) {
  w = runWorld(w, 1);
  const occ = Array.from(w.state.beds.values()).filter(b => b.patientId).length;
  occs.push(occ);
}
const avg = Math.round(occs.reduce((a,b) => a+b, 0) / occs.length);
const min = Math.min(...occs);
const max = Math.max(...occs);
console.log(JSON.stringify({ equilibrium: true, avgOccupancy: avg, minOcc: min, maxOcc: max, beds: w.state.beds.size }));

// LOS analysis
const discharges = Array.from(w.state.encounters.values()).filter(e => e.status === "discharged");
if (discharges.length > 0) {
  const losValues = discharges.map(e => Math.floor(e.endTime / 60000) - Math.floor(e.startTime / 60000));
  const avgLos = Math.round(losValues.reduce((a,b) => a+b, 0) / losValues.length);
  console.log(JSON.stringify({ dischargeCount: discharges.length, avgLOS: avgLos, losMin: Math.min(...losValues), losMax: Math.max(...losValues) }));
}

// Queue health
const dischQ = w.queue.events.filter(e => e.type === "discharge");
if (dischQ.length > 0) {
  const earliest = Math.min(...dischQ.map(e => e.scheduledTick));
  console.log(JSON.stringify({ pendingDischarges: dischQ.length, earliestDischarge: earliest, currentTick: w.clock.tick }));
}
'''

with open("/tmp/throughput_test.mjs", "w") as f:
    f.write(throughput_code)

r = subprocess.run(["node", "/tmp/throughput_test.mjs"], capture_output=True, text=True, timeout=300)
print("\nThroughput test output:")
for line in r.stdout.strip().split('\n'):
    if line.strip():
        try:
            d = json.loads(line)
            if 'equilibrium' in d:
                print(f"  Equilibrium: avg={d['avgOccupancy']}/131 beds, min={d['minOcc']}, max={d['maxOcc']}")
            elif 'tick' in d:
                print(f"  tick {d['tick']:>5} | occ={d['occupied']:>3}/{d['totalBeds']} | active={d['active']} | disch={d['discharged']} | patients={d['patients']}")
            elif 'dischargeCount' in d:
                print(f"  Discharges: {d['dischargeCount']} | avgLOS={d['avgLOS']} ticks ({d['avgLOS']/1440:.1f} days) range={d['losMin']}-{d['losMax']}")
            elif 'pendingDischarges' in d:
                print(f"  Queue: {d['pendingDischarges']} pending discharges, earliest at tick {d['earliestDischarge']} (now={d['currentTick']})")
            else:
                print(f"  {line}")
        except:
            print(f"  {line}")

print("\n" + "=" * 60)
print("  All Tests Complete")
print("=" * 60)
