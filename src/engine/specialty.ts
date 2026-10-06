import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { Charge } from "../patient/schema.js";
import { appendCharge } from "./charge-generator.js";
import { specialtyConsultFee } from "./price-tables.js";

export interface SpecialtyOrder {
  id: string;
  encounterId: string;
  patientId: string;
  specialty: SpecialtyType;
  serviceName: string;
  status: "ordered" | "in-progress" | "completed";
  orderedAt: number;
  completedAt: number | null;
  findings: string | null;
  doctorId: string | null;
}

export type SpecialtyType =
  | "cardiology" | "neurology" | "ophthalmology" | "ent" | "dermatology"
  | "psychiatry" | "pediatrics" | "obgyn" | "pulmonology" | "rehab_medik"
  | "anesthesiology" | "dentistry" | "hemodialysis" | "endoscopy"
  | "pathology_anatomy" | "forensic" | "internal_medicine" | "surgery" | "emergency";

const SERVICE_MAP: Record<SpecialtyType, string[]> = {
  cardiology: ["Echocardiography", "ECG interpretation", "Cardiac stress test", "Holter monitoring"],
  neurology: ["EEG", "Nerve conduction study", "Stroke assessment", "Neurological examination"],
  ophthalmology: ["Funduscopy", "Visual acuity test", "Tonometry", "Slit lamp examination"],
  ent: ["Audiometry", "Tympanometry", "Nasoendoscopy", "Tonsillectomy assessment"],
  dermatology: ["Skin biopsy", "Patch test", "Dermoscopy", "Phototherapy assessment"],
  psychiatry: ["Mental status examination", "Psychiatric evaluation", "Suicide risk assessment", "Therapy session"],
  pediatrics: ["Growth assessment", "Developmental screening", "Vaccination", "Pediatric consultation"],
  obgyn: ["Antenatal care", "Fetal ultrasound", "Pap smear", "Contraception counseling"],
  pulmonology: ["Spirometry", "Bronchoscopy", "Pleural tap", "Sleep study assessment"],
  rehab_medik: ["Physical therapy assessment", "Occupational therapy", "Mobility evaluation", "Prosthetic assessment"],
  anesthesiology: ["Pre-operative assessment", "Pain management consult", "Sedation evaluation"],
  dentistry: ["Dental examination", "Oral surgery consult", "Periodontal assessment", "Dental radiography"],
  hemodialysis: ["Hemodialysis session", "AV fistula assessment", "Fluid management"],
  endoscopy: ["Upper GI endoscopy", "Colonoscopy", "Bronchoscopy", "ERCP"],
  pathology_anatomy: ["Histopathology", "Cytology", "Frozen section", "Immunohistochemistry"],
  forensic: ["Medicolegal examination", "Autopsy", "Forensic toxicology", "Sexual assault examination"],
  internal_medicine: ["Internal medicine consult", "Infectious disease management", "General medical assessment"],
  surgery: ["Surgical consult", "Wound debridement", "Pre-operative assessment", "Post-operative care"],
  emergency: ["Emergency assessment", "Resuscitation", "Trauma evaluation", "Acute care"],
};

export function specialtyHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  if (clock.tick % 6 !== 0) return state;

  const activeEncounters = Array.from(state.encounters.values()).filter(e => e.status === "active");
  if (activeEncounters.length === 0) return state;

  const allSpecialties = Object.keys(SERVICE_MAP) as SpecialtyType[];
  const specialty = allSpecialties[Math.floor(clock.rng() * allSpecialties.length)]!;
  const encounter = activeEncounters[Math.floor(clock.rng() * activeEncounters.length)]!;
  const services = SERVICE_MAP[specialty];
  const serviceName = services[Math.floor(clock.rng() * services.length)]!;

  const order: SpecialtyOrder = {
    id: `SPC-${clock.tick}-${encounter.patientId}-${specialty}`,
    encounterId: encounter.id,
    patientId: encounter.patientId,
    specialty,
    serviceName,
    status: "ordered",
    orderedAt: clock.hospitalTimeMs,
    completedAt: null,
    findings: null,
    doctorId: null,
  };

  const newOrders = new Map(state.specialtyOrders);
  newOrders.set(order.id, { ...order, status: "completed", completedAt: clock.hospitalTimeMs, findings: `${serviceName} completed. ${specialty === "cardiology" ? "Normal sinus rhythm" : specialty === "neurology" ? "No focal neurological deficit" : "Within normal limits"}.` });

  // ADR-015 D7: specialty consult fee on order completion. Charges map is
  // copied lazily on first append (one copy per pass at most). No rng.
  let chargesMut: Map<string, Charge> | null = null;
  const chargeCompletion = (spec: string, encId: string, patId: string) => {
    if (chargesMut === null) chargesMut = new Map(state.charges);
    const unitPrice = specialtyConsultFee(spec);
    appendCharge(chargesMut, clock, encId, patId, "consult",
      `Specialty consult (${spec})`, undefined, { code: spec, unitPrice, quantity: 1 });
  };
  chargeCompletion(specialty, order.encounterId, order.patientId);

  // Process backlog: complete up to 5 "ordered" or "in_progress" orders
  let backlogged = 0;
  for (const [id, o] of newOrders) {
    if (backlogged >= 5) break;
    if (o.status === "ordered" || o.status === "in-progress") {
      newOrders.set(id, { ...o, status: "completed", completedAt: clock.hospitalTimeMs, findings: o.findings ?? `${o.serviceName} completed.` });
      chargeCompletion(o.specialty, o.encounterId, o.patientId);
      backlogged++;
    }
  }

  return {
    ...state,
    specialtyOrders: newOrders,
    ...(chargesMut !== null ? { charges: chargesMut } : {}),
  };
}
