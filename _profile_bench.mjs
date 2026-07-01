import { createWorld, runWorld } from "./dist/engine/world.js";

function benchmark(ticks, patients) {
  const start = Date.now();
  const w = createWorld(patients, undefined, 42);
  runWorld(w, ticks);
  const elapsed = Date.now() - start;
  return { ticks, patients, elapsed, msPerTick: (elapsed / ticks), ticksPerSec: (ticks / (elapsed / 1000)) };
}

const configs = [
  [100, 50], [500, 50], [1000, 50], [2000, 50],
  [100, 20], [500, 20], [1000, 20], [2000, 20],
];

console.log("ticks | patients | elapsed ms | ms/tick | ticks/sec");
for (const [ticks, patients] of configs) {
  const r = benchmark(ticks, patients);
  console.log(`${String(r.ticks).padStart(5)} | ${String(r.patients).padStart(8)} | ${String(r.elapsed).padStart(9)} | ${r.msPerTick.toFixed(3)} | ${r.ticksPerSec.toFixed(1)}`);
}
