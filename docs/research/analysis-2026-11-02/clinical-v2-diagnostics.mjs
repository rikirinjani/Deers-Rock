import { readFileSync } from "node:fs";
const f=s=>JSON.parse(readFileSync(s));
const D=[0,1,2,3].map(s=>f(`/tmp/clinical-v2-diag/diag-seed-${s}.json`));
const v2=f("/tmp/clinical-v2-out/clinical-v2-outcomes.json").outcomes;
console.log("== reproduces frozen v2?");
for(const d of D) console.log(" seed",d.seed,"deaths",d.deaths,"(frozen",v2[d.seed].deaths+") disch",d.discharges,"(frozen",v2[d.seed].inpatientDischarges+")");
console.log("\n== ITEM 1: occupancy");
for(const d of D){const a=d.adm;
 console.log(`seed ${d.seed}: calls ${a.calls} | gate: occ>=85% ${a.gateOcc}, bernoulli ${a.gateBern}, poolEmpty ${a.gatePoolEmpty}, surgeCalls ${a.surgeCalls} | admit events ${a.admitEvents}, admitted ${a.admitted}, surge-admits ${a.events.filter(e=>e[3]).length}`);
 console.log("   admitted/day:", (a.admitted/10).toFixed(1), "| occupancy by day:", a.occ.filter((_,i)=>i%2===0).map(o=>o[1]).join(","), "| patients in world (day0,day10):", a.occ[0][3], a.occ[a.occ.length-1][3]);
 console.log("   admit batch sizes:", JSON.stringify(a.events.reduce((m,e)=>(m[e[1]]=(m[e[1]]||0)+1,m),{})), "mult at samples:", [...new Set(a.occ.map(o=>o[2]))].join(","));
 const first=a.events.slice(0,6).map(e=>`t${e[0]}:+${e[1]}`).join(" "); console.log("   first admits:", first);
}
console.log("\n== ITEM 2: dengue");
const log=D.flatMap(d=>d.log.map(x=>({...x,seed:d.seed})));
const dg=log.filter(x=>x.icd&&/^A9[01]/.test(x.icd)), N=log.length;
console.log(" discharges",N,"deaths",log.filter(x=>x.dies).length,"| dengue",dg.length,"deaths",dg.filter(x=>x.dies).length,"CFR",(100*dg.filter(x=>x.dies).length/Math.max(1,dg.length)).toFixed(1)+"%");
const tier=a=>["low","moderate","high"].map(t=>t+":"+a.filter(x=>x.risk===t).length).join(" ");
console.log(" dengue tiers",tier(dg),"| all tiers",tier(log));
const ages=dg.map(x=>x.age); console.log(" dengue ages",ages.sort((a,b)=>a-b).join(","),"mean",(ages.reduce((a,b)=>a+b,0)/Math.max(1,ages.length)).toFixed(1));
const fac={};for(const x of dg)for(const ff of x.factors)fac[ff]=(fac[ff]||0)+1;console.log(" dengue factors",JSON.stringify(fac));
const facAll={};for(const x of log)for(const ff of x.factors)facAll[ff]=(facAll[ff]||0)+1;console.log(" all factors",JSON.stringify(facAll));
console.log(" expected dengue deaths from p:", dg.reduce((s,x)=>s+x.p+x.boost,0).toFixed(2));
// by tier overall
for(const t of ["low","moderate","high"]){const a=log.filter(x=>x.risk===t);console.log(" ",t,a.length,(100*a.length/N).toFixed(1)+"%","deaths",a.filter(x=>x.dies).length,"rate",(100*a.filter(x=>x.dies).length/Math.max(1,a.length)).toFixed(1)+"%");}
