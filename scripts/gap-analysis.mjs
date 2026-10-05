const fs = require('fs');
const genSrc = fs.readFileSync('./src/patient/generator.ts', 'utf8');
const codes = genSrc.match(/\{ code: "([A-Z]\d{2})"/g).map(s => { const m = s.match(/"([^"]+)"/); return m ? m[1] : ''; }).filter(Boolean).sort();
const chI = codes.filter(c => c >= 'I00' && c < 'J00');
const chR = codes.filter(c => c >= 'R00' && c < 'S00');
console.log('Ch I (circulatory) codes in generator:', chI.length, chI.join(', '));
console.log('Ch R (symptoms) codes in generator:', chR.length, chR.join(', '));

const clinSrc = fs.readFileSync('./src/engine/clinical-knowledge.ts', 'utf8');
console.log('\n--- Chapter I missing protocols ---');
for (const c of chI) { if (!clinSrc.includes('code: "' + c + '"')) console.log('  MISSING:', c); }
console.log('\n--- Chapter R missing protocols ---');
for (const c of chR) { if (!clinSrc.includes('code: "' + c + '"')) console.log('  MISSING:', c); }

// Count total INA-CBG entries
const cbgSrc = fs.readFileSync('./src/engine/ina-cbg.ts', 'utf8');
const cbgCount = (cbgSrc.match(/\{ icdCode:/g) || []).length;
console.log('\nINA-CBG entries:', cbgCount);

// Check which I-chapter codes have CBG entries
console.log('\n--- Chapter I missing CBG entries ---');
for (const c of chI) { if (!cbgSrc.includes('icdCode: "' + c + '"')) console.log('  MISSING:', c); }
