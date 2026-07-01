import { createWorld, runWorld, step } from "./dist/engine/world.js";

let world = createWorld(50, undefined, 42);

console.log("Phase 1: 0 -> 1000 ticks (runWorld)");
let start = Date.now();
world = runWorld(world, 1000);
let elapsed = Date.now() - start;
console.log(`  1000 ticks: ${elapsed}ms (${(elapsed / 1000).toFixed(1)}ms/tick)`);

for (const [label, target] of [["1000->1500", 1500], ["1500->2000", 2000], ["2000->2500", 2500], ["2500->3000", 3000]]) {
  start = Date.now();
  for (let i = 0; i < 500; i++) {
    world = step(world);
  }
  elapsed = Date.now() - start;
  console.log(`  ${label} (${target}): ${elapsed}ms (${(elapsed / 500).toFixed(1)}ms/tick)`);
}
