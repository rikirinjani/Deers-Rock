import type { HospitalState, NurseCaseRecord } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { NurseNote, MedicationOrder } from "../patient/schema.js";
import { generateNurseNote } from "./nursing-knowledge.js";
import { getDeteriorationRate } from "./agent-learning.js";

const MAX_NOTES_PER_ENCOUNTER = 20;
const MAX_TOTAL_NOTES = 300;

export function aiNurseHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  let newNotes = new Map(state.nurseNotes);
  let newMedOrders = new Map(state.medicationOrders);
  let newEncounters = new Map(state.encounters);
  let nurseMemory = new Map(state._nurseCaseMemory ?? []);

  const agentPool = state._agentState?.pool;
  if (!agentPool) return state;

  const availableNurses = Array.from(agentPool.agents.values()).filter(
    a => (a.role === "perawat" || a.role === "perawat_anestesi" || a.role === "bidan") && a.status.inShift && a.status.kesehatan !== "sakit_berat"
  );

  const activeEncounters = Array.from(state.encounters.values()).filter(e => e.status === "active");

  for (const enc of activeEncounters) {
    const patient = state.patients.get(enc.patientId);
    if (!patient) continue;

    if (!enc.assignedNurseId && availableNurses.length > 0) {
      const nurse = availableNurses[Math.floor(clock.rng() * availableNurses.length)]!;
      newEncounters.set(enc.id, { ...enc, assignedNurseId: nurse.id });
    }

    const primaryDx = patient.diagnoses.filter(d => d.active)[0];
    const deteriorationRate = primaryDx && state._learningMemory ? getDeteriorationRate(state._learningMemory, primaryDx.code) : null;
    const highRisk = deteriorationRate !== null && deteriorationRate > 0.5;
    const monitoringInterval = highRisk ? 2 : 3;
    if (clock.tick % monitoringInterval !== 0) continue;

    const currentNoteCount = Array.from(newNotes.values()).filter(n => n.encounterId === enc.id).length;
    if (currentNoteCount >= MAX_NOTES_PER_ENCOUNTER) continue;

    const diagnoses = patient.diagnoses.filter(d => d.active);
    const vitals = patient.vitals;

    const memoryKey = `NURSE-CASE-${enc.id}`;
    const mem = nurseMemory.get(memoryKey) ?? {
      encounterId: enc.id, patientId: enc.patientId,
      assignedNurseId: enc.assignedNurseId ?? null,
      assessmentsDone: 0, alertsRaised: 0, proceduresDone: 0, medsAdministered: 0,
      lastNoteTick: 0,
    };

    const isAssessmentTick = clock.tick % 12 === 0;
    const isProcedureTick = clock.tick % 9 === 0;
    const isObservationTick = clock.tick % 3 === 0 && !isAssessmentTick && !isProcedureTick;

    let noteType: NurseNote["noteType"];
    let content: string;

    if (highRisk && isObservationTick) {
      noteType = "observation";
      content = `🧠 Learning: ${primaryDx?.name ?? "unknown"} has ${(deteriorationRate! * 100).toFixed(0)}% deterioration rate — increased monitoring`;
      mem.assessmentsDone++;
    } else if (isAssessmentTick) {
      noteType = "assessment";
      content = generateNurseNote(diagnoses, vitals, "assessment");
      mem.assessmentsDone++;
    } else if (isProcedureTick) {
      noteType = "procedure";
      content = generateNurseNote(diagnoses, vitals, "procedure");
      mem.proceduresDone++;
    } else {
      const obs = generateNurseNote(diagnoses, vitals, "observation");
      if (obs.startsWith("⚠️")) {
        noteType = "observation";
        content = obs;
        mem.alertsRaised++;
      } else {
        noteType = "round";
        content = obs;
      }
    }

    const note: NurseNote = {
      id: `NURSE-${clock.tick}-${enc.patientId}-${String(mem.assessmentsDone + mem.proceduresDone + mem.alertsRaised).padStart(3, "0")}`,
      encounterId: enc.id,
      patientId: enc.patientId,
      noteType,
      content,
      timestamp: clock.hospitalTimeMs,
    };

    newNotes.set(note.id, note);
    mem.lastNoteTick = clock.tick;

    const pendingMeds = Array.from(state.medicationOrders.values()).filter(
      m => m.encounterId === enc.id && m.status === "ordered"
    );

    for (const med of pendingMeds.slice(0, 2)) {
      if (clock.rng() > 0.6) continue;
      newMedOrders.set(med.id, {
        ...med,
        status: "administered",
        administeredAt: clock.hospitalTimeMs,
      } as MedicationOrder);
      mem.medsAdministered++;
    }

    nurseMemory.set(memoryKey, mem);
  }

  if (newNotes.size > MAX_TOTAL_NOTES) {
    const sorted = Array.from(newNotes.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = sorted.slice(0, newNotes.size - MAX_TOTAL_NOTES);
    for (const [id] of toRemove) newNotes.delete(id);
  }

  return {
    ...state,
    encounters: newEncounters,
    nurseNotes: newNotes,
    medicationOrders: newMedOrders,
    _nurseCaseMemory: nurseMemory,
  };
}
