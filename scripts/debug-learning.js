const { createWorld, runWorld } = require('./dist/engine/world.js');
const w = createWorld(50, undefined, 42);
for (let i = 0; i < 1000; i++) runWorld(w, 1);
console.log('outcomes:', w.state._outcomeRecords.length);
console.log('morgue:', w.state.morgue.length);
console.log('learningKeys:', w.state._learningMemory?.byDiagnosis.size);
console.log('tick:', w.clock.tick);
