import { createWorld, runWorld, step } from "./dist/engine/world.js";

let world = createWorld(50, undefined, 42);

const checkpoints = [0, 100, 500, 1000, 1500, 2000];
let lastCp = 0;

for (const cp of checkpoints) {
  if (cp > lastCp) {
    const start = Date.now();
    for (let i = 0; i < cp - lastCp; i++) world = step(world);
    const elapsed = Date.now() - start;
    const mpt = elapsed / (cp - lastCp || 1);
    const s = world.state;
    console.log(`${cp} ticks: ${elapsed}ms (${mpt.toFixed(1)}ms/tick) enc=${s.encounters.size} spec=${s.specialtyOrders.size}`);
    lastCp = cp;
  }
}
