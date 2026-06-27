import type { HospitalState, OutpatientVisit } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { Encounter, LabOrder, MedicationOrder } from "../patient/schema.js";
import { LAB_TESTS } from "./lab.js";
import { MEDICATIONS } from "./pharmacy.js";

export interface Poli {
  id: string;
  name: string;
  specialty: string;
  capacityPerTick: number;
}

const POLIKLINIK: Poli[] = [
  { id: "POLI-U", name: "Poli Umum", specialty: "general", capacityPerTick: 3 },
  { id: "POLI-PD", name: "Poli Penyakit Dalam", specialty: "internal_medicine", capacityPerTick: 2 },
  { id: "POLI-BEDAH", name: "Poli Bedah", specialty: "surgery", capacityPerTick: 2 },
  { id: "POLI-OG", name: "Poli Obstetri & Ginekologi", specialty: "obgyn", capacityPerTick: 2 },
  { id: "POLI-AK", name: "Poli Anak", specialty: "pediatrics", capacityPerTick: 2 },
  { id: "POLI-SYARAF", name: "Poli Saraf", specialty: "neurology", capacityPerTick: 1 },
  { id: "POLI-JANTUNG", name: "Poli Jantung", specialty: "cardiology", capacityPerTick: 1 },
  { id: "POLI-PARU", name: "Poli Paru", specialty: "pulmonology", capacityPerTick: 1 },
];

const POLI_BY_SPECIALTY: Record<string, string> = {
  internal_medicine: "POLI-PD", surgery: "POLI-BEDAH", obgyn: "POLI-OG",
  pediatrics: "POLI-AK", neurology: "POLI-SYARAF", cardiology: "POLI-JANTUNG",
  pulmonology: "POLI-PARU", general: "POLI-U",
};

const DIAGNOSIS_POOL = [
  { icd: "I10", name: "Essential hypertension", poli: "POLI-PD" },
  { icd: "E11", name: "Type 2 diabetes mellitus", poli: "POLI-PD" },
  { icd: "J15", name: "Bacterial pneumonia", poli: "POLI-PARU" },
  { icd: "N39", name: "Urinary tract infection", poli: "POLI-U" },
  { icd: "M54", name: "Low back pain", poli: "POLI-BEDAH" },
  { icd: "K35", name: "Acute appendicitis", poli: "POLI-BEDAH" },
  { icd: "J45", name: "Asthma", poli: "POLI-PARU" },
  { icd: "I50", name: "Heart failure", poli: "POLI-JANTUNG" },
  { icd: "A09", name: "Acute gastroenteritis", poli: "POLI-U" },
  { icd: "H66", name: "Otitis media", poli: "POLI-U" },
  { icd: "J06", name: "Upper respiratory infection", poli: "POLI-U" },
  { icd: "K29", name: "Gastritis", poli: "POLI-PD" },
  { icd: "G40", name: "Epilepsy", poli: "POLI-SYARAF" },
  { icd: "N20", name: "Renal calculus", poli: "POLI-BEDAH" },
  { icd: "O80", name: "Normal delivery", poli: "POLI-OG" },
  { icd: "P59", name: "Neonatal jaundice", poli: "POLI-AK" },
];

export function outpatientHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  let visits = new Map(state._outpatientVisits ?? []);
  let newEncounters = new Map(state.encounters);
  let newLabOrders = new Map(state.labOrders);
  let newMedOrders = new Map(state.medicationOrders);

  const agentPool = state._agentState?.pool;

  if (clock.tick % 4 === 0) {
    const referrals = Array.from(state._referralState?.letters?.values() ?? [])
      .filter(l => l.status === "received" && !Array.from(visits.values()).some(v => v.referralId === l.id));

    const walkInsNeeded = Math.max(0, Math.floor(Math.random() * 3));
    const arrivals: { patientId: string; referralId: string | null; diagnosis: typeof DIAGNOSIS_POOL[0] }[] = [];

    for (const ref of referrals) {
      const dx = DIAGNOSIS_POOL.find(d => d.icd === ref.diagnosis) ?? DIAGNOSIS_POOL[0]!;
      arrivals.push({ patientId: ref.patientId, referralId: ref.id, diagnosis: dx });
    }

    for (let i = 0; i < walkInsNeeded; i++) {
      const pats = Array.from(state.patients.values());
      if (pats.length === 0) break;
      const dx = DIAGNOSIS_POOL[Math.floor(Math.random() * DIAGNOSIS_POOL.length)]!;
      arrivals.push({ patientId: pats[Math.floor(Math.random() * pats.length)]!.id, referralId: null, diagnosis: dx });
    }

    for (const arrival of arrivals) {
      if (arrivals.indexOf(arrival) >= 8) break;
      const dx = arrival.diagnosis;
      const enc: Encounter = {
        id: `POLI-${clock.tick}-${arrival.patientId}`,
        patientId: arrival.patientId,
        type: "outpatient",
        startTime: clock.hospitalTimeMs,
        endTime: null,
        status: "active",
      };
      newEncounters.set(enc.id, enc);

      const visit: OutpatientVisit = {
        id: `VISIT-${enc.id}`,
        encounterId: enc.id,
        patientId: arrival.patientId,
        referralId: arrival.referralId,
        poli: dx.poli,
        diagnosis: dx.name,
        icdCode: dx.icd,
        doctorId: null,
        status: "waiting",
        arrivalTime: clock.hospitalTimeMs,
        completedAt: null,
        ordersGenerated: 0,
      };
      visits.set(visit.id, visit);
    }
  }

  const waitingVisits = Array.from(visits.values()).filter(v => v.status === "waiting");
  const poliCapacity: Record<string, number> = {};
  for (const p of POLIKLINIK) poliCapacity[p.id] = p.capacityPerTick;

  for (const visit of waitingVisits) {
    const cap = poliCapacity[visit.poli] ?? 1;
    if (cap <= 0) continue;
    poliCapacity[visit.poli]--;

    const doctors = agentPool ? Array.from(agentPool.agents.values()).filter(
      a => (a.role === "dokter_umum" || a.role === "dokter_spesialis") && a.status.inShift
    ) : [];
    const doctor = doctors[Math.floor(Math.random() * doctors.length)];

    visits.set(visit.id, { ...visit, status: "in-consultation", doctorId: doctor?.id ?? null });
  }

  const consultingVisits = Array.from(visits.values()).filter(v => v.status === "in-consultation");
  for (const visit of consultingVisits) {
    if (Math.random() > 0.35) continue;

    const dx = DIAGNOSIS_POOL.find(d => d.icd === visit.icdCode);
    if (dx && Math.random() > 0.4) {
      const lab = LAB_TESTS[Math.floor(Math.random() * LAB_TESTS.length)]!;
      const labOrder: LabOrder = {
        id: `POLI-LAB-${clock.tick}-${visit.patientId}-${lab.code}`,
        encounterId: visit.encounterId, patientId: visit.patientId,
        testName: lab.name, testCode: lab.code,
        status: "ordered", result: null,
        referenceRange: lab.range, unit: lab.unit,
        orderedAt: clock.hospitalTimeMs, resultedAt: null,
      };
      newLabOrders.set(labOrder.id, labOrder);
    }

    if (dx && Math.random() > 0.5) {
      const med = MEDICATIONS[Math.floor(Math.random() * MEDICATIONS.length)]!;
      const medOrder: MedicationOrder = {
        id: `POLI-MED-${clock.tick}-${visit.patientId}-${med.code}`,
        encounterId: visit.encounterId, patientId: visit.patientId,
        medication: { code: med.code, name: med.name, dose: med.dose, route: med.route },
        status: "ordered", dose: med.dose, route: med.route,
        frequency: Math.random() > 0.5 ? "QD" : "BID",
        orderedAt: clock.hospitalTimeMs, administeredAt: null,
      };
      newMedOrders.set(medOrder.id, medOrder);
    }

    visits.set(visit.id, {
      ...visit, status: "completed", completedAt: clock.hospitalTimeMs,
      ordersGenerated: (visit.ordersGenerated || 0) + 1,
    });

    newEncounters.set(visit.encounterId, {
      ...newEncounters.get(visit.encounterId)!,
      endTime: clock.hospitalTimeMs,
      status: "discharged",
    });
  }

  return {
    ...state, encounters: newEncounters, labOrders: newLabOrders,
    medicationOrders: newMedOrders, _outpatientVisits: visits,
  };
}
