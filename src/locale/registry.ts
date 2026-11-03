/**
 * Active locale for identity generation and the referral network (Epic X
 * M10.5a). Defaults to Indonesia; the US pack is selected via useUSLocale().
 * Process-global like the billing registries: set before createWorld and
 * reset afterwards, never mid-run.
 */
import type { IIdentityLocale, IReferralNetwork } from "./contracts.js";
import { IndonesiaIdentityLocale, IndonesiaReferralNetwork } from "./indonesia.js";

const DEFAULT_IDENTITY: IIdentityLocale = new IndonesiaIdentityLocale();
let identityLocale: IIdentityLocale = DEFAULT_IDENTITY;
export function getIdentityLocale(): IIdentityLocale { return identityLocale; }
export function useIdentityLocale(l: IIdentityLocale): void { identityLocale = l; }
export function resetIdentityLocale(): void { identityLocale = DEFAULT_IDENTITY; }

const DEFAULT_NETWORK: IReferralNetwork = new IndonesiaReferralNetwork();
let network: IReferralNetwork = DEFAULT_NETWORK;
export function getReferralNetwork(): IReferralNetwork { return network; }
export function useReferralNetwork(n: IReferralNetwork): void { network = n; }
export function resetReferralNetwork(): void { network = DEFAULT_NETWORK; }
