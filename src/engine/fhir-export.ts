import type { HospitalState } from "./state-store.js";
import type { Patient, Encounter, LabOrder, MedicationOrder, RadiologyOrder, NurseNote, PhysicianOrder, SurgeryOrder, RespiratoryOrder, DietOrder, SocialWorkNote, EdTriage, MedicalChart } from "../patient/schema.js";
import { deriveOutcome, OUTCOME_DISPLAY, OUTCOME_CODE_SYSTEM } from "./encounter-insights.js";

type FhirResource = Record<string, unknown>;
type FhirBundle = {
  resourceType: "Bundle";
  type: "document";
  identifier: { system: string; value: string };
  timestamp: string;
  entry: { fullUrl: string; resource: FhirResource }[];
};

function fhirDateTime(ms: number): string {
  const d = new Date(ms);
  return d.toISOString();
}

function buildPatientResource(patient: Patient): FhirResource {
  return {
    resourceType: "Patient",
    id: patient.id,
    identifier: [{ system: "http://deers-rock.hospital/patient", value: patient.id }],
    name: [{ use: "official", text: patient.name }],
    gender: patient.gender,
    birthDate: new Date(Date.now() - patient.age * 365 * 86400000).toISOString().split("T")[0],
    telecom: [{ system: "phone", value: patient.phone }],
    extension: [
      { url: "http://deers-rock.hospital/patient/bloodType", valueString: `${patient.bloodType}${patient.rhesus ?? "+"}` },
      { url: "http://deers-rock.hospital/patient/allergies", valueString: patient.allergies.join(", ") },
    ],
  };
}

// Issue #5 P0-1: carries the derived encounter outcome (when one exists) as
// Encounter.hospitalization.dischargeDisposition — additive, omitted while active.
// Standard-concept alignment (Oracle F5): sembuh → home, meninggal → expired,
// transfer → other-hcf, per http://terminology.hl7.org/CodeSystem/discharge-disposition.
// The local CodeSystem (OUTCOME_CODE_SYSTEM) stays the wire format — no dual-coding.
function buildEncounterResource(enc: Encounter, state?: HospitalState): FhirResource {
  const outcome = state ? deriveOutcome(state, enc) : undefined;
  return {
    resourceType: "Encounter",
    id: enc.id,
    identifier: [{ system: "http://deers-rock.hospital/encounter", value: enc.id }],
    status: enc.status === "active" ? "in-progress" : "finished",
    class: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: enc.type === "inpatient" ? "IMP" : "AMB" },
    period: { start: fhirDateTime(enc.startTime), end: enc.endTime ? fhirDateTime(enc.endTime) : undefined },
    subject: { reference: `Patient/${enc.patientId}` },
    diagnosis: [] as unknown[],
    hospitalization: outcome ? {
      dischargeDisposition: {
        coding: [{ system: OUTCOME_CODE_SYSTEM, code: outcome, display: OUTCOME_DISPLAY[outcome] }],
      },
    } : undefined,
  };
}

function buildConditionResources(diagnoses: { code: string; name: string; active: boolean }[], encounterId: string, patientId: string): FhirResource[] {
  return diagnoses.map((d, i) => ({
    resourceType: "Condition",
    id: `COND-${encounterId}-${d.code}`,
    clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: d.active ? "active" : "resolved" }] },
    code: { coding: [{ system: "http://hl7.org/fhir/sid/icd-10", code: d.code, display: d.name }] },
    subject: { reference: `Patient/${patientId}` },
    encounter: { reference: `Encounter/${encounterId}` },
    recordedDate: fhirDateTime(Date.now()),
  }));
}

function buildObservationResources(vitals: {
  heartRate: number; bloodPressureSystolic: number; bloodPressureDiastolic: number;
  temperature: number; oxygenSaturation: number; respiratoryRate: number; painLevel: number;
}, encounterId: string, patientId: string): FhirResource[] {
  return [
    { resourceType: "Observation", id: `OBS-${encounterId}-HR`, status: "final", code: { coding: [{ system: "http://loinc.org", code: "8867-4", display: "Heart rate" }] }, subject: { reference: `Patient/${patientId}` }, encounter: { reference: `Encounter/${encounterId}` }, valueQuantity: { value: vitals.heartRate, unit: "/min", system: "http://unitsofmeasure.org", code: "/min" } },
    { resourceType: "Observation", id: `OBS-${encounterId}-BPS`, status: "final", code: { coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic BP" }] }, subject: { reference: `Patient/${patientId}` }, encounter: { reference: `Encounter/${encounterId}` }, valueQuantity: { value: vitals.bloodPressureSystolic, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" } },
    { resourceType: "Observation", id: `OBS-${encounterId}-BPD`, status: "final", code: { coding: [{ system: "http://loinc.org", code: "8462-4", display: "Diastolic BP" }] }, subject: { reference: `Patient/${patientId}` }, encounter: { reference: `Encounter/${encounterId}` }, valueQuantity: { value: vitals.bloodPressureDiastolic, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" } },
    { resourceType: "Observation", id: `OBS-${encounterId}-TEMP`, status: "final", code: { coding: [{ system: "http://loinc.org", code: "8310-5", display: "Body temperature" }] }, subject: { reference: `Patient/${patientId}` }, encounter: { reference: `Encounter/${encounterId}` }, valueQuantity: { value: vitals.temperature, unit: "°C", system: "http://unitsofmeasure.org", code: "Cel" } },
    { resourceType: "Observation", id: `OBS-${encounterId}-SPO2`, status: "final", code: { coding: [{ system: "http://loinc.org", code: "59408-5", display: "Oxygen saturation" }] }, subject: { reference: `Patient/${patientId}` }, encounter: { reference: `Encounter/${encounterId}` }, valueQuantity: { value: vitals.oxygenSaturation, unit: "%", system: "http://unitsofmeasure.org", code: "%" } },
    { resourceType: "Observation", id: `OBS-${encounterId}-RR`, status: "final", code: { coding: [{ system: "http://loinc.org", code: "9279-1", display: "Respiratory rate" }] }, subject: { reference: `Patient/${patientId}` }, encounter: { reference: `Encounter/${encounterId}` }, valueQuantity: { value: vitals.respiratoryRate, unit: "/min", system: "http://unitsofmeasure.org", code: "/min" } },
    { resourceType: "Observation", id: `OBS-${encounterId}-PAIN`, status: "final", code: { coding: [{ system: "http://loinc.org", code: "38221-8", display: "Pain severity" }] }, subject: { reference: `Patient/${patientId}` }, encounter: { reference: `Encounter/${encounterId}` }, valueQuantity: { value: vitals.painLevel, unit: "{score}", system: "http://unitsofmeasure.org", code: "{score}" } },
  ];
}

function buildMedicationRequestResources(orders: MedicationOrder[], patientId: string, encounterId: string): FhirResource[] {
  return orders.map(o => ({
    resourceType: "MedicationRequest",
    id: o.id,
    status: o.status === "administered" ? "completed" : o.status === "discontinued" ? "stopped" : "active",
    intent: "order",
    medicationCodeableConcept: { coding: [{ system: "http://deers-rock.hospital/medication", code: o.medication.code, display: o.medication.name }] },
    subject: { reference: `Patient/${patientId}` },
    encounter: { reference: `Encounter/${encounterId}` },
    dosageInstruction: [{ text: `${o.dose} ${o.route} ${o.frequency}` }],
  }));
}

function buildDiagnosticReportResources(labs: LabOrder[], rads: RadiologyOrder[], patientId: string, encounterId: string): FhirResource[] {
  const reports: FhirResource[] = [];

  for (const lab of labs) {
    if (lab.status === "resulted" && lab.result) {
      reports.push({
        resourceType: "DiagnosticReport",
        id: `DR-${lab.id}`,
        status: "final",
        code: { coding: [{ system: "http://loinc.org", code: lab.testCode, display: lab.testName }] },
        subject: { reference: `Patient/${patientId}` },
        encounter: { reference: `Encounter/${encounterId}` },
        effectiveDateTime: fhirDateTime(lab.orderedAt),
        result: [{ reference: `Observation/${lab.id}` }],
        conclusion: lab.result,
      });
    }
  }

  for (const rad of rads) {
    if (rad.status === "resulted") {
      reports.push({
        resourceType: "DiagnosticReport",
        id: `DR-${rad.id}`,
        status: "final",
        code: { coding: [{ system: "http://loinc.org", code: rad.studyType, display: rad.studyType }] },
        subject: { reference: `Patient/${patientId}` },
        encounter: { reference: `Encounter/${encounterId}` },
        effectiveDateTime: fhirDateTime(rad.orderedAt),
        conclusion: rad.impression || rad.finding || "See attached report",
      });
    }
  }

  return reports;
}

function buildCompositionResource(
  enc: Encounter, patientId: string,
  conditionIds: string[], obsIds: string[], medIds: string[], reportIds: string[],
  notes: NurseNote[], physOrders: PhysicianOrder[],
): FhirResource {
  const sections: unknown[] = [];

  if (conditionIds.length > 0) {
    sections.push({
      title: "Diagnoses",
      code: { coding: [{ system: "http://loinc.org", code: "11450-4", display: "Problem list" }] },
      entry: conditionIds.map(id => ({ reference: `Condition/${id}` })),
    });
  }

  if (obsIds.length > 0) {
    sections.push({
      title: "Vital Signs",
      code: { coding: [{ system: "http://loinc.org", code: "8716-3", display: "Vital signs" }] },
      entry: obsIds.map(id => ({ reference: `Observation/${id}` })),
    });
  }

  if (medIds.length > 0) {
    sections.push({
      title: "Medications",
      code: { coding: [{ system: "http://loinc.org", code: "10160-0", display: "Medication summary" }] },
      entry: medIds.map(id => ({ reference: `MedicationRequest/${id}` })),
    });
  }

  if (reportIds.length > 0) {
    sections.push({
      title: "Diagnostic Reports",
      code: { coding: [{ system: "http://loinc.org", code: "30954-2", display: "Diagnostic studies" }] },
      entry: reportIds.map(id => ({ reference: `DiagnosticReport/${id}` })),
    });
  }

  if (notes.length > 0) {
    sections.push({
      title: "Clinical Notes",
      code: { coding: [{ system: "http://loinc.org", code: "34109-9", display: "Note" }] },
      text: { status: "generated", div: `<div>${notes.slice(0, 10).map(n => `<p><b>${n.noteType}</b> ${n.content}</p>`).join("")}</div>` },
    });
  }

  if (physOrders.length > 0) {
    sections.push({
      title: "Orders",
      code: { coding: [{ system: "http://loinc.org", code: "46209-2", display: "Orders" }] },
      entry: physOrders.slice(0, 10).map(o => ({ reference: `ServiceRequest/${o.id}` })),
    });
  }

  return {
    resourceType: "Composition",
    id: `COMP-${enc.id}`,
    status: enc.status === "discharged" ? "final" : "preliminary",
    type: { coding: [{ system: "http://loinc.org", code: "34108-1", display: "Outpatient Note" }] },
    subject: { reference: `Patient/${patientId}` },
    encounter: { reference: `Encounter/${enc.id}` },
    date: fhirDateTime(Date.now()),
    author: [{ reference: "Device/DeersRockHOE" }],
    title: `Clinical Summary — ${enc.id}`,
    section: sections,
  };
}

export function buildFhirBundle(state: HospitalState, encounterId: string): FhirBundle | null {
  const enc = state.encounters.get(encounterId);
  if (!enc) return null;

  const patient = state.patients.get(enc.patientId);
  if (!patient) return null;

  const entries: { fullUrl: string; resource: FhirResource }[] = [];
  const fullUrl = (type: string, id: string) => `${type}/${id}`;

  const patientR = buildPatientResource(patient);
  entries.push({ fullUrl: fullUrl("Patient", patient.id), resource: patientR });

  const encR = buildEncounterResource(enc, state);
  entries.push({ fullUrl: fullUrl("Encounter", enc.id), resource: encR });

  const conditions = buildConditionResources(patient.diagnoses, enc.id, patient.id);
  for (const c of conditions) entries.push({ fullUrl: fullUrl("Condition", c.id as string), resource: c });

  const vitals = buildObservationResources(patient.vitals, enc.id, patient.id);
  for (const v of vitals) entries.push({ fullUrl: fullUrl("Observation", v.id as string), resource: v });

  const encounterMeds = Array.from(state.medicationOrders.values()).filter(o => o.encounterId === enc.id);
  const medRequests = buildMedicationRequestResources(encounterMeds, patient.id, enc.id);
  for (const m of medRequests) entries.push({ fullUrl: fullUrl("MedicationRequest", m.id as string), resource: m });

  const encounterLabs = Array.from(state.labOrders.values()).filter(o => o.encounterId === enc.id);
  const encounterRads = Array.from(state.radiologyOrders.values()).filter(o => o.encounterId === enc.id);
  const reports = buildDiagnosticReportResources(encounterLabs, encounterRads, patient.id, enc.id);
  for (const r of reports) entries.push({ fullUrl: fullUrl("DiagnosticReport", r.id as string), resource: r });

  const encounterNotes = Array.from(state.nurseNotes.values()).filter(n => n.encounterId === enc.id);
  const encounterOrders = Array.from(state.physicianOrders.values()).filter(o => o.encounterId === enc.id);

  const composition = buildCompositionResource(
    enc, patient.id,
    conditions.map(c => c.id as string),
    vitals.map(v => v.id as string),
    medRequests.map(m => m.id as string),
    reports.map(r => r.id as string),
    encounterNotes, encounterOrders,
  );
  entries.push({ fullUrl: fullUrl("Composition", composition.id as string), resource: composition });

  return {
    resourceType: "Bundle",
    type: "document",
    identifier: { system: "http://deers-rock.hospital/fhir", value: `bundle-${enc.id}` },
    timestamp: fhirDateTime(Date.now()),
    entry: entries,
  };
}
