import { createWorld, runWorld } from './src/engine/world.js';

// Run to tick 220 (same point as existing snapshot)
const world = createWorld(75, undefined, 42);
const result = runWorld(world, 220);
const state = result.state;

console.log('========================================');
console.log('  FRESH RUN — TICK 220 (seed=42)');
console.log('========================================');

// 1. DOCTOR CASE MEMORY
console.log('\n=== 1. DOCTOR CASE MEMORY ===');
const docMem = Array.from(state._doctorCaseMemory.entries());
console.log(`Total: ${docMem.length} cases`);

const dxCount = {};
const actionTypes = {};
const docStatuses = {};
docMem.forEach(([key, d]) => {
  dxCount[d.primaryDiagnosis] = (dxCount[d.primaryDiagnosis] || 0) + 1;
  docStatuses[d.outcome] = (docStatuses[d.outcome] || 0) + 1;
  (d.actionsTaken || []).forEach(a => {
    const t = a.split(':')[0];
    actionTypes[t] = (actionTypes[t] || 0) + 1;
  });
});

console.log('\nBy diagnosis (top 10):');
Object.entries(dxCount).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([dx, c]) => console.log(`  ${dx}: ${c}`));
console.log('By outcome:', JSON.stringify(docStatuses));
console.log('Action types:');
Object.entries(actionTypes).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => console.log(`  ${t}: ${c}`));

console.log('\nSample case:');
if (docMem.length > 0) {
  const [key, d] = docMem[0];
  console.log(`  ${key}: dx=${d.primaryDiagnosis} doc=${d.attendingDoctorId} actions=${d.actionsTaken.length}`);
  d.actionsTaken.forEach(a => console.log(`    - ${a}`));
}

// 2. NURSE CASE MEMORY
console.log('\n=== 2. NURSE CASE MEMORY ===');
const nurseMem = Array.from(state._nurseCaseMemory.entries());
console.log(`Total: ${nurseMem.length} cases`);

let totA = 0, totAl = 0, totP = 0, totM = 0, assigned = 0, unassigned = 0;
nurseMem.forEach(([key, n]) => {
  totA += n.assessmentsDone || 0;
  totAl += n.alertsRaised || 0;
  totP += n.proceduresDone || 0;
  totM += n.medsAdministered || 0;
  if (n.assignedNurseId) assigned++; else unassigned++;
});

console.log(`\nAssessments: ${totA}`);
console.log(`Alerts raised: ${totAl}`);
console.log(`Procedures: ${totP}`);
console.log(`Meds administered: ${totM}`);
console.log(`Assigned nurses: ${assigned} | Unassigned: ${unassigned}`);

// 3. PHARMACY CASE MEMORY
console.log('\n=== 3. PHARMACY CASE MEMORY ===');
const pharmMem = Array.from(state._pharmacyCaseMemory.entries());
console.log(`Total: ${pharmMem.length} cases`);

let rev = 0, warn = 0, disp = 0, intv = 0;
pharmMem.forEach(([key, p]) => {
  rev += p.ordersReviewed || 0;
  warn += p.warningsIssued || 0;
  disp += p.dosesDispensed || 0;
  intv += p.interventionsCount || 0;
});

console.log(`Orders reviewed: ${rev}`);
console.log(`Warnings issued: ${warn}`);
console.log(`Doses dispensed: ${disp}`);
console.log(`Interventions: ${intv}`);
console.log(`Dispense rate: ${disp}/${rev} = ${rev > 0 ? (disp/rev*100).toFixed(0) : 0}%`);

const withWarn = pharmMem.filter(([k, p]) => p.warningsIssued > 0);
console.log(`Cases with warnings: ${withWarn.length}/${pharmMem.length}`);

// 4. MEDICATION ORDERS
console.log('\n=== 4. MEDICATION ORDERS ===');
const medOrders = Array.from(state.medicationOrders.entries());
console.log(`Total: ${medOrders.length} orders`);
const medByName = {};
medOrders.forEach(([key, m]) => {
  const name = m.medication?.name || m.name || '?';
  medByName[name] = (medByName[name] || 0) + 1;
});
console.log('Top 10:');
Object.entries(medByName).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([n, c]) => console.log(`  ${n}: ${c}`));

// 5. PHYSICIAN ORDERS
console.log('\n=== 5. PHYSICIAN ORDERS ===');
const physOrders = Array.from(state.physicianOrders.entries());
console.log(`Total: ${physOrders.length} orders`);
const physByType = {};
physOrders.forEach(([key, p]) => {
  physByType[p.orderType] = (physByType[p.orderType] || 0) + 1;
});
Object.entries(physByType).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => console.log(`  ${t}: ${c}`));

// 6. GENERAL STATS
console.log('\n=== 6. GENERAL STATS ===');
console.log(`Patients: ${state.patients.size}`);
console.log(`Encounters: ${state.encounters.size}`);
const activeEncs = Array.from(state.encounters.values()).filter(e => e.status === 'active').length;
console.log(`Active encounters: ${activeEncs}`);
console.log(`Waiting room: ${state.waitingRoom}`);
console.log(`Morgue: ${state.morgue.length}`);
console.log(`Outcomes: ${state._outcomeRecords.length}`);
const outcomes = state._outcomeRecords;
console.log(`  improved: ${outcomes.filter(o => o.outcome === 'improved').length}`);
console.log(`  deteriorated: ${outcomes.filter(o => o.outcome === 'deteriorated').length}`);
console.log(`  deceased: ${outcomes.filter(o => o.outcome === 'deceased').length}`);
console.log(`Agent pool: ${state._agentState?.pool?.agents?.size || 0}`);
const beds = Array.from(state.beds.values());
console.log(`Bed occupancy: ${beds.filter(b => b.patientId).length}/${beds.length}`);
