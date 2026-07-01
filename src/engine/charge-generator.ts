import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import type { Charge, ChargeCategory } from "../patient/schema.js";

let chargeCounter = 0;

const CHARGE_RATES: Record<ChargeCategory, number> = {
  lab: 250000, radiology: 500000, pharmacy: 75000, surgery: 5000000,
  room: 350000, consult: 150000, emergency: 400000, respiratory: 200000, supply: 50000,
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

export { CHARGE_RATES };
