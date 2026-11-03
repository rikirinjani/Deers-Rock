/**
 * One-call selection of the US adapter bundle (Epic X M10.4): payer assigner,
 * claim lifecycle, charge policy and price list move together, because charges
 * in USD only make sense with USD claims. Process-global, like the registries
 * it sets: call before createWorld and reset afterwards, never mid-run.
 */
import {
  usePayerAssigner, useClaimLifecycle, useChargePolicy, usePriceBook,
  resetPayerAssigner, resetClaimLifecycle, resetChargePolicy, resetPriceBook,
} from "./registry.js";
import { USPayerAssigner } from "./us-payer.js";
import { USClaimLifecycle } from "./us-claims.js";
import { USChargePolicy, USPriceBook } from "./us-prices.js";

export function useUSAdapter(): void {
  usePayerAssigner(new USPayerAssigner());
  useClaimLifecycle(new USClaimLifecycle());
  useChargePolicy(new USChargePolicy());
  usePriceBook(new USPriceBook());
}

export function resetBillingAdapter(): void {
  resetPayerAssigner();
  resetClaimLifecycle();
  resetChargePolicy();
  resetPriceBook();
}
