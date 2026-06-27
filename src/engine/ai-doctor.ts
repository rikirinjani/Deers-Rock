import type { HospitalState, CaseRecord } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { HospitalAgent } from "../agent/types.js";
import type { LabOrder, MedicationOrder, RadiologyOrder, SurgeryOrder, RespiratoryOrder, DietOrder, PhysicianOrder } from "../patient/schema.js";
import type { SpecialtyOrder } from "./specialty.js";
import { ICD_PROTOCOLS, mapIcdToActions, mapIcdToSpecialty, getVitalsTriggers, assessQsofa, ESCALATION_TRIGGERS, assessMortalityRisk } from "./clinical-knowledge.js";
import { getActionRanking } from "./agent-learning.js";
import { LAB_TESTS } from "./lab.js";
import { MEDICATIONS } from "./pharmacy.js";
import { RAD_STUDIES } from "./radiology.js";

const ROUND_INTERVAL = 4;

export function aiDoctorHandler(state: HospitalState, clock: Clock, queue: EventQueue): HospitalState {
  let newPhysOrders = new Map(state.physicianOrders);
  let newLabOrders = new Map(state.labOrders);
  let newMedOrders = new Map(state.medicationOrders);
  let newRadOrders = new Map(state.radiologyOrders);
  let newSurgOrders = new Map(state.surgeryOrders);
  let newRespOrders = new Map(state.respiratoryOrders);
  let newDietOrders = new Map(state.dietOrders);
  let newSpecOrders = new Map(state.specialtyOrders);
  let newEncounters = new Map(state.encounters);
  let caseMemory = new Map(state._doctorCaseMemory ?? []);

  const agentPool = state._agentState?.pool;
  if (!agentPool) return state;

  const assignableAgents = Array.from(agentPool.agents.values()).filter(
    a => (a.role === "dokter_umum" || a.role === "dokter_spesialis") && a.status.inShift && a.status.kesehatan !== "sakit_berat"
  );

  const activeEncounters = Array.from(state.encounters.values()).filter(e => e.status === "active");

  for (const enc of activeEncounters) {
    const patient = state.patients.get(enc.patientId);
    if (!patient) continue;

    if (!enc.attendingDoctorId) {
      const doctor = assignBestDoctor(assignableAgents, patient.diagnoses.map(d => d.code));
      if (doctor) {
        newEncounters.set(enc.id, { ...enc, attendingDoctorId: doctor.id });
      }
    }

    if (clock.tick % ROUND_INTERVAL !== 0) continue;

    const doctorId = enc.attendingDoctorId;
    const doctor = doctorId ? agentPool.agents.get(doctorId) : undefined;

    const clinicalActions: { action: { type: string; label: string; priority: number; detail?: string }; reason: string }[] = [];

    for (const dx of patient.diagnoses) {
      if (!dx.active) continue;
      const actions = mapIcdToActions(dx.code);
      for (const a of actions) {
        clinicalActions.push({ action: { ...a, type: a.type }, reason: dx.code });
      }
    }

    const vitalsActions = getVitalsTriggers(patient.vitals);
    for (const a of vitalsActions) {
      clinicalActions.push({ action: { ...a }, reason: "vitals" });
    }

    const qsofa = assessQsofa(patient.vitals, patient.age, patient.diagnoses);
    if (qsofa.likelySepsis) {
      clinicalActions.push({ action: { type: "consult", label: "Penyakit Dalam", priority: 10, detail: "sepsis_alert" }, reason: `qSOFA ${qsofa.score}: ${qsofa.details.join(", ")}` });
    }

    for (const trigger of ESCALATION_TRIGGERS) {
      if (patient.vitals.heartRate > 120 && patient.vitals.bloodPressureSystolic < 90 && trigger.condition.includes("HR > 120")) {
        clinicalActions.push({ action: trigger.escalationAction, reason: trigger.reason });
      }
      if (patient.vitals.oxygenSaturation < 88 && trigger.condition.includes("SpO2 < 88")) {
        clinicalActions.push({ action: trigger.escalationAction, reason: trigger.reason });
      }
      if (patient.vitals.temperature > 39.5 && trigger.condition.includes("Temp > 39.5")) {
        clinicalActions.push({ action: trigger.escalationAction, reason: trigger.reason });
      }
      if (patient.vitals.painLevel > 8 && trigger.condition.includes("Pain > 8")) {
        clinicalActions.push({ action: trigger.escalationAction, reason: trigger.reason });
      }
    }

    const mortality = assessMortalityRisk(patient.age, patient.vitals, patient.diagnoses);
    if (mortality.risk === "high") {
      clinicalActions.push({ action: { type: "consult", label: "Penyakit Dalam", priority: 10, detail: "high_mortality" }, reason: `Mortality risk ${mortality.score}: ${mortality.factors.join(", ")}` });
    }

    clinicalActions.sort((a, b) => b.action.priority - a.action.priority);
    const seen = new Set<string>();
    const deduped = clinicalActions.filter(ca => {
      const key = `${ca.action.type}:${ca.action.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const learningMemory = state._learningMemory;
    const activeDx = patient.diagnoses.filter(d => d.active);
    const ranked = learningMemory ? getActionRanking(learningMemory, activeDx[0]?.code ?? "", deduped.map(a => ({ actionLabel: `${a.action.type}:${a.action.label}`, actionType: a.action.type }))) : null;
    if (ranked) {
      const rankedMap = new Map(ranked.map(r => [r.actionLabel, r.score]));
      deduped.sort((a, b) => {
        const sa = rankedMap.get(`${a.action.type}:${a.action.label}`) ?? 0.5;
        const sb = rankedMap.get(`${b.action.type}:${b.action.label}`) ?? 0.5;
        return sb - sa;
      });
    }

    const topActions = deduped.slice(0, 4);

    const keyPrefix = `AI-${clock.tick}-${enc.patientId}`;
    const existingOrderKeys = new Set<string>();
    for (const o of state.physicianOrders.values()) if (o.patientId === enc.patientId) existingOrderKeys.add(`physician:${o.description}`);
    for (const o of state.labOrders.values()) if (o.patientId === enc.patientId) existingOrderKeys.add(`lab:${o.testName}`);
    for (const o of state.medicationOrders.values()) if (o.patientId === enc.patientId) existingOrderKeys.add(`med:${o.medication.name}`);
    for (const o of state.radiologyOrders.values()) if (o.patientId === enc.patientId) existingOrderKeys.add(`rad:${o.studyType}`);

    const taken: string[] = [];
    const caseKey = `CASE-${enc.id}`;
    const existingCase = caseMemory.get(caseKey);
    const alreadyTaken = new Set(existingCase?.actionsTaken ?? []);

    for (const ca of topActions) {
      const orderKey = `${ca.action.type}:${ca.action.label}`;
      if (alreadyTaken.has(orderKey)) continue;

      const phyOrder: PhysicianOrder = {
        id: `${keyPrefix}-ORD-${ca.action.type}`,
        encounterId: enc.id, patientId: enc.patientId,
        orderType: ca.action.type as PhysicianOrder["orderType"],
        description: ca.action.label,
        status: "active",
        orderedAt: clock.hospitalTimeMs, completedAt: null,
      };
      newPhysOrders.set(phyOrder.id, phyOrder);

      switch (ca.action.type) {
        case "lab": {
          const test = LAB_TESTS.find(t => t.name === ca.action.label || t.code === ca.action.detail);
          if (test && !existingOrderKeys.has(`lab:${test.name}`)) {
            const order: LabOrder = {
              id: `${keyPrefix}-${test.code}`,
              encounterId: enc.id, patientId: enc.patientId,
              testName: test.name, testCode: test.code,
              status: "ordered", result: null,
              referenceRange: test.range, unit: test.unit,
              orderedAt: clock.hospitalTimeMs, resultedAt: null,
            };
            newLabOrders.set(order.id, order);
            taken.push(orderKey);
          }
          break;
        }
        case "medication": {
          const med = MEDICATIONS.find(m => m.name === ca.action.label || m.code === ca.action.detail);
          if (med && !existingOrderKeys.has(`med:${med.name}`)) {
            const order: MedicationOrder = {
              id: `${keyPrefix}-${med.code}`,
              encounterId: enc.id, patientId: enc.patientId,
              medication: { code: med.code, name: med.name, dose: med.dose, route: med.route },
              status: "ordered", dose: med.dose, route: med.route,
              frequency: determineFrequency(ca.action.label),
              orderedAt: clock.hospitalTimeMs, administeredAt: null,
            };
            newMedOrders.set(order.id, order);
            taken.push(orderKey);
          }
          break;
        }
        case "imaging": {
          const study = RAD_STUDIES.find(s => s.studyType === ca.action.label || s.modality === ca.action.detail);
          if (study && !existingOrderKeys.has(`rad:${study.studyType}`)) {
            const order: RadiologyOrder = {
              id: `${keyPrefix}-RAD`,
              encounterId: enc.id, patientId: enc.patientId,
              studyType: study.studyType, modality: study.modality,
              status: "ordered", finding: null, impression: null,
              orderedAt: clock.hospitalTimeMs, resultedAt: null,
            };
            newRadOrders.set(order.id, order);
            queue.schedule("rad_result", clock.tick + 3, { radId: order.id, findings: study.findings, impressions: study.impressions });
            taken.push(orderKey);
          }
          break;
        }
        case "consult": {
          if (!existingOrderKeys.has(`physician:${ca.action.label}`)) {
            const spec = ca.action.detail ?? "cardiology";
            const order: SpecialtyOrder = {
              id: `${keyPrefix}-SPEC-${spec}`,
              encounterId: enc.id, patientId: enc.patientId,
              specialty: spec as never, serviceName: ca.action.label,
              status: "ordered", orderedAt: clock.hospitalTimeMs,
              completedAt: null, findings: null, doctorId: doctorId ?? null,
            };
            newSpecOrders.set(order.id, order);
            taken.push(orderKey);
          }
          break;
        }
        case "respiratory": {
          if (!existingOrderKeys.has(`physician:${ca.action.label}`)) {
            const therapyType = ca.action.detail as RespiratoryOrder["therapyType"] ?? "oxygen";
            const order: RespiratoryOrder = {
              id: `${keyPrefix}-RT`,
              encounterId: enc.id, patientId: enc.patientId,
              therapyType, status: "ordered",
              settings: ca.action.label,
              orderedAt: clock.hospitalTimeMs, notes: null,
            };
            newRespOrders.set(order.id, order);
            taken.push(orderKey);
          }
          break;
        }
        case "diet": {
          if (!existingOrderKeys.has(`physician:${ca.action.label}`)) {
            const dietType = ca.action.detail as DietOrder["dietType"] ?? "regular";
            const order: DietOrder = {
              id: `${keyPrefix}-DIET`,
              encounterId: enc.id, patientId: enc.patientId,
              dietType, status: "active",
              orderedAt: clock.hospitalTimeMs,
              notes: ca.action.label,
            };
            newDietOrders.set(order.id, order);
            taken.push(orderKey);
          }
          break;
        }
        case "surgery": {
          if (!existingOrderKeys.has(`physician:${ca.action.label}`)) {
            const procCode = ca.action.detail ?? "47562";
            const order: SurgeryOrder = {
              id: `${keyPrefix}-OR`,
              encounterId: enc.id, patientId: enc.patientId,
              procedureName: ca.action.label, procedureCode: procCode,
              status: "scheduled",
              surgeon: doctor?.nama ?? "Dr. Surgical Team",
              scheduledAt: clock.hospitalTimeMs, completedAt: null, notes: null,
            };
            newSurgOrders.set(order.id, order);
            queue.schedule("surgery_done", clock.tick + 5, { surgeryId: order.id });
            taken.push(orderKey);
          }
          break;
        }
      }
    }

    if (existingCase) {
      caseMemory.set(caseKey, {
        ...existingCase,
        actionsTaken: [...existingCase.actionsTaken, ...taken],
      });
    } else {
      caseMemory.set(caseKey, {
        encounterId: enc.id,
        patientId: enc.patientId,
        primaryDiagnosis: patient.diagnoses.find(d => d.active)?.code ?? "Z00",
        actionsTaken: taken,
        outcome: "active",
        tickStarted: Math.floor(enc.startTime / 60000),
        tickEnded: null,
      });
    }
  }

  return {
    ...state,
    encounters: newEncounters,
    physicianOrders: newPhysOrders,
    labOrders: newLabOrders,
    medicationOrders: newMedOrders,
    radiologyOrders: newRadOrders,
    surgeryOrders: newSurgOrders,
    respiratoryOrders: newRespOrders,
    dietOrders: newDietOrders,
    specialtyOrders: newSpecOrders,
    _doctorCaseMemory: caseMemory,
  };
}

function assignBestDoctor(agents: HospitalAgent[], diagnoses: string[]): HospitalAgent | undefined {
  if (agents.length === 0) return undefined;
  const primaryCode = diagnoses[0];
  const targetSpecialty = primaryCode ? mapIcdToSpecialty(primaryCode) : undefined;

  const specialists = agents.filter(a => {
    if (a.role !== "dokter_spesialis") return false;
    return a.spesialisasi?.toLowerCase().replace(/\s/g, "_") === targetSpecialty;
  });

  if (specialists.length > 0) return specialists[Math.floor(Math.random() * specialists.length)];
  return agents.filter(a => a.role === "dokter_umum")[Math.floor(Math.random() * Math.min(5, agents.length))] ?? agents[Math.floor(Math.random() * agents.length)]!;
}

function determineFrequency(medName: string): string {
  if (medName.includes("Enoxaparin") || medName.includes("STAT") || medName.includes("Diazepam")) return "STAT";
  if (medName.includes("Furosemide")) return "BID";
  if (medName.includes("Metformin") || medName.includes("Enalapril") || medName.includes("Atorvastatin")) return "QD";
  if (medName.includes("Levofloxacin") || medName.includes("Omeprazole")) return "QD";
  if (medName.includes("Salbutamol")) return "PRN";
  if (medName.includes("Paracetamol")) return "TID";
  return "QD";
}
