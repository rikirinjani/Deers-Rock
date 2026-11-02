import { readFileSync, existsSync } from "node:fs";
const frozen = JSON.parse(readFileSync("clinical-v1-outcomes.json")).outcomes;
const med=a=>{const x=[...a].sort((p,q)=>p-q);return x.length?x[Math.floor(x.length/2)]:NaN};
function sumry(name, files){
  const D=files.filter(existsSync).map(f=>JSON.parse(readFileSync(f)));
  const log=D.flatMap(d=>d.log);const N=log.length,dd=log.filter(x=>x.dies).length;
  console.log("\n==",name,"seeds",D.map(d=>d.seed).join(","),"discharges",N,"deaths",dd,"GDR",(1000*dd/N).toFixed(1));
  for(const d of D){const f=frozen[d.seed];console.log(` seed ${d.seed}: deaths ${d.deaths} (baseline ${f.deaths}) disch ${d.discharges} (baseline ${f.inpatientDischarges})`);}
  for(const t of ["low","moderate","high"]){const a=log.filter(x=>x.risk===t);const k=a.filter(x=>x.dies).length;console.log(" ",t.padEnd(9),a.length,(100*a.length/N).toFixed(1)+"%","deaths",k,"rate",(100*k/Math.max(1,a.length)).toFixed(1)+"%");}
  const ages=log.map(x=>x.age).filter(a=>a!=null);
  console.log("  age mean",(ages.reduce((a,b)=>a+b,0)/ages.length).toFixed(1),"median",med(ages),"<18",(100*ages.filter(a=>a<18).length/ages.length).toFixed(0)+"%",">=60",(100*ages.filter(a=>a>=60).length/ages.length).toFixed(0)+"%");
  const dg=log.filter(x=>x.icd&&/^A9[01]/.test(x.icd));
  console.log("  dengue",dg.length,"deaths",dg.filter(x=>x.dies).length,"tiers",["low","moderate","high"].map(t=>t+":"+dg.filter(x=>x.risk===t).length).join(" "),"mean age",(dg.reduce((s,x)=>s+(x.age??0),0)/Math.max(1,dg.length)).toFixed(1));
  const rec=D.flatMap(d=>d.outcomes).filter(r=>r.encounterId.startsWith("ENC-"));
  const los=rec.map(r=>r.losTicks/1440);console.log("  inpatient LOS mean",(los.reduce((a,b)=>a+b,0)/los.length).toFixed(2));
  const fac={};for(const x of log)for(const f of x.factors)fac[f]=(fac[f]??0)+1;console.log("  factors",JSON.stringify(fac));
}
sumry("baseline(logged)",[0,1].map(s=>`analysis-seed-${s}.json`));
sumry("varA age fix",[0,1].map(s=>`varA-seed-${s}.json`));
sumry("varAB age fix+floor0.01",[0,1].map(s=>`varAB-seed-${s}.json`));
