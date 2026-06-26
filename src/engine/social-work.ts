import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { SocialWorkNote } from "../patient/schema.js";

const DISPOSITIONS: SocialWorkNote["disposition"][] = ["home", "home", "rehab", "SNF", "hospice", "psychiatric"];

const ASSESSMENTS = [
  "Patient lives with family, home environment appropriate for discharge",
  "Patient requires home health services for wound care",
  "Evaluated for skilled nursing facility placement",
  "Family meeting held, discussing long-term care options",
  "Patient has adequate social support for home discharge",
  "Home safety evaluation recommended before discharge",
  "Financial counseling provided for medication assistance",
  "Transportation arranged for follow-up appointments",
  "Elderly patient lives alone, exploring community support services",
  "Patient and family educated on discharge plan",
];

const COUNSELING = [
  "Provided emotional support regarding new diagnosis",
  "Coping strategies discussed with patient and family",
  "Grief counseling initiated",
  "Substance use counseling referral placed",
  "Support group information provided",
];

export function socialWorkHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const activeEncounters = Array.from(state.encounters.values()).filter(e => e.status === "active");
  if (activeEncounters.length === 0 || clock.tick % 9 !== 0) return state;

  const encounter = activeEncounters[Math.floor(Math.random() * activeEncounters.length)]!;
  const noteType = Math.random() > 0.5 ? "assessment" : "counseling";
  const content = noteType === "assessment"
    ? ASSESSMENTS[Math.floor(Math.random() * ASSESSMENTS.length)]!
    : COUNSELING[Math.floor(Math.random() * COUNSELING.length)]!;

  const socialNote: SocialWorkNote = {
    id: `SW-${clock.tick}-${encounter.patientId}`,
    encounterId: encounter.id,
    patientId: encounter.patientId,
    noteType: noteType as SocialWorkNote["noteType"],
    content,
    timestamp: clock.hospitalTimeMs,
    disposition: noteType === "assessment" ? DISPOSITIONS[Math.floor(Math.random() * DISPOSITIONS.length)]! : null,
  };

  const newNotes = new Map(state.socialWorkNotes);
  newNotes.set(socialNote.id, socialNote);

  return { ...state, socialWorkNotes: newNotes };
}
