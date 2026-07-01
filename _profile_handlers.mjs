import { createWorld, step } from "./dist/engine/world.js";

// Build a world, run to 1000 ticks to saturate, then measure each handler
let world = createWorld(50, undefined, 42);
for (let i = 0; i < 1000; i++) {
  world = step(world);
}

// Now sample handler costs over 10 ticks
const handlerNames = [
  "admission", "outpatient", "newPatient", "agent", "referral", "scenario",
  "emergency", "lab", "aiPharmacy", "aiNurse", "aiDoctor",
  "radiology", "surgery", "respiratory", "dietary", "socialWork",
  "bloodBank", "microbiology", "pathology", "cssd", "biomed",
  "ipc", "clinicalNutrition", "radiotherapy", "dialysis",
  "centralSupply", "medicalRecords", "specialty", "billing", "cashier",
  "vitalsUpdate", "icdTracker", "outcome", "learning", "cleanup",
];
const handlerTotal = new Array(35).fill(0);
const specialTotal = { medAdmin: 0, orderComplete: 0, mmConference: 0 };

const samples = 3;
for (let s = 0; s < samples; s++) {
  const tickStart = Date.now();
  world = step(world);
  const tickElapsed = Date.now() - tickStart;
  // We can't easily instrument individual handlers from outside,
  // but total tick cost is measurable
  console.log(`Tick ${world.clock.tick}: ${tickElapsed}ms`);
}

// Instead, measure total time for the last 100 ticks
const start = Date.now();
for (let i = 0; i < 100; i++) {
  world = step(world);
}
const elapsed = Date.now() - start;
console.log(`\n100 ticks from ${world.clock.tick - 100}->${world.clock.tick}: ${elapsed}ms (${(elapsed/100).toFixed(1)}ms/tick)`);
