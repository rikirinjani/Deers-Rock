// Epic X M10.5c: fit the US case-mix weights to the HCUP 2018 top-20 principal-diagnosis shares
// (docs/us-calibration-targets.md T-CASE-1). Offline tool, not part of the engine: it replicates the
// generator's diagnosis draw (1-3 weighted draws without replacement; the principal diagnosis is the lowest
// priority = 100 - weight, i.e. the heaviest drawn code) on a fixed sample of US patients and iterates a
// proportional fit of one multiplier per HCUP group. Usage: npx tsx scripts/us-casemix-fit.ts [calSeed] [valSeed]
import { useUSLocale } from "../src/locale/us-locale.js";
import { generatePatient, resetPatientCounter } from "../src/patient/generator.js";
import { US_DIAGNOSES } from "../src/locale/us-casemix.js";
import { USCaseMix } from "../src/locale/us-casemix.js";

/** HCUP SB#277 (2018): percent of stays by principal diagnosis group, with the ICD-10 prefixes of my mapping. */
export const HCUP_GROUPS: { name: string; target: number; codes: string[] }[] = [
  { name: "Septicemia", target: 8.0, codes: ["A40", "A49"] },
  { name: "Heart failure", target: 4.1, codes: ["I50"] },
  { name: "Osteoarthritis", target: 4.1, codes: ["M17"] },
  { name: "Pneumonia", target: 2.7, codes: ["J12", "J14", "J15", "J18"] },
  { name: "Diabetes", target: 2.4, codes: ["E11"] },
  { name: "Acute MI", target: 2.4, codes: ["I21"] },
  { name: "Cardiac dysrhythmias", target: 2.2, codes: ["I48", "I49"] },
  { name: "COPD", target: 2.0, codes: ["J44", "J47"] },
  { name: "Renal failure", target: 2.0, codes: ["N17", "N19"] },
  { name: "Cerebral infarction", target: 1.9, codes: ["I63"] },
  { name: "Skin infections", target: 1.9, codes: ["L03"] },
  { name: "Depressive disorders", target: 1.9, codes: ["F32"] },
  { name: "UTI", target: 1.8, codes: ["N39"] },
  { name: "Respiratory failure", target: 1.8, codes: ["J96"] },
  { name: "Schizophrenia", target: 1.4, codes: ["F20"] },
  { name: "Coronary atherosclerosis", target: 1.3, codes: ["I25"] },
  { name: "Biliary tract disease", target: 1.3, codes: ["K80"] },
  { name: "Fluid and electrolyte", target: 1.3, codes: ["E86"] },
];

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

interface Sample { age: number; gender: "male" | "female"; n: number; u: number[]; }
function draw(seed: number, count: number): Sample[] {
  useUSLocale(); resetPatientCounter();
  const rng = mulberry(seed);
  const out: Sample[] = [];
  for (let i = 0; i < count; i++) {
    const p = generatePatient(rng);
    out.push({ age: p.age, gender: p.gender as "male" | "female", n: 1 + Math.floor(rng() * 3), u: [rng(), rng(), rng()] });
  }
  return out;
}

const mix = new USCaseMix();
function principalShares(weights: Map<string, number>, samples: Sample[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const s of samples) {
    let pool = US_DIAGNOSES.filter(d => s.age >= d.minAge && s.age <= d.maxAge && d.genders.includes(s.gender))
      .map(d => ({ code: d.code, w: (weights.get(d.code) ?? d.weight) * mix.ageWeight(d.code, s.age) }));
    let best = "Z00", bestW = -1;
    const seen = new Set<string>();
    for (let i = 0; i < s.n && pool.length > 0; i++) {
      const total = pool.reduce((a, b) => a + b.w, 0);
      let r = s.u[i]! * total, k = 0;
      for (; k < pool.length; k++) { r -= pool[k]!.w; if (r <= 0) break; }
      const dx = pool[Math.min(k, pool.length - 1)]!;
      if (!seen.has(dx.code)) { seen.add(dx.code); if (dx.w > bestW || (dx.w === bestW && dx.code < best)) { best = dx.code; bestW = dx.w; } }
      pool = pool.filter(p => p !== dx);
    }
    counts.set(best, (counts.get(best) ?? 0) + 1);
  }
  const out = new Map<string, number>();
  for (const [k, v] of counts) out.set(k, (100 * v) / samples.length);
  return out;
}
const groupShare = (sh: Map<string, number>, codes: string[]) => codes.reduce((a, c) => a + (sh.get(c) ?? 0), 0);

const calSeed = Number(process.argv[2] ?? 101), valSeed = Number(process.argv[3] ?? 202);
const cal = draw(calSeed, 40000), val = draw(valSeed, 40000);
const w = new Map<string, number>(US_DIAGNOSES.map(d => [d.code, d.weight]));
const base = new Map(w);
for (let it = 0; it < 40; it++) {
  const sh = principalShares(w, cal);
  for (const g of HCUP_GROUPS) {
    const cur = Math.max(groupShare(sh, g.codes), 0.05);
    const f = Math.pow(g.target / cur, 0.6);
    for (const c of g.codes) w.set(c, Math.min(Math.max((w.get(c) ?? 1) * f, 0.5), 60));
  }
}
for (const [c, v] of w) w.set(c, Math.round(v * 2) / 2);
const shC = principalShares(w, cal), shV = principalShares(w, val), shB = principalShares(base, val);
console.log("group | target | before(V) | after C | after V");
let tB = 0, tV = 0;
for (const g of HCUP_GROUPS) {
  const b = groupShare(shB, g.codes), v = groupShare(shV, g.codes); tB += b; tV += v;
  console.log(`${g.name} | ${g.target} | ${b.toFixed(1)} | ${groupShare(shC, g.codes).toFixed(1)} | ${v.toFixed(1)}`);
}
console.log("covered share before/after (V):", tB.toFixed(1), tV.toFixed(1), "of 47.6 HCUP (20 groups; spondylopathies not modelled)");
const changed = HCUP_GROUPS.flatMap(g => g.codes).map(c => `${c}: ${base.get(c)} -> ${w.get(c)}`);
console.log(changed.join("\n"));
