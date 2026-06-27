import type { World } from "../engine/world.js";

type FhirResource = Record<string, unknown>;

function patientToFhir(patient: import("../patient/schema.js").Patient): FhirResource {
  const nameParts = patient.name.split(" ");
  const id = patient.identity;
  return {
    resourceType: "Patient",
    id: patient.id,
    identifier: id ? [
      { system: "http://www.dinkes.go.id/nik", value: id.nik.value },
      { system: "http://rs-deers-rock.go.id/mrn", value: patient.id },
    ] : [{ system: "http://rs-deers-rock.go.id/mrn", value: patient.id }],
    name: [{
      use: "official",
      given: [nameParts[0]],
      family: nameParts.slice(1).join(" "),
    }],
    telecom: id ? [{ system: "phone", value: patient.phone }] : [],
    gender: patient.gender,
    birthDate: id ? id.birthDate.split("-").reverse().join("-") : `${new Date().getFullYear() - patient.age}-01-01`,
    address: id ? [
      {
        use: "home",
        line: [id.addressKtp.street],
        city: id.addressKtp.kabupatenKota,
        district: id.addressKtp.kecamatan,
        state: id.addressKtp.provinsi,
        postalCode: id.addressKtp.postalCode,
        country: "ID",
      },
      id.addressDomisili && id.addressDomisili.street !== id.addressKtp.street ? {
        use: "temp",
        line: [id.addressDomisili.street],
        city: id.addressDomisili.kabupatenKota,
        district: id.addressDomisili.kecamatan,
        state: id.addressDomisili.provinsi,
        postalCode: id.addressDomisili.postalCode,
        country: "ID",
      } : undefined,
    ].filter(Boolean) : [],
    maritalStatus: id ? { text: id.maritalStatus } : undefined,
    extension: [
      { url: "https://rs-deers-rock.go.id/Extension/nik", valueString: id?.nik.value },
      { url: "https://rs-deers-rock.go.id/Extension/blood-type", valueString: patient.bloodType },
      { url: "https://rs-deers-rock.go.id/Extension/religion", valueString: id?.religion },
    ],
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
    patientSearchByNIK(nik: string): FhirResource | null {
      const patient = Array.from(world().state.patients.values()).find(p => p.identity?.nik.value === nik);
      return patient ? patientToFhir(patient) : null;
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
