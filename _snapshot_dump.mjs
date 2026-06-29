import Database from 'better-sqlite3';
const db = new Database('./world-journal.db');
const r = db.prepare('SELECT state FROM world_snapshots ORDER BY tick DESC LIMIT 1').get();
const s = JSON.parse(r.state);

function dump(label, arr) {
  const entries = arr || [];
  console.log(`\n${label}: ${entries.length} records`);
  console.log('-'.repeat(80));
  if (entries.length === 0) return;
  // Show first 5 and last 3
  const sample = [...entries.slice(0, 5), ...entries.slice(-3)];
  for (const [key, val] of sample) {
    console.log(`\n[${key}]`);
    console.log(JSON.stringify(val, null, 2));
  }
}

console.log('========================================');
console.log('      SNAPSHOT TICK 220');
console.log('========================================');

console.log('\n========================================');
console.log('  1. DOCTOR CASE MEMORY (docMem)');
console.log('========================================');
const docs = s.docMem || [];
console.log(`Total: ${docs.length} cases`);
// Count unique diagnoses
const dxCount = {};
const outcomeCount = {};
const actionTypes = {};
docs.forEach(([key, d]) => {
  dxCount[d.primaryDiagnosis] = (dxCount[d.primaryDiagnosis] || 0) + 1;
  outcomeCount[d.outcome] = (outcomeCount[d.outcome] || 0) + 1;
  (d.actionsTaken || []).forEach(a => {
    const t = a.split(':')[0];
    actionTypes[t] = (actionTypes[t] || 0) + 1;
  });
});
console.log('\nBy primary diagnosis:');
const sortedDx = Object.entries(dxCount).sort((a, b) => b[1] - a[1]);
sortedDx.slice(0, 10).forEach(([dx, c]) => console.log(`  ${dx}: ${c}`));
console.log('\nBy outcome:', JSON.stringify(outcomeCount));
console.log('\nAction types:');
Object.entries(actionTypes).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([t, c]) => console.log(`  ${t}: ${c}`));

// Show specific cases
console.log('\n--- Full records (first 3 + last 1) ---');
const sample = [...docs.slice(0, 3), ...docs.slice(-1)];
for (const [key, d] of sample) {
  console.log(`\n[key=${key}]`);
  console.log(`  patient=${d.patientId} dx=${d.primaryDiagnosis} doc=${d.attendingDoctorId} (${d.attendingSpesialisasi || '-'})`);
  console.log(`  outcome=${d.outcome} ${d.tickStarted}→${d.tickEnded || 'active'}`);
  console.log(`  actions (${d.actionsTaken.length}):`);
  d.actionsTaken.forEach(a => console.log(`    - ${a}`));
}

console.log('\n========================================');
console.log('  2. NURSE CASE MEMORY (nurseMem)');
console.log('========================================');
const nurses = s.nurseMem || [];
console.log(`Total: ${nurses.length} cases`);
let totalAssessments = 0, totalAlerts = 0, totalProcedures = 0, totalMeds = 0;
nurses.forEach(([key, n]) => {
  totalAssessments += n.assessmentsDone || 0;
  totalAlerts += n.alertsRaised || 0;
  totalProcedures += n.proceduresDone || 0;
  totalMeds += n.medsAdministered || 0;
});
console.log(`\nAggregate:`);
console.log(`  Assessments done: ${totalAssessments}`);
console.log(`  Alerts raised: ${totalAlerts}`);
console.log(`  Procedures done: ${totalProcedures}`);
console.log(`  Meds administered: ${totalMeds}`);

// Nurses by assignment
const nurseAssignments = {};
nurses.forEach(([key, n]) => {
  const id = n.assignedNurseId || 'unassigned';
  nurseAssignments[id] = (nurseAssignments[id] || 0) + 1;
});
const topNurses = Object.entries(nurseAssignments).sort((a, b) => b[1] - a[1]).slice(0, 5);
console.log('\nTop assigned nurses:');
topNurses.forEach(([id, c]) => console.log(`  ${id}: ${c} cases`));

console.log('\n--- Full records (first 3) ---');
for (const [key, n] of nurses.slice(0, 3)) {
  console.log(`\n[key=${key}]`);
  console.log(`  patient=${n.patientId} nurse=${n.assignedNurseId || 'none'}`);
  console.log(`  assessments=${n.assessmentsDone} alerts=${n.alertsRaised} procs=${n.proceduresDone} meds=${n.medsAdministered} lastNote=${n.lastNoteTick}`);
}

console.log('\n========================================');
console.log('  3. PHARMACY CASE MEMORY (pharmMem)');
console.log('========================================');
const pharms = s.pharmMem || [];
console.log(`Total: ${pharms.length} cases`);
let totalReviewed = 0, totalWarnings = 0, totalDispensed = 0, totalInterventions = 0;
pharms.forEach(([key, p]) => {
  totalReviewed += p.ordersReviewed || 0;
  totalWarnings += p.warningsIssued || 0;
  totalDispensed += p.dosesDispensed || 0;
  totalInterventions += p.interventionsCount || 0;
});
console.log(`\nAggregate:`);
console.log(`  Orders reviewed: ${totalReviewed}`);
console.log(`  Warnings issued: ${totalWarnings}`);
console.log(`  Doses dispensed: ${totalDispensed}`);
console.log(`  Interventions: ${totalInterventions}`);

const pharmByPharmacist = {};
pharms.forEach(([key, p]) => {
  pharmByPharmacist[p.pharmacistId] = (pharmByPharmacist[p.pharmacistId] || 0) + 1;
});
console.log('\nBy pharmacist:');
Object.entries(pharmByPharmacist).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([id, c]) => console.log(`  ${id}: ${c} cases`));

console.log('\n--- Cases with warnings (interventions) ---');
const withWarnings = pharms.filter(([k, p]) => p.warningsIssued > 0 || p.interventionsCount > 0);
console.log(`Cases with warnings/interventions: ${withWarnings.length}`);
for (const [key, p] of withWarnings.slice(0, 3)) {
  console.log(`\n[key=${key}]`);
  console.log(`  pharm=${p.pharmacistId} patient=${p.patientId}`);
  console.log(`  reviewed=${p.ordersReviewed} warnings=${p.warningsIssued} dispensed=${p.dosesDispensed} interventions=${p.interventionsCount}`);
}

console.log('\n========================================');
console.log('  4. MEDICATION ORDERS (mo) — sample');
console.log('========================================');
const meds = s.mo || [];
console.log(`Total: ${meds.length} orders`);
const medByName = {};
meds.forEach(([key, m]) => {
  const name = m.medication?.name || m.name || '?';
  medByName[name] = (medByName[name] || 0) + 1;
});
console.log('\nTop medications:');
Object.entries(medByName).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([name, c]) => console.log(`  ${name}: ${c}`));

console.log('\n--- Sample orders ---');
meds.slice(0, 3).forEach(([key, m]) => {
  console.log(`\n  [${key}]`);
  console.log(`    med: ${m.medication?.name || m.name}, dose=${m.dose}, route=${m.route}, freq=${m.frequency}`);
  console.log(`    status=${m.status}, patient=${m.patientId}`);
});

console.log('\n========================================');
console.log('  5. PHYSICIAN ORDERS (po) — by type');
console.log('========================================');
const phys = s.po || [];
console.log(`Total: ${phys.length} orders`);
const physByType = {};
phys.forEach(([key, p]) => {
  physByType[p.orderType] = (physByType[p.orderType] || 0) + 1;
});
console.log('By type:');
Object.entries(physByType).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => console.log(`  ${t}: ${c}`));

console.log('\n--- Sample physician orders ---');
phys.slice(0, 5).forEach(([key, p]) => {
  console.log(`\n  [${key}] type=${p.orderType} desc="${p.description}" status=${p.status}`);
});

db.close();
