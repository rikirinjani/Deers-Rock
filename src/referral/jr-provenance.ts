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
  encounterId?: string;
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

/**
 * Epic IX M9.3 wave 2: Jasa Raharja provenance tick handler.
 * Scans active encounters for JR trigger ICDs and creates incidents.
 */
export function jrProvenanceHandler(state: HospitalState, clock: Clock, queue: EventQueue): HospitalState {
  const jrState = (state as unknown as { _jrState?: JrState })._jrState;
  if (!jrState) return state;

  const encounters = Array.from((state as unknown as { encounters: Map<string, { primaryDiagnosis: string; id: string }> }).encounters.values());
  let newIncidents = new Map(jrState.incidents);
  let counter = jrState.counter;

  for (const enc of encounters) {
    const trigger = checkJrTrigger({ primaryDiagnosis: enc.primaryDiagnosis, patientId: enc.id });
    if (!trigger) continue;
    // Check if already logged
    let alreadyLogged = false;
    for (const inc of newIncidents.values()) {
      if (inc.encounterId === enc.id) { alreadyLogged = true; break; }
    }
    if (alreadyLogged) continue;

    counter++;
    newIncidents.set(`JRINC-${String(counter).padStart(4, "0")}`, {
      id: `JRINC-${String(counter).padStart(4, "0")}`,
      type: "road_accident",
      encounterId: enc.id,
      damageLevel: determineDamageLevel(trigger),
      triggerIcd: trigger,
      tick: clock.tick,
    });
  }

  return Object.assign({}, state, { _jrState: { ...jrState, incidents: newIncidents, counter } }) as HospitalState;
}
