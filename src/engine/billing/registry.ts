/**
 * Active claim lifecycle for the billing handler (Epic X M10.2).
 * Defaults to Indonesia; US (or a test double) is selected via useClaimLifecycle.
 * Process-global like other engine registries: set it before createWorld and
 * reset it afterwards, never mid-run.
 */
import type { IChargePolicy, IClaimLifecycle, IPayerAssigner } from "./contracts.js";
import { IndonesiaClaimLifecycle } from "./indonesia-claims.js";
import { IndonesiaChargePolicy } from "./indonesia-charges.js";
import { IndonesiaPayerAssigner } from "./indonesia-payer.js";

const DEFAULT: IClaimLifecycle = new IndonesiaClaimLifecycle();
let active: IClaimLifecycle = DEFAULT;

export function getClaimLifecycle(): IClaimLifecycle { return active; }
export function useClaimLifecycle(l: IClaimLifecycle): void { active = l; }
export function resetClaimLifecycle(): void { active = DEFAULT; }

const DEFAULT_CHARGES: IChargePolicy = new IndonesiaChargePolicy();
let charges: IChargePolicy = DEFAULT_CHARGES;
export function getChargePolicy(): IChargePolicy { return charges; }
export function useChargePolicy(c: IChargePolicy): void { charges = c; }
export function resetChargePolicy(): void { charges = DEFAULT_CHARGES; }

const DEFAULT_PAYER: IPayerAssigner = new IndonesiaPayerAssigner();
let payer: IPayerAssigner = DEFAULT_PAYER;
export function getPayerAssigner(): IPayerAssigner { return payer; }
export function usePayerAssigner(a: IPayerAssigner): void { payer = a; }
export function resetPayerAssigner(): void { payer = DEFAULT_PAYER; }
