import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import type { Charge, ChargeCategory, RoomClass } from "../patient/schema.js";

let chargeCounter = 0;
export function resetChargeCounter(): void { chargeCounter = 0; }

const CHARGE_RATES: Record<ChargeCategory, number> = {
  lab: 250000, radiology: 500000, pharmacy: 75000, surgery: 5000000,
  room: 350000, consult: 150000, emergency: 400000, respiratory: 200000, supply: 50000,
  administration: 150000,
};

/** Flat administration tariff charged once per encounter (inpatient or outpatient). */
const ADMIN_TARIFF = 150000;

const ROOM_CLASS_MULTIPLIER: Record<RoomClass, number> = {
  vvip: 4, vip: 3,
  "kelas-1": 2, "kelas-2": 1.5, "kelas-3": 1,
  icu: 3.5, hcu: 2, nicu: 3.5, picu: 3.5,
};

/** Generate a single charge and return updated charges map. Called by event handlers on action completion. */
export function generateCharge(
  charges: Map<string, Charge>, clock: Clock,
  encounterId: string, patientId: string,
  category: ChargeCategory, description: string, amount?: number
): Map<string, Charge> {
  chargeCounter++;
  const newCharges = new Map(charges);
  newCharges.set(`CHG-${chargeCounter}-${patientId}`, {
    id: `CHG-${chargeCounter}-${patientId}`,
    encounterId, patientId,
    category,
    description,
    amount: amount ?? CHARGE_RATES[category],
    billedAt: clock.hospitalTimeMs,
    paid: false,
  });
  return newCharges;
}

/**
 * Mutate-in-place variant of generateCharge for hot paths.
 * Appends a single charge to the GIVEN map and returns the same map — no copy
 * is made. The caller must already own a private copy of the charges map (one
 * copy per handler pass, never the previous state's map). Charge ID sequence
 * (chargeCounter), charge contents, and map insertion order are identical to
 * generateCharge.
 */
export function appendCharge(
  charges: Map<string, Charge>, clock: Clock,
  encounterId: string, patientId: string,
  category: ChargeCategory, description: string, amount?: number
): Map<string, Charge> {
  chargeCounter++;
  charges.set(`CHG-${chargeCounter}-${patientId}`, {
    id: `CHG-${chargeCounter}-${patientId}`,
    encounterId, patientId,
    category,
    description,
    amount: amount ?? CHARGE_RATES[category],
    billedAt: clock.hospitalTimeMs,
    paid: false,
  });
  return charges;
}

export { CHARGE_RATES, ROOM_CLASS_MULTIPLIER, ADMIN_TARIFF };
