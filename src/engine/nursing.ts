import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { NurseNote } from "../patient/schema.js";

const OBSERVATIONS = [
  "Patient alert and oriented x3",
  "Skin warm and dry, no rashes noted",
  "Lungs clear to auscultation bilaterally",
  "Bowel sounds present in all quadrants",
  "IV site clean, dry, intact",
  "Pain level 2/10 at rest",
  "Patient ambulating with assistance",
  "Diet tolerated well, no nausea",
  "Wound dressing dry and intact",
  "Patient resting comfortably in bed",
  "Heart sounds regular, no murmurs",
  "Pulses palpable in all extremities",
  "Patient reporting improved symptoms today",
  "O2 saturation stable on room air",
  "Urine output adequate",
];

const MAX_NOTES_PER_ENCOUNTER = 15;
const MAX_TOTAL_NOTES = 500;

export function nursingHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const activeEncounters = Array.from(state.encounters.values()).filter(e => e.status === "active");
  if (activeEncounters.length === 0) return state;

  if (clock.tick % 5 !== 0) return state;

  const newNotes = new Map(state.nurseNotes);
  for (const encounter of activeEncounters) {
    if (Math.random() > 0.35) continue;

    const existing = Array.from(newNotes.values()).filter(n => n.encounterId === encounter.id);
    if (existing.length >= MAX_NOTES_PER_ENCOUNTER) {
      const sorted = existing.sort((a, b) => a.timestamp - b.timestamp);
      for (let i = 0; i < sorted.length - MAX_NOTES_PER_ENCOUNTER + 1; i++) {
        newNotes.delete(sorted[i]!.id);
      }
    }

    const note: NurseNote = {
      id: `NURSE-${clock.tick}-${encounter.patientId}`,
      encounterId: encounter.id,
      patientId: encounter.patientId,
      noteType: "round",
      content: OBSERVATIONS[Math.floor(Math.random() * OBSERVATIONS.length)]!,
      timestamp: clock.hospitalTimeMs,
    };
    newNotes.set(note.id, note);
  }

  if (newNotes.size > MAX_TOTAL_NOTES) {
    const sorted = Array.from(newNotes.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = sorted.slice(0, newNotes.size - MAX_TOTAL_NOTES);
    for (const [id] of toRemove) newNotes.delete(id);
  }

  return { ...state, nurseNotes: newNotes };
}
