/**
 * One-call selection of the US locale (Epic X M10.5a/b): identity (MRN, US
 * names/addresses/age), the EMTALA-style transfer network, the US case mix, the US event calendar,
 * US staff names/licences, the US formulary (FDA availability, USAN names)
 * US protocol overrides and 12-hour shifts. Pair with
 * useUSAdapter() (billing) for a full US world. Process-global; call before
 * createWorld, reset afterwards, never mid-run.
 */
import { useIdentityLocale, useReferralNetwork, useCaseMix, useCalendar, resetCalendar, useFormulary, resetFormulary, useProtocolSet, resetProtocolSet, useShiftSchedule, resetShiftSchedule, resetIdentityLocale, resetReferralNetwork, resetCaseMix } from "./registry.js";
import { USIdentityLocale } from "./us-identity.js";
import { USReferralNetwork } from "./us-network.js";
import { USCaseMix } from "./us-casemix.js";
import { USCalendar } from "./us-calendar.js";
import { USFormulary } from "./us-formulary.js";
import { USProtocolSet } from "./us-protocols.js";
import { USShiftSchedule } from "./us-shifts.js";

export function useUSLocale(): void {
  useIdentityLocale(new USIdentityLocale());
  useReferralNetwork(new USReferralNetwork());
  useCaseMix(new USCaseMix());
  useCalendar(new USCalendar());
  useFormulary(new USFormulary());
  useProtocolSet(new USProtocolSet());
  useShiftSchedule(new USShiftSchedule());
}

export function resetLocale(): void {
  resetIdentityLocale();
  resetReferralNetwork();
  resetCaseMix();
  resetCalendar();
  resetFormulary();
  resetProtocolSet();
  resetShiftSchedule();
}
