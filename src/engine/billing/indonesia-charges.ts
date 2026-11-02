/**
 * Indonesian charge policy (IDR). Epic X M10.2: the flat fallback rates, room
 * class multipliers and pharmacy markup that used to be module constants in
 * charge-generator.ts / price-tables.ts, behind IChargePolicy. Values unchanged.
 */
import type { ChargeCategory, RoomClass } from "../../patient/schema.js";
import type { IChargePolicy } from "./contracts.js";

export const CHARGE_RATES: Record<ChargeCategory, number> = {
  lab: 250000, radiology: 500000, pharmacy: 75000, surgery: 5000000,
  room: 350000, consult: 150000, emergency: 400000, respiratory: 200000, supply: 50000,
  administration: 150000,
  // ADR-015 D1/D7 fallbacks for the new priced categories (real prices live in
  // price-tables.ts; these fire only when a table lookup misses).
  dialysis: 900000, radiotherapy: 800000,
  // Epic IX M9.3: real amounts come from the dispatch (BLS/ALS base + per km).
  ambulance: 200000,
};

export const ROOM_CLASS_MULTIPLIER: Record<RoomClass, number> = {
  vvip: 4, vip: 3,
  "kelas-1": 2, "kelas-2": 1.5, "kelas-3": 1,
  icu: 3.5, hcu: 2, nicu: 3.5, picu: 3.5,
};

/** ADR-015 D1: billed drug price = acquisition cost x 1.25. */
export const PHARMACY_MARKUP = 1.25;

export class IndonesiaChargePolicy implements IChargePolicy {
  config = { countryCode: "ID", currency: "IDR", displayName: "Indonesia (BPJS/INA-CBG)", currencyMinorUnits: 0 };
  baseRate(category: string): number {
    return CHARGE_RATES[category as ChargeCategory];
  }
  roomClassMultiplier(roomClass: string): number {
    return ROOM_CLASS_MULTIPLIER[roomClass as RoomClass] ?? 1;
  }
  drugMarkup(): number {
    return PHARMACY_MARKUP;
  }
}
