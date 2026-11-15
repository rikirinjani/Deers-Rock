/**
 * Active locale for identity generation and the referral network (Epic X
 * M10.5a). Defaults to Indonesia; the US pack is selected via useUSLocale().
 * Process-global like the billing registries: set before createWorld and
 * reset afterwards, never mid-run.
 */
import type { IIdentityLocale, IReferralNetwork, ICaseMix, ICalendar, IFormulary, IProtocolSet, IShiftSchedule, IStaffing, IEdDemand, IStayOutcomes } from "./contracts.js";
import { IndonesiaIdentityLocale, IndonesiaReferralNetwork, IndonesiaCaseMix, IndonesiaCalendar, IndonesiaFormulary, IndonesiaProtocolSet, IndonesiaShiftSchedule, IndonesiaStaffing, IndonesiaEdDemand, IndonesiaStayOutcomes } from "./indonesia.js";

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

const DEFAULT_PROTOCOLS: IProtocolSet = new IndonesiaProtocolSet();
let protocolSet: IProtocolSet = DEFAULT_PROTOCOLS;
export function getProtocolSet(): IProtocolSet { return protocolSet; }
export function useProtocolSet(p: IProtocolSet): void { protocolSet = p; }
export function resetProtocolSet(): void { protocolSet = DEFAULT_PROTOCOLS; }

const DEFAULT_SHIFTS: IShiftSchedule = new IndonesiaShiftSchedule();
let shiftSchedule: IShiftSchedule = DEFAULT_SHIFTS;
export function getShiftSchedule(): IShiftSchedule { return shiftSchedule; }
export function useShiftSchedule(s: IShiftSchedule): void { shiftSchedule = s; }
export function resetShiftSchedule(): void { shiftSchedule = DEFAULT_SHIFTS; }

const DEFAULT_STAFFING: IStaffing = new IndonesiaStaffing();
let staffing: IStaffing = DEFAULT_STAFFING;
export function getStaffing(): IStaffing { return staffing; }
export function useStaffing(s: IStaffing): void { staffing = s; }
export function resetStaffing(): void { staffing = DEFAULT_STAFFING; }

const DEFAULT_ED_DEMAND: IEdDemand = new IndonesiaEdDemand();
let edDemand: IEdDemand = DEFAULT_ED_DEMAND;
export function getEdDemand(): IEdDemand { return edDemand; }
export function useEdDemand(d: IEdDemand): void { edDemand = d; }
export function resetEdDemand(): void { edDemand = DEFAULT_ED_DEMAND; }

const DEFAULT_STAY_OUTCOMES: IStayOutcomes = new IndonesiaStayOutcomes();
let stayOutcomes: IStayOutcomes = DEFAULT_STAY_OUTCOMES;
export function getStayOutcomes(): IStayOutcomes { return stayOutcomes; }
export function useStayOutcomes(s: IStayOutcomes): void { stayOutcomes = s; }
export function resetStayOutcomes(): void { stayOutcomes = DEFAULT_STAY_OUTCOMES; }
