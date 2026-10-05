import {ICD_PROTOCOLS} from '../src/engine/clinical-knowledge.ts';
import {DRUG_CATALOG} from '../src/engine/drug-catalog.ts';
const newDrugs = ['AZM','PCN','DAP','VALA','LVT','PTU','KET','METO','NIM','PRA','MAG','DON','MPH','SUM','BET','MOR5','NAC','TOB','PREDN','FOL'];
const byDrug = new Map<string, string[]>();
for (const p of ICD_PROTOCOLS) {
  for (const a of p.actions) {
    if (a.type === 'medication' && newDrugs.includes(a.detail)) {
      if (!byDrug.has(a.detail)) byDrug.set(a.detail, []);
      byDrug.get(a.detail)!.push(p.code + ': ' + p.name);
    }
  }
}
for (const [drug, dxs] of byDrug) {
  const d = DRUG_CATALOG.find(x => x.code === drug);
  console.log('\n' + drug + ' (' + (d?.innName || '') + '):');
  for (const dx of dxs) console.log('  ' + dx);
}
console.log('\n--- UNCOVERED NEW DRUGS ---');
const covered = new Set(Array.from(byDrug.keys()));
for (const c of newDrugs) {
  if (!covered.has(c)) console.log('  ' + c);
}
