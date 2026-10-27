/**
 * Jasa Raharja incident provenance — Epic IX M9.3 wave 2 (ADR-016 D6).
 *
 * When a road accident patient arrives (via ambulance or ED walk-in with
 * road-accident ICD codes), create an incidentRef record that links the
 * encounter to a Jasa Raharja claim.
 *
 * Trigger set: T20 (burns), T63 (toxic effect) — per M9.3-BLOCKER-DECISIONS.
 */
import type { HospitalState } from "../engine/state-store.js";
import type { Clock } from "../engine/clock.js";
import type { EventQueue } from "../engine/event-queue.js";
import type { AmbulanceDispatch } from "./ambulance.js";

export interface JRIIncident {
  id: string;
  type: "road_accident" | "mass_casualty";
  /** First encounter of the incident. */
  encounterId?: string;
  /** Every encounter treated under this incident (re-presentations within the JR window). */
  encounterIds?: string[];
  patientId?: string;
  letterId?: string;
  dispatchId?: string;
  damageLevel: "mild" | "moderate" | "severe";
  triggerIcd: string;
  tick: number;
}

export interface JrState {
  incidents: Map<string, JRIIncident>;
  counter: number;
}

// JR trigger ICD codes per M9.3-BLOCKER-DECISIONS D5
const JR_TRIGGER_ICDS = new Set(["T20", "T63", "S72", "S82", "S92", "T07"]);

export function initJrState(): JrState {
  return { incidents: new Map(), counter: 0 };
}

/**
 * Check if an encounter's diagnoses trigger Jasa Raharja coverage.
 * Returns the trigger ICD if found, null otherwise.
 */
export function checkJrTrigger(encounter: { primaryDiagnosis: string; patientId: string }): string | null {
  const icd = encounter.primaryDiagnosis;
  if (!icd) return null;
  // Match first 3 chars (ICD-10 category)
  const prefix = icd.substring(0, 3);
  return JR_TRIGGER_ICDS.has(prefix) ? prefix : null;
}

/**
 * Create a Jasa Raharja incident record when a trigger is detected.
 * Returns the incident ID if created, null if already exists or no trigger.
 */
export function createJrIncident(
  state: JrState,
  encounterId: string | null,
  letterId: string | null,
  dispatch: AmbulanceDispatch | null,
  triggerIcd: string,
  tick: number
): string | null {
  // Check if already logged for this encounter/letter
  for (const inc of state.incidents.values()) {
    if (inc.encounterId === encounterId || inc.letterId === letterId) return null;
  }

  state.counter++;
  const incidentId = `JRINC-${String(state.counter).padStart(4, "0")}`;

  const incident: JRIIncident = {
    id: incidentId,
    type: "road_accident",
    encounterId: encounterId ?? undefined,
    letterId: letterId ?? undefined,
    dispatchId: dispatch?.id ?? undefined,
    damageLevel: determineDamageLevel(triggerIcd),
    triggerIcd,
    tick,
  };

  state.incidents.set(incidentId, incident);
  return incidentId;
}

/**
 * Simple damage level heuristic based on ICD code.
 */
function determineDamageLevel(icd: string): JRIIncident["damageLevel"] {
  // Burns (T20) and toxic effects (T63) default to moderate
  // Fractures (S72, S82, S92) can be severe
  if (icd.startsWith("S7") || icd.startsWith("S8") || icd.startsWith("S9")) {
    return "severe";
  }
  return "moderate";
}

/**
 * Get all JR incidents for reporting.
 */
export function getJrIncidents(state: JrState): JRIIncident[] {
  return Array.from(state.incidents.values());
}

/** Jasa Raharja's 30-day treatment window (finance.ts JR_TICK_CAP), in ticks. */
const JR_WINDOW_TICKS = 30 * 24 * 60;

/** The incident an encounter is filed under, if any. */
export function getIncidentForEncounter(state: JrState, encounterId: string): JRIIncident | undefined {
  for (const inc of state.incidents.values()) {
    if (inc.encounterId === encounterId || inc.encounterIds?.includes(encounterId)) return inc;
  }
  return undefined;
}

/**
 * Epic IX M9.3 wave 2: Jasa Raharja provenance tick handler.
 * Scans encounters for JR trigger ICDs. One accident is one incident: a
 * patient's later encounters within the JR window are added to the same
 * incident instead of opening new ones (2026-10-27; before, one patient with
 * four encounters produced four incidents). Referral arrivals carry their
 * letter and ambulance dispatch.
 */
export function jrProvenanceHandler(state: HospitalState, _clock: Clock, _queue: EventQueue): HospitalState {
  const jrState = (state as unknown as { _jrState?: JrState })._jrState;
  if (!jrState) return state;

  const encounters = Array.from(state.encounters.values()).sort((a, b) => a.startTime - b.startTime || (a.id < b.id ? -1 : 1));
  const letters = Array.from(state._referralState?.letters?.values() ?? []);
  const newIncidents = new Map(jrState.incidents);
  let counter = jrState.counter;
  const logged = new Set<string>();
  for (const inc of newIncidents.values()) {
    if (inc.encounterId) logged.add(inc.encounterId);
    for (const e of inc.encounterIds ?? []) logged.add(e);
  }

  for (const enc of encounters) {
    if (logged.has(enc.id)) continue;
    const trigger = checkJrTrigger({ primaryDiagnosis: enc.primaryDiagnosis ?? "", patientId: enc.patientId });
    if (!trigger) continue;
    const tick = Math.floor(enc.startTime / 60_000);

    const open = Array.from(newIncidents.values()).find(i => i.patientId === enc.patientId && tick - i.tick <= JR_WINDOW_TICKS);
    if (open) {
      newIncidents.set(open.id, { ...open, encounterIds: [...(open.encounterIds ?? [open.encounterId!]), enc.id] });
    } else {
      counter++;
      const id = `JRINC-${String(counter).padStart(4, "0")}`;
      const letter = letters.find(l => l.encounterId === enc.id);
      newIncidents.set(id, {
        id,
        type: "road_accident",
        encounterId: enc.id,
        encounterIds: [enc.id],
        patientId: enc.patientId,
        ...(letter ? { letterId: letter.id } : {}),
        ...(letter?.dispatchId ? { dispatchId: letter.dispatchId } : {}),
        damageLevel: determineDamageLevel(trigger),
        triggerIcd: trigger,
        // Accident time = the first encounter's start (the window is measured from it).
        tick,
      });
    }
    logged.add(enc.id);
  }

  return Object.assign({}, state, { _jrState: { ...jrState, incidents: newIncidents, counter } }) as HospitalState;
}
