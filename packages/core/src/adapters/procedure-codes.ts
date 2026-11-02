/**
 * ADR-027 Amendment 1: pluggable procedure-code layer.
 *
 * Tariff/claim logic asks an `IProcedureCodeProvider` for codes and never
 * references a code set directly. A public default (ICD-10-PCS + HCPCS Level II)
 * is always available. CPT (AMA-licensed) is an optional provider shipped as a
 * separate private package (`@deers-rock/codes-cpt`) and enabled only on client
 * demand; the repo contains no CPT codes or descriptors.
 *
 * Providers are pure lookups: no RNG, no clock, no I/O after construction.
 */
export type ProcedureCodeSystem = "ICD-10-PCS" | "HCPCS-II" | "CPT" | (string & {});

export interface ProcedureCode {
  system: ProcedureCodeSystem;
  code: string;
}

export interface IProcedureCodeProvider {
  /** Stable id, e.g. "public-default" or "cpt". */
  readonly id: string;
  readonly systems: ProcedureCodeSystem[];

  /** Map an engine-internal procedure id to codes (empty = unmapped). */
  mapProcedure(internalProcedureId: string): ProcedureCode[];

  /** Human description of a code, or null if unknown. */
  describe(code: ProcedureCode): string | null;

  /** Copyright / licence notice that must accompany output using this provider. */
  licenseNotice(): string | null;
}

/** Fallback used when no provider is registered: maps nothing. */
export class NullProcedureCodeProvider implements IProcedureCodeProvider {
  readonly id = "none";
  readonly systems: ProcedureCodeSystem[] = [];
  mapProcedure(_internalProcedureId: string): ProcedureCode[] { return []; }
  describe(_code: ProcedureCode): string | null { return null; }
  licenseNotice(): string | null { return null; }
}
