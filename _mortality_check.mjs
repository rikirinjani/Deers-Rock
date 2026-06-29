import Database from 'better-sqlite3';
const db = new Database('./world-journal.db');
const latest = db.prepare('SELECT state FROM world_snapshots ORDER BY tick DESC LIMIT 1').get();
const s = JSON.parse(latest.state);

// Morgue causes
console.log('=== MORGUE CAUSES (from snapshot 220) ===');
const morgue = s.morgue || [];
morgue.forEach((m, i) => {
  console.log(`${i}: ${m.primaryDiagnosis} (${m.icdCode}), age=${m.age}, score=${m.mortalityScore}, cause="${m.causeOfDeath}"`);
});

// Outcomes with LOS
console.log('\n=== OUTCOMES (from snapshot 220) ===');
const outcomes = s.outcomes || [];
const deceased = outcomes.filter(o => o.outcome === 'deceased');
console.log(`Deceased: ${deceased.length}`);
deceased.forEach((o, i) => {
  console.log(`${i}: ${o.primaryDiagnosis} (${o.icdCode}), los=${o.losTicks} ticks, orders=${o.ordersCount}`);
});

db.close();
