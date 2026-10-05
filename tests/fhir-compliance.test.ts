import { describe, it, expect } from "vitest";
import { createFhirEndpoints } from "../src/api/fhir.js";
import { createState } from "../src/engine/state-store.js";
import { generatePatientPool } from "../src/patient/generator.js";
import type { World } from "../src/engine/world.js";

function makeWorld(): World {
  const patients = generatePatientPool(10);
  const state = createState(patients);
  // Add some medical charts with diagnoses
  for (const patient of patients.slice(0, 5)) {
    const encId = `ENC-TEST-${patient.id}`;
    state.encounters.set(encId, {
      id: encId, patientId: patient.id, type: "inpatient",
      startTime: Date.now(), endTime: null, status: "active",
      payer: "bpjs", primaryDiagnosis: "I10",
    } as any);
    state.medicalCharts.set(encId, {
      id: `CHART-${encId}`, encounterId: encId, patientId: patient.id,
      status: "coded", createdAt: Date.now(), completedAt: Date.now(),
      diagnoses: [{ code: "I10", name: "Essential hypertension", type: "primary" }],
      procedures: [], coder: "SYS",
    } as any);
  }
  // Add insurance claims
  for (const patient of patients.slice(0, 3)) {
    const encId = `ENC-TEST-${patient.id}`;
    state.insuranceClaims.set(`CLM-${encId}`, {
      id: `CLM-${encId}`, encounterId: encId, patientId: patient.id,
      payer: "BPJS", sepNumber: "B02A", actualCost: 5000000,
      totalCharges: 5000000, coveredAmount: 4500000,
      patientResponsibility: 500000, status: "submitted",
      denialReason: null, submittedAt: Date.now(), resolvedAt: null,
    });
  }
  return { state, clock: { tick: 100, hospitalTimeMs: Date.now(), rng: () => 0.5, speedMultiplier: 1, msPerTick: 1000 } as any } as World;
}

describe("FHIR R4 Compliance", () => {
  const w = makeWorld();
  const api = createFhirEndpoints(() => w);

  it("conformance returns valid CapabilityStatement", () => {
    const cs = api.conformance();
    expect(cs.resourceType).toBe("CapabilityStatement");
    expect(cs.fhirVersion).toBe("4.0.1");
    expect(cs.kind).toBe("instance");
    expect(cs.rest).toBeDefined();
    expect(cs.rest[0].resource).toBeDefined();
    const resourceTypes = cs.rest[0].resource.map((r: any) => r.type);
    expect(resourceTypes).toContain("Patient");
    expect(resourceTypes).toContain("Observation");
    expect(resourceTypes).toContain("Condition");
    expect(resourceTypes).toContain("Claim");
    expect(resourceTypes).toContain("Encounter");
  });

  it("Patient resources have required fields", () => {
    const patients = api.patientSearch();
    expect(patients.length).toBeGreaterThan(0);
    for (const p of patients) {
      expect(p.resourceType).toBe("Patient");
      expect(p.id).toBeTruthy();
      expect(p.identifier).toBeDefined();
      expect(p.name).toBeDefined();
      expect(p.gender).toBeTruthy();
      expect(p.birthDate).toBeTruthy();
    }
  });

  it("Observation resources have LOINC codes", () => {
    const patients = Array.from(w.state.patients.values());
    for (const p of patients.slice(0, 3)) {
      const obs = api.observationList(p.id);
      expect(obs.length).toBeGreaterThan(0);
      for (const o of obs) {
        expect(o.resourceType).toBe("Observation");
        expect(o.code.coding[0].system).toContain("loinc.org");
        expect(o.code.coding[0].code).toBeTruthy();
      }
    }
  });

  it("Condition resources have ICD-10 coding", () => {
    const conditions = api.conditionSearch();
    expect(conditions.length).toBeGreaterThan(0);
    for (const c of conditions) {
      expect(c.resourceType).toBe("Condition");
      expect(c.code.coding[0].system).toBe("http://hl7.org/fhir/sid/icd-10");
      expect(c.code.coding[0].code).toMatch(/^[A-Z][0-9][0-9A-Z#/-]/);
      expect(c.subject.reference).toMatch(/^Patient\//);
    }
  });

  it("Claim resources have CBG tariff data", () => {
    const claims = api.claimSearch();
    expect(claims.length).toBeGreaterThan(0);
    for (const c of claims) {
      expect(c.resourceType).toBe("Claim");
      expect(c.status).toBeTruthy();
      expect(c.total).toBeDefined();
      expect(c.total.value).toBeGreaterThan(0);
      expect(c.item).toBeDefined();
    }
  });

  it("Encounter resources have proper structure", () => {
    const encs = api.encounterList();
    expect(encs.length).toBeGreaterThan(0);
    for (const e of encs) {
      expect(e.resourceType).toBe("Encounter");
      expect(e.status).toBeTruthy();
      expect(e.class).toBeDefined();
      expect(e.subject.reference).toMatch(/^Patient\//);
      expect(e.period.start).toBeTruthy();
    }
  });

  it("Patient search by blood type works", () => {
    const all = api.patientSearch();
    const aPositive = api.patientSearch(undefined, "A");
    const bPositive = api.patientSearch(undefined, "B");
    expect(all.length).toBeGreaterThan(0);
    expect(aPositive.length + bPositive.length).toBeLessThanOrEqual(all.length);
  });

  it("All resources have valid id format", () => {
    const patients = api.patientSearch();
    const obs = patients.length > 0 ? api.observationList(patients[0].id) : [];
    for (const p of patients) expect(p.id).toMatch(/^[\w-]+$/);
    for (const o of obs) expect(o.id).toMatch(/^[\w-]+$/);
  });
});
