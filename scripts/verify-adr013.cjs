const fs = require('fs');
const gen = fs.readFileSync('./src/patient/generator.ts', 'utf8');
const clin = fs.readFileSync('./src/engine/clinical-knowledge.ts', 'utf8');
const drug = fs.readFileSync('./src/engine/drug-catalog.ts', 'utf8');
const cbg = fs.readFileSync('./src/engine/ina-cbg.ts', 'utf8');

const genCodes = gen.match(/\{ code: "([A-Z]\d{2})"/g).map(s => { const m = s.match(/"([^"]+)"/); return m ? m[1] : ''; }).filter(Boolean);
const clinCodes = clin.match(/code: "([A-Z]\d{2})"/g).map(s => { const m = s.match(/"([^"]+)"/); return m ? m[1] : ''; }).filter(Boolean);
const drugCodes = drug.match(/code: "([A-Z0-9]+)"/g).map(s => { const m = s.match(/"([^"]+)"/); return m ? m[1] : ''; }).filter(Boolean);
const cbgCount = (cbg.match(/\{ icdCode:/g) || []).length;

console.log('=== ADR-013 VERIFICATION ===');
console.log('Generator ICD codes:', genCodes.length);
console.log('Protocol ICD codes:', clinCodes.length);
console.log('Drug catalog entries:', drugCodes.length);
console.log('CBG tariff entries:', cbgCount);

// Check coverage
const missing = genCodes.filter(c => !clinCodes.includes(c));
console.log('\nGenerator codes missing protocols:', missing.length, missing.join(', ') || 'None');

// Chapter breakdown
const chCount = {};
for (const c of genCodes) { const ch = c[0]; chCount[ch] = (chCount[ch] || 0) + 1; }
console.log('\nGenerator by chapter:', JSON.stringify(chCount));
