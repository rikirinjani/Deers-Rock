/**
 * ADR-027 Amendment 1 (Epic X M10.1): procedure-code provider resolution.
 * CPT is an optional plug-in; absence or disablement must fall back cleanly.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { AdapterRegistry } from "../packages/core/src/index.js";
import type { IProcedureCodeProvider } from "../packages/core/src/index.js";

const fake = (id: string, system: string): IProcedureCodeProvider => ({
  id,
  systems: [system],
  mapProcedure: (p) => [{ system, code: `${id}:${p}` }],
  describe: () => null,
  licenseNotice: () => null,
});

describe("AdapterRegistry.procedureCodes", () => {
  beforeEach(() => {
    // registry is static; overwrite with null-ish state via fresh keys
    AdapterRegistry.register(AdapterRegistry.PROCEDURE_CODES_DEFAULT, fake("public-default", "HCPCS-II"));
  });

  it("returns the public default when CPT is not enabled", () => {
    AdapterRegistry.register(AdapterRegistry.PROCEDURE_CODES_CPT, fake("cpt", "CPT"));
    expect(AdapterRegistry.procedureCodes().id).toBe("public-default");
    expect(AdapterRegistry.procedureCodes({ cptEnabled: false }).id).toBe("public-default");
  });

  it("returns CPT only when enabled and registered", () => {
    AdapterRegistry.register(AdapterRegistry.PROCEDURE_CODES_CPT, fake("cpt", "CPT"));
    expect(AdapterRegistry.procedureCodes({ cptEnabled: true }).id).toBe("cpt");
  });

  it("falls back to the default when CPT is enabled but the package is absent", () => {
    // simulate uninstalled CPT package: replace with a registry entry that yields null
    (AdapterRegistry as unknown as { instances: Map<string, unknown> }).instances.delete(
      AdapterRegistry.PROCEDURE_CODES_CPT,
    );
    expect(AdapterRegistry.procedureCodes({ cptEnabled: true }).id).toBe("public-default");
  });

  it("never throws: maps nothing when no provider is registered", () => {
    const inst = (AdapterRegistry as unknown as { instances: Map<string, unknown> }).instances;
    inst.delete(AdapterRegistry.PROCEDURE_CODES_DEFAULT);
    inst.delete(AdapterRegistry.PROCEDURE_CODES_CPT);
    const p = AdapterRegistry.procedureCodes({ cptEnabled: true });
    expect(p.id).toBe("none");
    expect(p.mapProcedure("any")).toEqual([]);
  });
});
