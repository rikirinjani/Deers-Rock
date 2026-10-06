/**
 * DR Sandbox — productization layer (Phase G).
 *
 * Additive and removable. Imports only the DR public API. It does not modify the
 * scientific core, the research journal, snapshots, or frozen evidence.
 *
 * Two listeners:
 *  - control surface (`/sandbox/*`, `/fhir/*`)  — this module
 *  - data surface (`/api/*`, static UI)          — the existing DR REST server
 *
 * Rationale for two ports: composing both onto one listener would require
 * exporting `apiRoutes` from `src/api/rest.ts` (a non-semantic integration seam).
 * To honour the zero-core-modification constraint, the sandbox leaves that file
 * untouched and runs the existing server as-is.
 */
import { createRestServer } from "../api/rest.js";
import { createSandboxControlServer } from "./server.js";
import { getActiveSession } from "./session.js";

export * from "./session.js";
export { createSandboxControlServer } from "./server.js";

export interface SandboxOptions {
  controlPort?: number;
  dataPort?: number;
}

export interface SandboxHandle {
  controlPort: number;
  dataPort: number;
  close: () => void;
}

export function startSandbox(opts: SandboxOptions = {}): SandboxHandle {
  const controlPort = opts.controlPort ?? 3100;
  const dataPort = opts.dataPort ?? 3000;

  const controlServer = createSandboxControlServer();
  controlServer.listen(controlPort);

  // Existing DR read surface, bound to the active sandbox session's world.
  const dataServer = createRestServer(() => {
    const s = getActiveSession();
    if (!s) throw new Error("no active sandbox session");
    return s.world;
  });
  dataServer.listen(dataPort);

  return {
    controlPort,
    dataPort,
    close: () => {
      controlServer.close();
      dataServer.close();
    },
  };
}
