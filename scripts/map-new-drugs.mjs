import {ICD_PROTOCOLS} from '../dist/engine/clinical-knowledge.js';
const newDrugLabels = [
  'Azithromycin 250mg', 'Penicillin G', 'Dapsone 100mg', 'Valacyclovir 500mg',
  'Levothyroxine 100mcg', 'Propylthiouracil 100mg', 'Ketoconazole 200mg',
  'Metoprolol 50mg', 'Nimodipine 60mg', 'Prazosin 1mg', 'Magnesium sulfate',
  'Donepezil 10mg', 'Methylphenidate 10mg', 'Sumatriptan 50mg', 'Betahistine 16mg',
  'Morphine 5mg', 'N-acetylcysteine 600mg', 'Tobramycin eye drops',
  'Prednisolone eye drops', 'Folic acid 1mg'
];
const meds = ICD_PROTOCOLS.flatMap(p => p.actions.filter(a => a.type === 'medication').map(a => ({label: a.label, detail: a.detail, icd: p.code, dx: p.name})));
for (const drugLabel of newDrugLabels) {
  const matches = meds.filter(m => m.label === drugLabel);
  if (matches.length > 0) {
    console.log(`\n${drugLabel}:`);
    for (const m of matches) console.log(`  ${m.icd} (${m.dx})`);
  } else {
    console.log(`\n${drugLabel}: NOT FOUND in protocols`);
  }
}
