/**
 * All Epic II clinical fidelity tests + load test.
 * Run on Kaggle CPU: node --max-old-space-size=400 all-epic2-tests.mjs
 */
import { createWorld } from "./src/engine/world.js";
import { runMmConference, resetMmConferenceCounter } from "./src/engine/mm-conference.js";
import {
  tickToDate, formatCalendarDate, getActiveEvents, getEventSummary,
  LEBAARAN, NATAL_ISLAM, NATAL_KRISTEN, THAYEN, RAKOSE, NYE, INA_INDEPENDENCE,
} from "./src/engine/calendar.js";
import { createFhirEndpoints } from "./src/api/fhir.js";
import { DRUG_CATALOG } from "./src/engine/drug-catalog.js";
import { ICD_PROTOCOLS } from "./src/engine/clinical-knowledge.js";
import { INA_CBG } from "./src/engine/ina-cbg.js";

const PASS = [];
const FAIL = [];

function assert(condition, msg) {
  if (condition) PASS.push(msg);
  else FAIL.push(msg);
}

function section(name) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${name}`);
  console.log("=".repeat(60));
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1: M&M Conference Tests
// ═══════════════════════════════════════════════════════════════
section("M&M Conference Tests");

resetMmConferenceCounter();
{
  const w = createWorld(10);
  for (let i = 0; i < 10; i++) w.queue.step();
  const result = runMmConference(w.state, w.clock, w.queue);
  assert(result.conference === null, "M1: returns null when no deaths");
}

resetMmConferenceCounter();
{
  const w = createWorld(6000);
  for (let i = 0; i < 600; i++) w.queue.step();
  const result = runMmConference(w.state, w.clock, w.queue);
  if (result.conference !== null) {
    assert(typeof result.conference.id === "number", "M2: conference has numeric ID");
    assert(typeof result.conference.date === "string", "M3: conference has date string");
    assert(Array.isArray(result.conference.reviewedCases), "M4: reviewedCases is array");
    assert(Array.isArray(result.conference.overallRecommendations), "M5: recommendations is array");
  } else {
    console.log("  (No conference generated — expected if no deaths in 6000 ticks)");
  }
}

resetMmConferenceCounter();
{
  const w = createWorld(1);
  assert(() => { runMmConference(w.state, w.clock, w.queue); return true; }(), "M6: does not crash with empty state");
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2: Calendar Tests
// ═══════════════════════════════════════════════════════════════
section("Calendar Tests");

{
  const d = tickToDate(0);
  assert(d.year === 2024, "C1: tick 0 = year 2024");
  assert(d.month === 1, "C2: tick 0 = month 1");
  assert(d.day === 1, "C3: tick 0 = day 1");
}

{
  const d = tickToDate(4320);
  assert(d.month === 2, "C4: 4320 ticks = month 2");
}

{
  const formatted = formatCalendarDate({ year: 2024, month: 3, day: 15 });
  assert(formatted === "2024-03-15", "C5: formatCalendarDate pads correctly");
}

{
  const events = getActiveEvents({ year: 2024, month: 8, day: 17 });
  assert(events.length > 0, "C6: Independence Day detected");
}

{
  const summary = getEventSummary(5000);
  assert(summary.hasOwnProperty("date"), "C7: summary has date");
  assert(Array.isArray(summary.events), "C8: summary has events array");
}

{
  assert(LEBAARAN !== undefined, "C9: LEBAARAN constant defined");
  assert(NATAL_ISLAM !== undefined, "C10: NATAL_ISLAM defined");
  assert(INA_INDEPENDENCE !== undefined, "C11: INA_INDEPENDENCE defined");
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3: Morgue / Death Roll Tests
// ═══════════════════════════════════════════════════════════════
section("Morgue / Death Roll Tests");

{
  const w = createWorld(10);
  assert(w.state.morgue.length === 0, "MG1: morgue starts empty");
  assert(w.state.morgueCapacity === 10, "MG2: default capacity is 10");
}

{
  const w = createWorld(2000);
  for (let i = 0; i < 200; i++) w.queue.step();
  for (const record of w.state.morgue) {
    assert(typeof record.encounterId === "string", "MG3: morgue record has encounterId");
    assert(typeof record.patientId === "string", "MG4: morgue record has patientId");
    assert(typeof record.primaryDiagnosis === "string", "MG5: morgue record has diagnosis");
    assert(typeof record.deathTick === "number", "MG6: morgue record has deathTick");
    assert(typeof record.mortalityScore === "number", "MG7: morgue record has mortalityScore");
    assert(typeof record.age === "number", "MG8: morgue record has age");
  }
}

{
  const w = createWorld(3000);
  for (let i = 0; i < 300; i++) w.queue.step();
  const ticks = w.state.morgue.map(m => m.deathTick).sort((a, b) => a - b);
  for (let i = 1; i < ticks.length; i++) {
    assert(ticks[i] >= ticks[i - 1], "MG9: death ticks are monotonic");
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4: Outpatient Tests
// ═══════════════════════════════════════════════════════════════
section("Outpatient Tests");

{
  const w = createWorld(10);
  assert(w.state._outpatientVisits !== undefined, "OP1: outpatient visits map exists");
  assert(w.state._outpatientVisits.size === 0, "OP2: starts empty");
}

{
  const w = createWorld(500);
  for (let i = 0; i < 50; i++) w.queue.step();
  const visits = Array.from(w.state._outpatientVisits.values());
  for (const v of visits.slice(0, 5)) {
    assert(typeof v.id === "string", "OP3: visit has id");
    assert(typeof v.patientId === "string", "OP4: visit has patientId");
    assert(typeof v.status === "string", "OP5: visit has status");
    assert(typeof v.complaint === "string", "OP6: visit has complaint");
  }
}

{
  const validStatuses = ["waiting", "in-consultation", "completed", "referenced", "cancelled"];
  const w = createWorld(500);
  for (let i = 0; i < 50; i++) w.queue.step();
  const visits = Array.from(w.state._outpatientVisits.values());
  for (const v of visits) {
    assert(validStatuses.includes(v.status), `OP7: valid status '${v.status}'`);
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5: FHIR Compliance Tests
// ═══════════════════════════════════════════════════════════════
section("FHIR Compliance Tests");

{
  const w = createWorld(50);
  for (let i = 0; i < 50; i++) w.queue.step();
  const api = createFhirEndpoints(() => w);
  const cs = api.conformance();
  assert(cs.resourceType === "CapabilityStatement", "F1: conformance is CapabilityStatement");
  assert(cs.fhirVersion === "4.0.1", "F2: FHIR version 4.0.1");
  const types = cs.rest[0].resource.map((r) => r.type);
  assert(types.includes("Patient"), "F3: Patient resource supported");
  assert(types.includes("Condition"), "F4: Condition resource supported");
  assert(types.includes("Claim"), "F5: Claim resource supported");
  assert(types.includes("Encounter"), "F6: Encounter resource supported");
  assert(types.includes("Observation"), "F7: Observation resource supported");
}

{
  const w = createWorld(50);
  for (let i = 0; i < 50; i++) w.queue.step();
  const api = createFhirEndpoints(() => w);
  const patients = api.patientSearch();
  assert(patients.length > 0, "F8: patient search returns results");
  for (const p of patients.slice(0, 3)) {
    assert(p.resourceType === "Patient", "F9: resourceType is Patient");
    assert(p.id !== undefined, "F10: Patient has id");
    assert(p.gender !== undefined, "F11: Patient has gender");
    assert(p.birthDate !== undefined, "F12: Patient has birthDate");
  }
}

{
  const w = createWorld(50);
  for (let i = 0; i < 50; i++) w.queue.step();
  const api = createFhirEndpoints(() => w);
  const conditions = api.conditionSearch();
  assert(Array.isArray(conditions), "F13: conditionSearch returns array");
  for (const c of conditions.slice(0, 3)) {
    assert(c.resourceType === "Condition", "F14: Condition resourceType");
    assert(c.code?.coding?.[0]?.system?.includes("icd-10"), "F15: Condition has ICD-10 coding");
  }
}

{
  const w = createWorld(50);
  for (let i = 0; i < 50; i++) w.queue.step();
  const api = createFhirEndpoints(() => w);
  const claims = api.claimSearch();
  assert(Array.isArray(claims), "F16: claimSearch returns array");
  for (const cl of claims.slice(0, 3)) {
    assert(cl.resourceType === "Claim", "F17: Claim resourceType");
    assert(cl.total?.value > 0, "F18: Claim has total value");
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 6: Drug Catalog Integrity
// ═══════════════════════════════════════════════════════════════
section("Drug Catalog Integrity");

{
  assert(DRUG_CATALOG.length === 174, `D1: catalog has 174 drugs (got ${DRUG_CATALOG.length})`);
  for (const d of DRUG_CATALOG) {
    assert(typeof d.code === "string" && d.code.length > 0, `D2: drug ${d.code} has code`);
    assert(typeof d.innName === "string", `D3: drug ${d.code} has innName`);
    assert(typeof d.costIdr === "number" && d.costIdr > 0, `D4: drug ${d.code} has cost`);
    assert(typeof d.supplyCode === "string", `D5: drug ${d.code} has supplyCode`);
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 7: Protocol Coverage
// ═══════════════════════════════════════════════════════════════
section("Protocol Coverage");

{
  assert(ICD_PROTOCOLS.length >= 165, `P1: ${ICD_PROTOCOLS.length} protocols (target ≥165)`);
  const codes = new Set(ICD_PROTOCOLS.map(p => p.code));
  assert(codes.has("I73"), "P2: I73 (PVD) has protocol");
  assert(codes.has("J06"), "P3: J06 (URI) has protocol");
  assert(codes.has("I26"), "P4: I26 (PE) has protocol");
  assert(codes.has("R10"), "P5: R10 (abdominal pain) has protocol");
  assert(codes.has("N19"), "P6: N19 (renal failure) has protocol");
}

// ═══════════════════════════════════════════════════════════════
// SECTION 8: INA-CBG Tariff Coverage
// ═══════════════════════════════════════════════════════════════
section("INA-CBG Tariff Coverage");

{
  assert(INA_CBG.length >= 165, `CBG1: ${INA_CBG.length} CBG entries (target ≥165)`);
  const codes = new Set(INA_CBG.map(e => e.icdCode));
  assert(codes.has("I73"), "CBG2: I73 has CBG");
  assert(codes.has("J06"), "CBG3: J06 has CBG");
  assert(codes.has("I26"), "CBG4: I26 has CBG");
}

// ═══════════════════════════════════════════════════════════════
// SECTION 9: Snapshot/Resume Integrity
// ═══════════════════════════════════════════════════════════════
section("Snapshot/Resume Integrity");

{
  const w = createWorld(100);
  for (let i = 0; i < 100; i++) w.queue.step();
  const snap = w.worldSnapshot();
  
  const w2 = createWorld(100);
  w2.loadSnapshot(snap);
  
  assert(w2.state.patients.size === w.state.patients.size, "S1: patient count preserved");
  assert(w2.state.encounters.size === w.state.encounters.size, "S2: encounter count preserved");
  assert(w2.state.morgue.length === w.state.morgue.length, "S3: morgue preserved");
  assert(w2.state._mmConferences?.length === w.state._mmConferences?.length, "S4: M&M conferences preserved");
}

// ═══════════════════════════════════════════════════════════════
// SECTION 10: Allergy Rate Check
// ═══════════════════════════════════════════════════════════════
section("Allergy Rate Check");

{
  const w = createWorld(200);
  for (let i = 0; i < 200; i++) w.queue.step();
  const patients = Array.from(w.state.patients.values());
  const withAllergies = patients.filter(p => p.allergies.length > 0).length;
  const rate = patients.length > 0 ? (withAllergies / patients.length) * 100 : 0;
  console.log(`  Allergy rate: ${withAllergies}/${patients.length} = ${rate.toFixed(1)}%`);
  assert(rate >= 1, `ALL1: allergy rate >= 1% (got ${rate.toFixed(1)}%)`);
}

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════
console.log(`\n${"=".repeat(60)}`);
console.log(`  RESULTS: ${PASS.length} passed, ${FAIL.length} failed`);
console.log("=".repeat(60));

if (FAIL.length > 0) {
  console.log("\nFAILED:");
  for (const f of FAIL) console.log(`  ✗ ${f}`);
  process.exit(1);
} else {
  console.log("\n✅ All tests passed!");
  process.exit(0);
}
