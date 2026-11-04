/**
 * One-call selection of the US locale (Epic X M10.5a/b): identity (MRN, US
 * names/addresses/age), the EMTALA-style transfer network and the US case mix. Pair with
 * useUSAdapter() (billing) for a full US world. Process-global; call before
 * createWorld, reset afterwards, never mid-run.
 */
import { useIdentityLocale, useReferralNetwork, useCaseMix, resetIdentityLocale, resetReferralNetwork, resetCaseMix } from "./registry.js";
import { USIdentityLocale } from "./us-identity.js";
import { USReferralNetwork } from "./us-network.js";
import { USCaseMix } from "./us-casemix.js";

export function useUSLocale(): void {
  useIdentityLocale(new USIdentityLocale());
  useReferralNetwork(new USReferralNetwork());
  useCaseMix(new USCaseMix());
}

export function resetLocale(): void {
  resetIdentityLocale();
  resetReferralNetwork();
  resetCaseMix();
}
