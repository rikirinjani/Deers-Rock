/**
 * Appointment Scheduling — Epic VI M6.2 (ADR-017)
 *
 * Manages scheduled outpatient appointments with time slots,
 * queue management, and no-show tracking.
 *
 * Wired 2026-10-27 (createAppointment previously had no caller): every
 * inpatient discharged alive gets a kontrol (surat kontrol) at the poli for
 * their diagnosis 7 days later, in a Monday–Saturday 08:00–14:00 clinic
 * slot. When it falls due the patient attends (one draw, 80%) and is
 * checked in as a waiting outpatient visit, which outpatientHandler then
 * consults; the appointment completes with that visit. Otherwise no_show.
 */
import type { HospitalState, OutpatientVisit } from "./state-store.js";
import type { Clock } from "./clock.js";
import type { EventQueue } from "./event-queue.js";
import type { Encounter } from "../patient/schema.js";
import { assignPayer } from "./finance.js";
import { shiftAt } from "../agent/roster.js";

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
  /** Diagnosis the kontrol follows up. */
  icdCode?: string;
  /** Outpatient encounter created at check-in. */
  visitEncounterId?: string;
}

export interface AppointmentState {
  appointments: Map<string, Appointment>;
  counter: number;
}

const MAX_APPOINTMENTS = 500;
const NO_SHOW_THRESHOLD_TICKS = 2880; // 2 sim-days
export const KONTROL_AFTER_TICKS = 7 * 1440;
/** Share of kontrol appointments attended (matches discharge-planning's 80% rujuk balik attendance). */
export const KONTROL_ATTENDANCE = 0.8;
const CLINIC_OPEN_MINUTE = 8 * 60;
const CLINIC_SLOTS = 36; // 10-minute slots, 08:00–14:00
const START_MINUTE_OF_DAY = 18 * 60; // calendar.ts start, 18:00
const HANDLER_PERIOD = 3; // world.ts cadence for appointmentHandler

export function initAppointmentState(): AppointmentState {
  return { appointments: new Map(), counter: 0 };
}

/**
 * Tick of the first clinic slot (Mon–Sat 08:00–14:00) at or after `notBefore`,
 * staggered by `slotIndex` × 10 minutes.
 */
export function clinicSlotTick(notBefore: number, slotIndex: number): number {
  const minuteOfDay = (START_MINUTE_OF_DAY + notBefore) % 1440;
  let dayStart = notBefore - minuteOfDay; // tick of 00:00 on that calendar day
  const offset = CLINIC_OPEN_MINUTE + (slotIndex % CLINIC_SLOTS) * 10;
  let t = dayStart + offset;
  if (t < notBefore) { dayStart += 1440; t = dayStart + offset; }
  if (shiftAt(t).dayOfWeek === 6) t += 1440; // clinics closed on Sunday
  return t;
}

/** Poli for a diagnosis (children see Poli Anak). */
export function poliForKontrol(icd: string, age: number): string {
  if (age < 18) return "POLI-AK";
  const c = icd.charAt(0);
  const byChapter: Record<string, string> = {
    I: "POLI-JANTUNG", J: "POLI-PARU", S: "POLI-BEDAH", T: "POLI-BEDAH", K: "POLI-BEDAH",
    O: "POLI-OG", P: "POLI-AK", G: "POLI-SYARAF",
  };
  if (/^I1[0-5]/.test(icd)) return "POLI-PD"; // hypertension is followed in internal medicine
  return byChapter[c] ?? "POLI-PD";
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
  let counter = apptState.counter;
  const currentTick = clock.tick;
  let encounters = state.encounters;
  let visits = state._outpatientVisits;

  // 1. Book a kontrol for each inpatient discharged alive since the last pass.
  const since = (currentTick - HANDLER_PERIOD) * 60_000;
  const discharged = Array.from(state.encounters.values())
    .filter(e => e.type === "inpatient" && e.status === "discharged" && e.endTime !== null && e.endTime > since && e.endTime <= clock.hospitalTimeMs)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const enc of discharged) {
    const patient = state.patients.get(enc.patientId);
    if (!patient || patient.morgueId !== null) continue;
    const icd = enc.primaryDiagnosis ?? "Z09";
    const id = `APT-${String(counter).padStart(4, "0")}`;
    const scheduledTick = clinicSlotTick(Math.floor(enc.endTime! / 60_000) + KONTROL_AFTER_TICKS, counter);
    counter++;
    newAppts.set(id, {
      id, patientId: enc.patientId, encounterId: enc.id, poli: poliForKontrol(icd, patient.age),
      scheduledTick, actualTick: null, status: "scheduled", doctorId: null, icdCode: icd,
      notes: "Kontrol pasca rawat inap",
    });
  }

  // 2. Due appointments: attend (check in as a waiting outpatient visit) or no-show.
  for (const [id, appt] of newAppts) {
    if (appt.status === "checked_in" && appt.visitEncounterId) {
      const v = visits.get(`VISIT-${appt.visitEncounterId}`);
      if (v?.status === "completed") newAppts.set(id, { ...appt, status: "completed", doctorId: v.doctorId });
      else if (v?.status === "in-consultation") newAppts.set(id, { ...appt, status: "in_consultation", doctorId: v.doctorId });
      continue;
    }
    if (appt.status === "in_consultation" && appt.visitEncounterId) {
      const v = visits.get(`VISIT-${appt.visitEncounterId}`);
      if (v?.status === "completed") newAppts.set(id, { ...appt, status: "completed" });
      continue;
    }
    if (appt.status !== "scheduled" || currentTick < appt.scheduledTick) continue;
    if (currentTick - appt.scheduledTick > NO_SHOW_THRESHOLD_TICKS) {
      newAppts.set(id, { ...appt, status: "no_show" });
      continue;
    }
    const attends = clock.rng() < KONTROL_ATTENDANCE;
    const patient = state.patients.get(appt.patientId);
    const admitted = Array.from(encounters.values()).some(e => e.patientId === appt.patientId && e.status === "active" && e.type === "inpatient");
    if (!attends || !patient || patient.morgueId !== null || admitted) {
      newAppts.set(id, { ...appt, status: "no_show" });
      continue;
    }
    const enc: Encounter = {
      id: `POLI-${currentTick}-${patient.id}`,
      patientId: patient.id,
      type: "outpatient",
      startTime: clock.hospitalTimeMs,
      endTime: null,
      status: "active",
      payer: assignPayer(patient, clock.rng),
      primaryDiagnosis: appt.icdCode ?? "Z09",
    };
    const visit: OutpatientVisit = {
      id: `VISIT-${enc.id}`, encounterId: enc.id, patientId: patient.id, referralId: null,
      poli: appt.poli, diagnosis: `Kontrol ${appt.icdCode ?? ""}`.trim(), icdCode: appt.icdCode ?? "Z09",
      doctorId: null, status: "waiting", arrivalTime: clock.hospitalTimeMs, completedAt: null, ordersGenerated: 0,
    };
    if (encounters === state.encounters) encounters = new Map(encounters);
    if (visits === state._outpatientVisits) visits = new Map(visits);
    encounters.set(enc.id, enc);
    visits.set(visit.id, visit);
    newAppts.set(id, { ...appt, status: "checked_in", actualTick: currentTick, visitEncounterId: enc.id });
  }

  // Bounded: evict the oldest finished appointments first.
  for (const [id, a] of newAppts) {
    if (newAppts.size <= MAX_APPOINTMENTS) break;
    if (a.status === "completed" || a.status === "no_show" || a.status === "cancelled") newAppts.delete(id);
  }

  return Object.assign({}, state, {
    encounters, _outpatientVisits: visits,
    _appointmentState: { appointments: newAppts, counter },
  }) as HospitalState;
}

/** Scheduled appointments due within the next `nextNTicks` (2026-10-27: was hard-coded to tick 0). */
export function getUpcomingAppointments(state: HospitalState, currentTick: number, nextNTicks: number = 1440): Appointment[] {
  const apptState = (state as unknown as { _appointmentState?: AppointmentState })._appointmentState;
  if (!apptState) return [];
  return Array.from(apptState.appointments.values())
    .filter(a => a.status === "scheduled" && a.scheduledTick >= currentTick && a.scheduledTick <= currentTick + nextNTicks)
    .sort((a, b) => a.scheduledTick - b.scheduledTick);
}
