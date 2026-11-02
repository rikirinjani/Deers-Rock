/**
 * Active claim lifecycle for the billing handler (Epic X M10.2).
 * Defaults to Indonesia; US (or a test double) is selected via useClaimLifecycle.
 * Process-global like other engine registries: set it before createWorld and
 * reset it afterwards, never mid-run.
 */
import type { IClaimLifecycle } from "./contracts.js";
import { IndonesiaClaimLifecycle } from "./indonesia-claims.js";

const DEFAULT: IClaimLifecycle = new IndonesiaClaimLifecycle();
let active: IClaimLifecycle = DEFAULT;

export function getClaimLifecycle(): IClaimLifecycle { return active; }
export function useClaimLifecycle(l: IClaimLifecycle): void { active = l; }
export function resetClaimLifecycle(): void { active = DEFAULT; }
