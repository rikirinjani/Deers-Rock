import { createWorld, runWorld, step } from "./dist/engine/world.js";

let world = createWorld(50, undefined, 42);

// Measure state sizes at various tick counts
function logState(label) {
  const s = world.state;
  console.log(`${label}: enc=${s.encounters.size} pat=${s.patients.size} beds=${s.beds.size} morgue=${s.morgue.length}`);
  console.log(`  lab=${s.labOrders.size} med=${s.medicationOrders.size} rad=${s.radiologyOrders.size} surg=${s.surgeryOrders.size}`);
  console.log(`  resp=${s.respiratoryOrders.size} diet=${s.dietOrders.size} sw=${s.socialWorkNotes.size} ed=${s.edTriages.size}`);
  console.log(`  chart=${s.medicalCharts.size} charge=${s.charges.size} claim=${s.insuranceClaims.size} pay=${s.payments.size}`);
  console.log(`  stock=${s.stockTransactions.size} spec=${s.specialtyOrders.size} nurse=${s.nurseNotes.size}`);
}

const checkpoints = [0, 100, 500, 1000, 1500, 2000];
let lastCp = 0;

for (const cp of checkpoints) {
  if (cp > lastCp) {
    const start = Date.now();
    for (let i = 0; i < cp - lastCp; i++) world = step(world);
    const elapsed = Date.now() - start;
    console.log(`\n--- ${cp} ticks (${elapsed}ms, ${(elapsed/(cp - lastCp || 1)).toFixed(1)}ms/tick) ---`);
    logState(`tick ${cp}`);
    lastCp = cp;
  }
}
