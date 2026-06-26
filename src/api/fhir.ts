import type { World } from "../engine/world.js";

type FhirResource = Record<string, unknown>;

function patientToFhir(patient: import("../patient/schema.js").Patient): FhirResource {
  const nameParts = patient.name.split(" ");
  return {
    resourceType: "Patient",
    id: patient.id,
    name: [{ given: [nameParts[0]], family: nameParts.slice(1).join(" ") }],
    gender: patient.gender,
    birthDate: `${new Date().getFullYear() - patient.age}-01-01`,
  };
}

export function createFhirEndpoints(world: () => World) {
  return {
    patientLookup(id: string): FhirResource | null {
      const patient = world().state.patients.get(id);
      return patient ? patientToFhir(patient) : null;
    },
    patientSearch(name?: string): FhirResource[] {
      const patients = Array.from(world().state.patients.values());
      if (name) {
        return patients.filter(p => p.name.toLowerCase().includes(name.toLowerCase())).map(patientToFhir);
      }
      return patients.map(patientToFhir);
    },
    observationList(patientId: string): FhirResource[] {
      const patient = world().state.patients.get(patientId);
      if (!patient) return [];
      const v = patient.vitals;
      return [
        { resourceType: "Observation", id: `vitals-${patientId}`, subject: { reference: `Patient/${patientId}` }, code: { coding: [{ code: "8867-4", display: "Heart rate" }] }, valueQuantity: { value: v.heartRate, unit: "/min" } },
        { resourceType: "Observation", id: `bp-${patientId}`, subject: { reference: `Patient/${patientId}` }, code: { coding: [{ code: "85354-9", display: "Blood pressure panel" }] }, component: [
          { code: { coding: [{ code: "8480-6", display: "Systolic" }] }, valueQuantity: { value: v.bloodPressureSystolic, unit: "mmHg" } },
          { code: { coding: [{ code: "8462-4", display: "Diastolic" }] }, valueQuantity: { value: v.bloodPressureDiastolic, unit: "mmHg" } },
        ]},
        { resourceType: "Observation", id: `temp-${patientId}`, subject: { reference: `Patient/${patientId}` }, code: { coding: [{ code: "8310-5", display: "Body temperature" }] }, valueQuantity: { value: v.temperature, unit: "C" } },
        { resourceType: "Observation", id: `spo2-${patientId}`, subject: { reference: `Patient/${patientId}` }, code: { coding: [{ code: "2708-6", display: "Oxygen saturation" }] }, valueQuantity: { value: v.oxygenSaturation, unit: "%" } },
      ];
    },
  };
}
