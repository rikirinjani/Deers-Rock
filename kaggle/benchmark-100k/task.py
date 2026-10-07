import subprocess, sys, os
os.chdir("/kaggle/working/Deers-Rock")

print("=== Epic I M1.4 Throughput Equilibrium Test ===")

# Build first
r = subprocess.run(["npm", "run", "build"], capture_output=True, text=True)
assert r.returncode == 0, "Build failed"
print("✓ Built")

# Run throughput test
code = '''
const { createWorld, runWorld } = require("./dist/engine/world.js");

const checkpoints = [100, 200, 500, 1000, 2000, 3000, 4000, 4500, 5000];
let w = createWorld(30, undefined, 42);
let ci = 0;

for (let i = 0; i < 5000; i++) {
  w = runWorld(w, 1);
  if (ci < checkpoints.length && w.clock.tick === checkpoints[ci]) {
    const occ = Array.from(w.state.beds.values()).filter(b => b.patientId).length;
    const active = Array.from(w.state.encounters.values()).filter(e => e.status === "active").length;
    const disch = Array.from(w.state.encounters.values()).filter(e => e.status === "discharged").length;
    const patients = w.state.patients.size;
    console.log(JSON.stringify({ tick: w.clock.tick, occupied: occ, totalBeds: w.state.beds.size, active, discharged: disch, patients }));
    ci++;
  }
}

// Check equilibrium region (ticks 4500-5000)
const occs = [];
for (let i = 4500; i < 5000; i++) {
  w = runWorld(w, 1);
  const occ = Array.from(w.state.beds.values()).filter(b => b.patientId).length;
  occs.push(occ);
}
const avg = Math.round(occs.reduce((a,b) => a+b, 0) / occs.length);
const min = Math.min(...occs);
const max = Math.max(...occs);
console.log(JSON.stringify({ equilibrium: true, avgOccupancy: avg, minOcc: min, maxOcc: max, beds: w.state.beds.size, finalTick: w.clock.tick }));

// LOS from discharges
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
    f.write(code)

r = subprocess.run(["node", "/tmp/throughput_test.mjs"], capture_output=True, text=True, timeout=300)
print(r.stdout)
if r.stderr:
    print("STDERR:", r.stderr[:500])
assert r.returncode == 0, f"Test failed: {r.stderr}"

# Test with different admission rates
for rate in ["1.0", "2.0", "3.0", "5.0"]:
    env = os.environ.copy()
    env["DR_ADMISSION_RATE"] = rate
    r2 = subprocess.run(
        ["node", "-e", f'''
const {{ createWorld, runWorld }} = require("./dist/engine/world.js");
let w = createWorld(30, undefined, 42);
for (let i = 0; i < 2000; i++) w = runWorld(w, 1);
const occ = Array.from(w.state.beds.values()).filter(b => b.patientId).length;
const disch = Array.from(w.state.encounters.values()).filter(e => e.status === "discharged").length;
console.log(JSON.stringify({{ rate: {rate!r}, tick2000: {{ occupied: occ, discharged: disch, patients: w.state.patients.size }} }}));
'''],
        capture_output=True, text=True, timeout=120, env=env
    )
    print(f"DR_ADMISSION_RATE={rate}: {r2.stdout.strip()}")
