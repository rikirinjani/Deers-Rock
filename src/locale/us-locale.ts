/**
 * One-call selection of the US locale (Epic X M10.5a): identity (MRN, US
 * names/addresses/age) and the EMTALA-style transfer network. Pair with
 * useUSAdapter() (billing) for a full US world. Process-global; call before
 * createWorld, reset afterwards, never mid-run.
 */
import { useIdentityLocale, useReferralNetwork, resetIdentityLocale, resetReferralNetwork } from "./registry.js";
import { USIdentityLocale } from "./us-identity.js";
import { USReferralNetwork } from "./us-network.js";

export function useUSLocale(): void {
  useIdentityLocale(new USIdentityLocale());
  useReferralNetwork(new USReferralNetwork());
}

export function resetLocale(): void {
  resetIdentityLocale();
  resetReferralNetwork();
}
