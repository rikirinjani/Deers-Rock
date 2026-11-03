import { readFileSync, existsSync } from "node:fs";
const seeds = [0,1,2,3].filter(s => existsSync(`/tmp/clinical-v1-out/analysis-seed-${s}.json`));
const frozen = JSON.parse(readFileSync("/tmp/clinical-v1-out/clinical-v1-outcomes.json")).outcomes;
const D = seeds.map(s => JSON.parse(readFileSync(`/tmp/clinical-v1-out/analysis-seed-${s}.json`)));
console.log("seeds", seeds.join(","));
for (const d of D) { const f = frozen[d.seed]; console.log(`seed ${d.seed}: deaths ${d.deaths} (frozen ${f.deaths}) discharges ${d.discharges} (frozen ${f.inpatientDischarges}) log ${d.log.length} wall ${d.wall}s`); }
const log = D.flatMap(d => d.log.map(x => ({...x, seed: d.seed})));
const rec = D.flatMap(d => d.outcomes.map(x => ({...x, seed: d.seed})));
const N = log.length, deaths = log.filter(x => x.dies).length;
console.log("\ndischarge decisions", N, "deaths", deaths, "GDR/1000", (1000*deaths/N).toFixed(1));
// tiers
console.log("\nRISK TIER  n  share  deaths  rate");
for (const t of ["low","moderate","high"]) { const a = log.filter(x => x.risk===t); const dd = a.filter(x=>x.dies).length; console.log(t.padEnd(9), a.length, (100*a.length/N).toFixed(1)+"%", dd, (100*dd/Math.max(1,a.length)).toFixed(1)+"%", "share of deaths", (100*dd/Math.max(1,deaths)).toFixed(0)+"%"); }
// expected deaths by tier
const exp = log.reduce((s,x)=> s + (x.risk==="high"?0.35:x.risk==="moderate"?0.1:0.02), 0); console.log("expected deaths from tiers (no scenario boost):", exp.toFixed(1));
// AUROC of score
function auroc(pos, neg) { let w=0; for (const p of pos) for (const n of neg) w += p>n ? 1 : p===n ? 0.5 : 0; return w/(pos.length*neg.length); }
const sPos = log.filter(x=>x.dies).map(x=>x.score), sNeg = log.filter(x=>!x.dies).map(x=>x.score);
console.log("\nAUROC(score -> death):", auroc(sPos,sNeg).toFixed(3), "(n pos", sPos.length, ")");
// bootstrap CI
let s=987654321; const r=()=>{s=(s*1664525+1013904223)>>>0; return s/2**32;};
const bs=[]; for (let i=0;i<500;i++){ const idx=Array.from({length:N},()=>Math.floor(r()*N)); const P=[],Q=[]; for(const j of idx){ (log[j].dies?P:Q).push(log[j].score);} if(P.length&&Q.length) bs.push(auroc(P,Q)); } bs.sort((a,b)=>a-b); console.log("AUROC bootstrap 95% CI", bs[Math.floor(bs.length*0.025)].toFixed(3), bs[Math.floor(bs.length*0.975)].toFixed(3));
// age
const med=a=>{const x=[...a].sort((p,q)=>p-q);return x.length? x[Math.floor(x.length/2)]:NaN};
const ageAll = log.map(x=>x.age).filter(a=>a!=null);
console.log("\nage all discharges: mean", (ageAll.reduce((a,b)=>a+b,0)/ageAll.length).toFixed(1), "median", med(ageAll));
const ageDead = log.filter(x=>x.dies).map(x=>x.age); console.log("age deaths: mean", (ageDead.reduce((a,b)=>a+b,0)/ageDead.length).toFixed(1), "median", med(ageDead));
// by icd
const by = {}; for (const x of log) { const k = x.icd ?? "?"; (by[k] ??= {n:0,d:0}).n++; if (x.dies) by[k].d++; }
const rows = Object.entries(by).sort((a,b)=>b[1].n-a[1].n);
console.log("\nTOP DIAGNOSES by discharges (icd n share deaths rate)"); for (const [k,v] of rows.slice(0,15)) console.log(k.padEnd(6), String(v.n).padStart(4), (100*v.n/N).toFixed(1).padStart(5)+"%", String(v.d).padStart(3), (100*v.d/v.n).toFixed(1).padStart(5)+"%");
console.log("deaths by icd:", JSON.stringify(Object.entries(by).filter(([,v])=>v.d>0).sort((a,b)=>b[1].d-a[1].d).slice(0,8).map(([k,v])=>`${k}:${v.d}/${v.n}`)));
// dengue
const dg = log.filter(x => x.icd && /^A9[01]/.test(x.icd));
const dgD = dg.filter(x=>x.dies);
console.log("\nDENGUE (A90/A91): discharges", dg.length, "share", (100*dg.length/N).toFixed(1)+"%", "deaths", dgD.length, "CFR", (100*dgD.length/Math.max(1,dg.length)).toFixed(1)+"%");
const dgAge = dg.map(x=>x.age).filter(a=>a!=null); console.log("dengue age mean", (dgAge.reduce((a,b)=>a+b,0)/Math.max(1,dgAge.length)).toFixed(1), "median", med(dgAge), "share<18", (100*dgAge.filter(a=>a<18).length/Math.max(1,dgAge.length)).toFixed(0)+"%", "share>=60", (100*dgAge.filter(a=>a>=60).length/Math.max(1,dgAge.length)).toFixed(0)+"%");
console.log("dengue deaths ages:", dgD.map(x=>x.age).join(","), "ndx:", dgD.map(x=>x.ndx).join(","));
console.log("dengue risk tiers:", ["low","moderate","high"].map(t=>t+":"+dg.filter(x=>x.risk===t).length).join(" "));
// comorbidity count
const nd = a=>a.reduce((s,x)=>s+x.ndx,0)/Math.max(1,a.length);
console.log("\nmean #diagnoses: all", nd(log).toFixed(2), "deaths", nd(log.filter(x=>x.dies)).toFixed(2), "survivors", nd(log.filter(x=>!x.dies)).toFixed(2), "dengue", nd(dg).toFixed(2));
// LOS by outcome (inpatient ENC- only)
const inp = rec.filter(r => r.encounterId.startsWith("ENC-"));
const ld = inp.filter(r=>r.outcome==="deceased").map(r=>r.losTicks/1440), la = inp.filter(r=>r.outcome!=="deceased").map(r=>r.losTicks/1440);
console.log("\nLOS days: deaths mean", (ld.reduce((a,b)=>a+b,0)/ld.length).toFixed(2), "min", Math.min(...ld).toFixed(1), "max", Math.max(...ld).toFixed(1), "| survivors mean", (la.reduce((a,b)=>a+b,0)/la.length).toFixed(2), "| deaths before 2 d:", ld.filter(v=>v<2).length);
// outcome split by risk tier
const byTier = {}; for (const x of log) { const r = inp.find(q=>q.encounterId===x.enc && q.seed===x.seed); }
// factors seen
const fac = {}; for (const x of log) for (const f of x.factors) fac[f]=(fac[f]??0)+1; console.log("\nrisk factors firing (count of discharges):", JSON.stringify(fac));
const facD = {}; for (const x of log.filter(x=>x.dies)) for (const f of x.factors) facD[f]=(facD[f]??0)+1; console.log("risk factors among deaths:", JSON.stringify(facD));
// score distribution
const sc = {}; for (const x of log) sc[x.score]=(sc[x.score]??0)+1; console.log("score histogram:", JSON.stringify(sc));
