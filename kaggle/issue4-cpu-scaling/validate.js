// Issue #4: CPU Scaling Fix Validation
// Verifies that the patientId-indexed order lookup eliminates O(n²) dedup scan
// Run on Kaggle CPU (4-core, ~2h limit)

const { createWorld, runWorld } = require('./dist/engine/world.js');
const fs = require('fs');
const path = require('path');

console.log('=== Issue #4 CPU Scaling Validation ===');
console.log('Working dir:', process.cwd());

// ── Determinism check ──────────────────────────────────────────────────
console.log('\n--- Determinism check ---');
const w1 = createWorld(50, undefined, 42);
for (let i = 0; i < 500; i++) runWorld(w1, 1);
const state1 = {
  patients: w1.state.patients.size,
  encounters: w1.state.encounters.size,
  physicianOrders: w1.state.physicianOrders.size,
  labOrders: w1.state.labOrders.size,
  medicationOrders: w1.state.medicationOrders.size,
  radiologyOrders: w1.state.radiologyOrders.size,
};

const w2 = createWorld(50, undefined, 42);
for (let i = 0; i < 500; i++) runWorld(w2, 1);
const state2 = {
  patients: w2.state.patients.size,
  encounters: w2.state.encounters.size,
  physicianOrders: w2.state.physicianOrders.size,
  labOrders: w2.state.labOrders.size,
  medicationOrders: w2.state.medicationOrders.size,
  radiologyOrders: w2.state.radiologyOrders.size,
};

console.log('Run 1:', JSON.stringify(state1));
console.log('Run 2:', JSON.stringify(state2));
if (JSON.stringify(state1) !== JSON.stringify(state2)) {
  console.error('DETERMINISM FAILED');
  process.exit(1);
}
console.log('✓ Determinism: PASS');

// ── Performance measurement ────────────────────────────────────────────
console.log('\n--- Performance measurement ---');

function measureTicks(world, nTicks) {
  const start = process.hrtime.bigint();
  for (let i = 0; i < nTicks; i++) {
    runWorld(world, 1);
  }
  const end = process.hrtime.bigint();
  return Number(end - start) / 1e6; // ms
}

// Run longer to see scaling
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
    avgMsPerTick: avgMs.toFixed(2),
    startState,
    endState,
  });
  
  console.log(`  tick ${String(chunk.target).padStart(5)} | ${String(chunk.size).padStart(4)} ticks | ${String(Math.round(elapsed)).padStart(6)}ms | ${avgMs.toFixed(2)}ms/tick`);
  console.log(`           | enc:${String(startState.encounters).padStart(4)}→${String(endState.encounters).padStart(4)} | ` +
    `phy:${String(startState.physicianOrders).padStart(4)}→${String(endState.physicianOrders).padStart(4)} | ` +
    `lab:${String(startState.labOrders).padStart(4)}→${String(endState.labOrders).padStart(4)}`);
}

// ── Scaling analysis ───────────────────────────────────────────────────
console.log('\n--- Scaling analysis ---');
const msValues = results.map(r => parseFloat(r.avgMsPerTick));
if (msValues.length >= 2) {
  const first = msValues[0];
  const last = msValues[msValues.length - 1];
  const ratio = first > 0 ? last / first : 0;
  console.log(`  First chunk avg: ${first.toFixed(2)}ms/tick`);
  console.log(`  Last chunk avg:  ${last.toFixed(2)}ms/tick`);
  console.log(`  Scaling ratio:   ${ratio.toFixed(2)}x`);
  
  if (ratio < 3.0) {
    console.log('  ✓ Scaling: LINEAR (ratio < 3x) — issue #4 FIXED');
  } else {
    console.log('  ⚠ Scaling: Still superlinear (ratio >= 3x) — needs further investigation');
  }
}

// ── Full run to tick 3000 ─────────────────────────────────────────────
console.log('\n--- Full run to tick 3000 ---');
const fullStart = process.hrtime.bigint();
for (let i = 0; i < 3000; i++) {
  runWorld(world, 1);
}
const fullEnd = process.hrtime.bigint();
const fullElapsed = Number(fullEnd - fullStart) / 1e6;
console.log(`  3000 ticks: ${fullElapsed.toFixed(1)}s (${(fullElapsed / 3000 * 1000).toFixed(2)}ms/tick avg)`);
console.log(`  Final state: ${world.state.patients.size} patients, ` +
  `${world.state.encounters.size} encounters, ` +
  `${world.state.morgue.length} deceased`);

// ── Save results ───────────────────────────────────────────────────────
const output = {
  timestamp: new Date().toISOString(),
  determinism: 'PASS',
  scaling: results,
  fullRun: {
    ticks: 3000,
    elapsedMs: Math.round(fullElapsed),
    finalState: {
      patients: world.state.patients.size,
      encounters: world.state.encounters.size,
      deceased: world.state.morgue.length,
    }
  }
};

const outPath = path.join(__dirname, 'issue4-results.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`\nResults saved to: ${outPath}`);

console.log('\n=== Validation complete ===');
