/**
 * Appointment Scheduling — Epic VI M6.2 (ADR-017)
 *
 * Manages scheduled outpatient appointments with time slots,
 * queue management, and no-show tracking.
 */
import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import type { EventQueue } from "./event-queue.js";

export type AppointmentStatus = "scheduled" | "checked_in" | "in_consultation" | "completed" | "no_show" | "cancelled";

export interface Appointment {
  id: string;
  patientId: string;
  encounterId: string;
  poli: string;
  scheduledTick: number;
  actualTick: number | null;
  status: AppointmentStatus;
  doctorId: string | null;
  notes?: string;
}

export interface AppointmentState {
  appointments: Map<string, Appointment>;
  counter: number;
}

const MAX_APPOINTMENTS = 500;
const NO_SHOW_THRESHOLD_TICKS = 2880; // 2 sim-days

export function initAppointmentState(): AppointmentState {
  return { appointments: new Map(), counter: 0 };
}

export function createAppointment(
  state: HospitalState,
  patientId: string,
  encounterId: string,
  poli: string,
  scheduledTick: number,
  doctorId: string | null = null
): string {
  const apptState = (state as unknown as { _appointmentState?: AppointmentState })._appointmentState;
  if (!apptState) return "";

  const id = `APT-${String(apptState.counter++).padStart(4, "0")}`;
  apptState.appointments.set(id, {
    id, patientId, encounterId, poli,
    scheduledTick, actualTick: null,
    status: "scheduled", doctorId,
  });

  // Bounded: evict oldest if over limit
  while (apptState.appointments.size > MAX_APPOINTMENTS) {
    const firstKey = apptState.appointments.keys().next().value;
    if (firstKey) apptState.appointments.delete(firstKey);
  }

  return id;
}

export function appointmentHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const apptState = (state as unknown as { _appointmentState?: AppointmentState })._appointmentState;
  if (!apptState) return state;

  const newAppts = new Map(apptState.appointments);
  const currentTick = clock.tick;

  for (const [id, appt] of newAppts) {
    if (appt.status !== "scheduled") continue;
    if (currentTick >= appt.scheduledTick && appt.actualTick === null) {
      // Check if patient is still in the system
      const patient = state.patients.get(appt.patientId);
      const encounter = state.encounters.get(appt.encounterId);
      if (patient && encounter && encounter.status === "active") {
        newAppts.set(id, { ...appt, status: "checked_in", actualTick: currentTick });
      } else {
        // Patient no longer active — mark no-show
        newAppts.set(id, { ...appt, status: "no_show" });
      }
    }
    // No-show timeout: scheduled but never checked in
    if (appt.status === "scheduled" && currentTick - appt.scheduledTick > NO_SHOW_THRESHOLD_TICKS) {
      newAppts.set(id, { ...appt, status: "no_show" });
    }
  }

  return Object.assign({}, state, {
    _appointmentState: { appointments: newAppts, counter: apptState.counter },
  }) as HospitalState;
}

export function getUpcomingAppointments(state: HospitalState, nextNTicks: number = 10): Appointment[] {
  const apptState = (state as unknown as { _appointmentState?: AppointmentState })._appointmentState;
  if (!apptState) return [];
  const currentTick = state as unknown as { _clock?: { tick: number } };
  const tick = 0; // will be set at runtime
  return Array.from(apptState.appointments.values())
    .filter(a => a.status === "scheduled" && a.scheduledTick <= tick + nextNTicks)
    .sort((a, b) => a.scheduledTick - b.scheduledTick);
}
