const fs = require('fs');
const genSrc = fs.readFileSync('./src/patient/generator.ts', 'utf8');
const clinSrc = fs.readFileSync('./src/engine/clinical-knowledge.ts', 'utf8');
const cbgSrc = fs.readFileSync('./src/engine/ina-cbg.ts', 'utf8');

// Extract all ICD codes from generator
const genCodes = genSrc.match(/\{ code: "([A-Z]\d{2})"/g).map(s => {
  const m = s.match(/"([^"]+)"/);
  return m ? m[1] : '';
}).filter(Boolean).sort();

// Extract all ICD codes from clinical protocols
const clinCodes = clinSrc.match(/code: "([A-Z]\d{2})"/g).map(s => {
  const m = s.match(/"([^"]+)"/);
  return m ? m[1] : '';
}).filter(Boolean);

// Extract all ICD codes from CBG
const cbgCodes = cbgSrc.match(/icdCode: "([A-Z]\d{2})"/g).map(s => {
  const m = s.match(/"([^"]+)"/);
  return m ? m[1] : '';
}).filter(Boolean);

console.log('=== GAP ANALYSIS ===');
console.log('Generator codes:', genCodes.length);
console.log('Protocol codes:', clinCodes.length);
console.log('CBG codes:', cbgCodes.length);

// Chapter I (circulatory): I00-I99
const chI_gen = genCodes.filter(c => c >= 'I00' && c < 'J00');
const chI_clin = clinCodes.filter(c => c >= 'I00' && c < 'J00');
const chI_cbg = cbgCodes.filter(c => c >= 'I00' && c < 'J00');
console.log('\n--- Chapter I (Circulatory) ---');
console.log('Generator has:', chI_gen.length, chI_gen.join(', '));
console.log('Protocols have:', chI_clin.length, chI_clin.join(', '));
console.log('CBG has:', chI_cbg.length, chI_cbg.join(', '));
const iMissingProtocol = chI_gen.filter(c => !chI_clin.includes(c));
const iMissingCbg = chI_gen.filter(c => !chI_cbg.includes(c));
console.log('Missing protocol:', iMissingProtocol.join(', ') || 'None');
console.log('Missing CBG:', iMissingCbg.join(', ') || 'None');

// Chapter R (symptoms): R00-R99
const chR_gen = genCodes.filter(c => c >= 'R00' && c < 'S00');
const chR_clin = clinCodes.filter(c => c >= 'R00' && c < 'S00');
const chR_cbg = cbgCodes.filter(c => c >= 'R00' && c < 'S00');
console.log('\n--- Chapter R (Symptoms/Signs) ---');
console.log('Generator has:', chR_gen.length, chR_gen.join(', '));
console.log('Protocols have:', chR_clin.length, chR_clin.join(', '));
console.log('CBG has:', chR_cbg.length, chR_cbg.join(', '));
const rMissingProtocol = chR_gen.filter(c => !chR_clin.includes(c));
const rMissingCbg = chR_gen.filter(c => !chR_cbg.includes(c));
console.log('Missing protocol:', rMissingProtocol.join(', ') || 'None');
console.log('Missing CBG:', rMissingCbg.join(', ') || 'None');

// All missing protocols
const allMissing = genCodes.filter(c => !clinCodes.includes(c));
console.log('\n--- ALL Missing Protocols ---');
console.log(allMissing.length, 'codes:', allMissing.join(', '));
