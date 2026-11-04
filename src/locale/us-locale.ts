/**
 * One-call selection of the US locale (Epic X M10.5a/b): identity (MRN, US
 * names/addresses/age), the EMTALA-style transfer network, the US case mix, the US event calendar
 * and US staff names/licences. Pair with
 * useUSAdapter() (billing) for a full US world. Process-global; call before
 * createWorld, reset afterwards, never mid-run.
 */
import { useIdentityLocale, useReferralNetwork, useCaseMix, useCalendar, resetCalendar, resetIdentityLocale, resetReferralNetwork, resetCaseMix } from "./registry.js";
import { USIdentityLocale } from "./us-identity.js";
import { USReferralNetwork } from "./us-network.js";
import { USCaseMix } from "./us-casemix.js";
import { USCalendar } from "./us-calendar.js";

export function useUSLocale(): void {
  useIdentityLocale(new USIdentityLocale());
  useReferralNetwork(new USReferralNetwork());
  useCaseMix(new USCaseMix());
  useCalendar(new USCalendar());
}

export function resetLocale(): void {
  resetIdentityLocale();
  resetReferralNetwork();
  resetCaseMix();
  resetCalendar();
}
