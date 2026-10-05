import type { World } from "../engine/world.js";
import type { Patient, Encounter, InsuranceClaim, MedicalChart } from "../patient/schema.js";
import type { HospitalState } from "../engine/state-store.js";
import { deriveOutcome, morgueEncounterIds, OUTCOME_DISPLAY, OUTCOME_CODE_SYSTEM } from "../engine/encounter-insights.js";

type FhirResource = Record<string, unknown>;

function fhirDateTime(ms: number): string {
  return new Date(ms).toISOString();
}

// ─── Patient ────────────────────────────────────────────────────────
function patientToFhir(patient: Patient): FhirResource {
  const nameParts = patient.name.split(" ");
  const id = (patient as any).identity;
  return {
    resourceType: "Patient",
    id: patient.id,
    identifier: id ? [
      { system: "http://www.dinkes.go.id/nik", value: id.nik.value },
      { system: "http://rs-deers-rock.go.id/mrn", value: patient.id },
    ] : [{ system: "http://rs-deers-rock.go.id/mrn", value: patient.id }],
    name: [{ use: "official", given: [nameParts[0]], family: nameParts.slice(1).join(" ") }],
    telecom: id ? [{ system: "phone", value: patient.phone }] : [],
    gender: patient.gender as "male" | "female",
    birthDate: id ? id.birthDate.split("-").reverse().join("-") : `${new Date().getFullYear() - patient.age}-01-01`,
    address: id ? [{
      use: "home", line: [id.addressKtp.street],
      city: id.addressKtp.kabupatenKota, district: id.addressKtp.kecamatan,
      state: id.addressKtp.provinsi, postalCode: id.addressKtp.postalCode, country: "ID",
    }] : undefined,
    maritalStatus: id ? { text: id.maritalStatus } : undefined,
    extension: [
      { url: "https://rs-deers-rock.go.id/Extension/blood-type", valueString: `${patient.bloodType}${(patient as any).rhesus ?? "+"}` },
      { url: "https://rs-deers-rock.go.id/Extension/religion", valueString: id?.religion },
    ].filter((e: any) => e.valueString),
  };
}

// ─── Observation ────────────────────────────────────────────────────
function patientToObservations(patientId: string, patient: Patient): FhirResource[] {
  const v = patient.vitals;
  return [
    { resourceType: "Observation", id: `vitals-${patientId}`, status: "final", code: { coding: [{ system: "http://loinc.org", code: "8867-4", display: "Heart rate" }] }, subject: { reference: `Patient/${patientId}` }, valueQuantity: { value: v.heartRate, unit: "/min", system: "http://unitsofmeasure.org", code: "/min" } },
    { resourceType: "Observation", id: `bp-${patientId}`, status: "final", code: { coding: [{ system: "http://loinc.org", code: "85354-9", display: "Blood pressure panel" }] }, subject: { reference: `Patient/${patientId}` }, component: [
      { code: { coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic" }] }, valueQuantity: { value: v.bloodPressureSystolic, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" } },
      { code: { coding: [{ system: "http://loinc.org", code: "8462-4", display: "Diastolic" }] }, valueQuantity: { value: v.bloodPressureDiastolic, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" } },
    ]},
    { resourceType: "Observation", id: `temp-${patientId}`, status: "final", code: { coding: [{ system: "http://loinc.org", code: "8310-5", display: "Body temperature" }] }, subject: { reference: `Patient/${patientId}` }, valueQuantity: { value: v.temperature, unit: "Cel", system: "http://unitsofmeasure.org", code: "Cel" } },
    { resourceType: "Observation", id: `spo2-${patientId}`, status: "final", code: { coding: [{ system: "http://loinc.org", code: "59408-5", display: "Oxygen saturation" }] }, subject: { reference: `Patient/${patientId}` }, valueQuantity: { value: v.oxygenSaturation, unit: "%", system: "http://unitsofmeasure.org", code: "%" } },
  ];
}

// ─── Condition ──────────────────────────────────────────────────────
function chartToCondition(chart: MedicalChart, patientId: string): FhirResource | null {
  const dx = chart.diagnoses.find(d => d.type === "primary");
  if (!dx) return null;
  return {
    resourceType: "Condition",
    id: `COND-${chart.encounterId}-${dx.code}`,
    clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }] },
    verificationStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-verification", code: "confirmed" }] },
    category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-category", code: "encounter-diagnosis" }] }],
    code: { coding: [{ system: "http://hl7.org/fhir/sid/icd-10", code: dx.code, display: dx.name }] },
    subject: { reference: `Patient/${patientId}` },
    encounter: { reference: `Encounter/${chart.encounterId}` },
    recordedDate: fhirDateTime(chart.createdAt),
  };
}

// ─── Claim ──────────────────────────────────────────────────────────
function claimToFhir(claim: InsuranceClaim, chart?: MedicalChart): FhirResource | null {
  if (!claim.submittedAt) return null;
  const primaryDx = chart?.diagnoses.find(d => d.type === "primary");
  return {
    resourceType: "Claim",
    id: claim.id,
    status: claim.status === "denied" ? "rejected" : claim.status === "paid" ? "paid" : "active",
    type: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/claim-type", code: "professional" }] },
    use: "claim",
    patient: { reference: `Patient/${claim.patientId}` },
    created: fhirDateTime(claim.submittedAt),
    institution: { reference: "Organization/deers-rock" },
    careTeam: [{ sequence: 1, provider: { reference: "Practitioner/dr-main" } }],
    facility: { reference: "Location/deers-rock" },
    priority: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/processpriority", code: "normal" }] },
    diagnosis: primaryDx ? [{
      sequence: 1,
      diagnosisReference: { reference: `Condition/COND-${claim.encounterId}-${primaryDx.code}` },
      type: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/ex-diagnosistype", code: "principal" }] }],
    }] : undefined,
    encounter: { reference: `Encounter/${claim.encounterId}` },
    item: [{
      sequence: 1,
      productOrService: { coding: [{ system: "http://hl7.org/fhir/sid/icd-10", code: primaryDx?.code || "Z00", display: primaryDx?.name || "Encounter" }] },
      servicedDate: claim.submittedAt ? new Date(claim.submittedAt).toISOString().split("T")[0] : undefined,
      locationCodeableConcept: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/ex-serviceplace", code: "21", display: "Inpatient Facility" }] },
      revenue: claim.sepNumber ? { coding: [{ system: "http://rs-deers-rock.go.id/cbg", code: claim.sepNumber, display: claim.sepNumber }] } : undefined,
      charge: { value: { value: claim.totalCharges, currency: "IDR" }, currency: "IDR" },
    }],
    total: { value: claim.totalCharges, currency: "IDR" },
  };
}

// ─── Encounter ──────────────────────────────────────────────────────
// Issue #5 P0-1: when state is provided and a derived outcome exists, it is
// carried as Encounter.hospitalization.dischargeDisposition using DR's local
// outcome code system (additive; omitted when the encounter is still active).
//
// Standard-concept alignment (Oracle F5): the local codes map onto
// http://terminology.hl7.org/CodeSystem/discharge-disposition as —
//   sembuh    → home      (discharged well / discharged to home)
//   meninggal → expired   (died)
//   transfer  → other-hcf (moved to another healthcare facility)
// The local CodeSystem remains the wire format (no dual-coding); this table
// exists so implementers can map DR dispositions to the standard concepts.
function encounterToFhir(enc: Encounter, state?: HospitalState, morgueIds?: Set<string>): FhirResource {
  const outcome = state ? deriveOutcome(state, enc, morgueIds) : undefined;
  return {
    resourceType: "Encounter",
    id: enc.id,
    status: enc.status === "active" ? "in-progress" : "finished",
    class: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: enc.type === "inpatient" ? "IMP" : "AMB" },
    type: [{ coding: [{ system: "http://snomed.info/sct", code: enc.type === "inpatient" ? "183452005" : "390906007", display: enc.type === "inpatient" ? "Admission" : "Outpatient visit" }] }],
    subject: { reference: `Patient/${enc.patientId}` },
    period: { start: fhirDateTime(enc.startTime) },
    length: enc.endTime ? { value: Math.max(0, Math.floor((enc.endTime - enc.startTime) / 60000)), unit: "min", system: "http://unitsofmeasure.org", code: "min" } : undefined,
    reasonCode: enc.primaryDiagnosis ? [{ coding: [{ system: "http://hl7.org/fhir/sid/icd-10", code: enc.primaryDiagnosis, display: enc.primaryDiagnosis }] }] : undefined,
    hospitalization: outcome ? {
      dischargeDisposition: {
        coding: [{ system: OUTCOME_CODE_SYSTEM, code: outcome, display: OUTCOME_DISPLAY[outcome] }],
      },
    } : undefined,
  };
}

// ─── Conformance ────────────────────────────────────────────────────
const CONFORMANCE: FhirResource = {
  resourceType: "CapabilityStatement",
  id: "deers-rock",
  url: "http://rs-deers-rock.go.id/fhir/CapabilityStatement/deers-rock",
  version: "0.5.0",
  name: "DeersRockFHIR",
  status: "active",
  experimental: false,
  date: "2026-10-05",
  publisher: "Deer's Rock Hospital",
  kind: "instance",
  instantaneous: true,
  fhirVersion: "4.0.1",
  format: ["application/fhir+json", "application/json"],
  rest: [{
    mode: "server",
    documentation: "Deer's Rock Synthetic Hospital — FHIR R4 API",
    resource: [
      {
        type: "Patient",
        profile: "http://hl7.org/fhir/r4/Patient.html",
        searchParam: [
          { name: "name", definition: "http://hl7.org/fhir/search-specification#search-param.patient.name", type: "string" },
          { name: "identifier", definition: "http://hl7.org/fhir/search-specification#search-param.patient.identifier", type: "token" },
          { name: "blood-type", definition: "http://rs-deers-rock.go.id/search#blood-type", type: "token" },
        ],
        interaction: [{ code: "read" }, { code: "search-system" }],
      },
      {
        type: "Observation",
        profile: "http://hl7.org/fhir/r4/observation.html",
        searchParam: [
          { name: "patient", definition: "http://hl7.org/fhir/search-specification#search-param.observation.patient", type: "reference" },
          { name: "code", definition: "http://hl7.org/fhir/search-specification#search-param.observation.code", type: "token" },
        ],
        interaction: [{ code: "read" }, { code: "search-system" }],
      },
      {
        type: "Condition",
        profile: "http://hl7.org/fhir/r4/condition.html",
        searchParam: [
          { name: "patient", definition: "http://hl7.org/fhir/search-specification#search-param.condition.patient", type: "reference" },
          { name: "code", definition: "http://hl7.org/fhir/search-specification#search-param.condition.code", type: "token" },
          { name: "encounter", definition: "http://hl7.org/fhir/search-specification#search-param.condition.encounter", type: "reference" },
        ],
        interaction: [{ code: "read" }, { code: "search-system" }],
      },
      {
        type: "Claim",
        profile: "http://hl7.org/fhir/r4/claim.html",
        searchParam: [
          { name: "patient", definition: "http://hl7.org/fhir/search-specification#search-param.claim.patient", type: "reference" },
          { name: "status", definition: "http://hl7.org/fhir/search-specification#search-param.claim.status", type: "token" },
          { name: "encounter", definition: "http://hl7.org/fhir/search-specification#search-param.claim.encounter", type: "reference" },
        ],
        interaction: [{ code: "read" }, { code: "search-system" }],
      },
      {
        type: "Encounter",
        profile: "http://hl7.org/fhir/r4 ENCOUNTER.html",
        searchParam: [
          { name: "patient", definition: "http://hl7.org/fhir/search-specification#search-param.encounter.patient", type: "reference" },
          { name: "status", definition: "http://hl7.org/fhir/search-specification#search-param.encounter.status", type: "token" },
          { name: "type", definition: "http://hl7.org/fhir/search-specification#search-param.encounter.type", type: "token" },
        ],
        interaction: [{ code: "read" }, { code: "search-system" }],
      },
      {
        type: "MedicationRequest",
        searchParam: [{ name: "patient", type: "reference" }],
        interaction: [{ code: "read" }, { code: "search-system" }],
      },
    ],
    operation: [
      { name: "$export", definition: "http://rs-deers-rock.go.id/fhir/OperationDefinition/HospitalExport" },
    ],
  }],
};

// ─── Public API ─────────────────────────────────────────────────────
export interface FhirApi {
  patientLookup(id: string): FhirResource | null;
  patientSearch(name?: string, bloodType?: string): FhirResource[];
  observationList(patientId: string): FhirResource[];
  conditionSearch(patientId?: string): FhirResource[];
  claimSearch(patientId?: string, status?: string): FhirResource[];
  encounterList(status?: string, type?: string): FhirResource[];
  conformance(): FhirResource;
}

export function createFhirEndpoints(world: () => World): FhirApi {
  const getWorld = () => world().state;

  return {
    patientLookup(id: string): FhirResource | null {
      const patient = getWorld().patients.get(id);
      return patient ? patientToFhir(patient) : null;
    },

    patientSearch(name?: string, bloodType?: string): FhirResource[] {
      let patients = Array.from(getWorld().patients.values());
      if (name) patients = patients.filter(p => p.name.toLowerCase().includes(name.toLowerCase()));
      if (bloodType) patients = patients.filter(p => p.bloodType === bloodType);
      return patients.map(patientToFhir);
    },

    observationList(patientId: string): FhirResource[] {
      const patient = getWorld().patients.get(patientId);
      if (!patient) return [];
      return patientToObservations(patientId, patient);
    },

    conditionSearch(patientId?: string): FhirResource[] {
      const conditions: FhirResource[] = [];
      for (const [encId, chart] of getWorld().medicalCharts) {
        if (patientId && chart.patientId !== patientId) continue;
        const cond = chartToCondition(chart, chart.patientId);
        if (cond) conditions.push(cond);
      }
      return conditions;
    },

    claimSearch(patientId?: string, status?: string): FhirResource[] {
      const claims: FhirResource[] = [];
      for (const claim of getWorld().insuranceClaims.values()) {
        if (patientId && claim.patientId !== patientId) continue;
        if (status && claim.status !== status) continue;
        // Look up chart for diagnosis info
        const chart = getWorld().medicalCharts.get(claim.encounterId);
        const f = claimToFhir(claim, chart);
        if (f) claims.push(f);
      }
      return claims;
    },

    encounterList(status?: string, type?: string): FhirResource[] {
      let encs = Array.from(getWorld().encounters.values());
      if (status === "active") encs = encs.filter(e => e.status === "active");
      if (status === "finished") encs = encs.filter(e => e.status !== "active");
      if (type) encs = encs.filter(e => e.type === type);
      // Oracle F9: one morgue-id set per request, not one morgue scan per encounter.
      const state = getWorld();
      const morgueIds = morgueEncounterIds(state);
      return encs.map(e => encounterToFhir(e, state, morgueIds));
    },

    conformance(): FhirResource {
      return CONFORMANCE;
    },
  };
}
