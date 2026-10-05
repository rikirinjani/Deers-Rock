/**
 * Load test: measure tick latency at 500+ patients.
 * Reports p50, p95, p99, max per-tick latency over N ticks.
 */
import { createWorld } from "./src/engine/world.js";

const TICKS = 500;
const PATIENTS = 500;
const WARMUP = 50;

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const idx = Math.ceil(p / 100 * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function run() {
  console.log(`Loading ${PATIENTS} patients, running ${TICKS} ticks (warmup ${WARMUP})...`);
  const start = performance.now();
  const w = createWorld(PATIENTS);
  const loadTime = performance.now() - start;
  console.log(`World creation: ${loadTime.toFixed(1)}ms (${PATIENTS} patients)`);

  const latencies: number[] = [];
  for (let i = 0; i < WARMUP; i++) {
    w.queue.step();
  }
  console.log(`Warmup: ${WARMUP} ticks done`);

  for (let i = 0; i < TICKS; i++) {
    const t0 = performance.now();
    w.queue.step();
    latencies.push(performance.now() - t0);
  }

  const totalTime = latencies.reduce((a, b) => a + b, 0);
  console.log("\n=== Load Test Results ===");
  console.log(`Ticks: ${TICKS}`);
  console.log(`Total time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`Avg per-tick: ${(totalTime / TICKS).toFixed(2)}ms`);
  console.log(`p50: ${percentile(latencies, 50).toFixed(2)}ms`);
  console.log(`p95: ${percentile(latencies, 95).toFixed(2)}ms`);
  console.log(`p99: ${percentile(latencies, 99).toFixed(2)}ms`);
  console.log(`max: ${percentile(latencies, 100).toFixed(2)}ms`);
  console.log(`\nPatients: ${w.state.patients.size}`);
  console.log(`Encounters: ${w.state.encounters.size}`);
  console.log(`Morgue: ${w.state.morgue.length}`);
  console.log(`Charges: ${w.state.charges.size}`);
  console.log(`Lab orders: ${w.state.labOrders.size}`);
  console.log(`Med orders: ${w.state.medicationOrders.size}`);

  if (percentile(latencies, 95) > 500) {
    console.log("\n⚠️  p95 > 500ms — tail latency threshold exceeded");
  } else {
    console.log("\n✅ p95 within 500ms threshold");
  }
}

run();
