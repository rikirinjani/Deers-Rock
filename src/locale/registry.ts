/**
 * Active locale for identity generation and the referral network (Epic X
 * M10.5a). Defaults to Indonesia; the US pack is selected via useUSLocale().
 * Process-global like the billing registries: set before createWorld and
 * reset afterwards, never mid-run.
 */
import type { IIdentityLocale, IReferralNetwork, ICaseMix, ICalendar, IFormulary } from "./contracts.js";
import { IndonesiaIdentityLocale, IndonesiaReferralNetwork, IndonesiaCaseMix, IndonesiaCalendar, IndonesiaFormulary } from "./indonesia.js";

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

const DEFAULT_CASE_MIX: ICaseMix = new IndonesiaCaseMix();
let caseMix: ICaseMix = DEFAULT_CASE_MIX;
export function getCaseMix(): ICaseMix { return caseMix; }
export function useCaseMix(m: ICaseMix): void { caseMix = m; }
export function resetCaseMix(): void { caseMix = DEFAULT_CASE_MIX; }

const DEFAULT_CALENDAR: ICalendar = new IndonesiaCalendar();
let calendar: ICalendar = DEFAULT_CALENDAR;
export function getCalendar(): ICalendar { return calendar; }
export function useCalendar(c: ICalendar): void { calendar = c; }
export function resetCalendar(): void { calendar = DEFAULT_CALENDAR; }

const DEFAULT_FORMULARY: IFormulary = new IndonesiaFormulary();
let formulary: IFormulary = DEFAULT_FORMULARY;
export function getFormulary(): IFormulary { return formulary; }
export function useFormulary(f: IFormulary): void { formulary = f; }
export function resetFormulary(): void { formulary = DEFAULT_FORMULARY; }
