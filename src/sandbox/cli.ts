/**
 * DR Sandbox CLI — starts the control surface and the data surface.
 *
 *   npx tsx src/sandbox/cli.ts [controlPort] [dataPort]
 *
 * Defaults: control 3100, data 3000 (overridable via SANDBOX_CONTROL_PORT /
 * SANDBOX_DATA_PORT).
 */
import { startSandbox } from "./index.js";

const controlPort = parseInt(process.env.SANDBOX_CONTROL_PORT ?? process.argv[2] ?? "3100", 10);
const dataPort = parseInt(process.env.SANDBOX_DATA_PORT ?? process.argv[3] ?? "3000", 10);

const handle = startSandbox({ controlPort, dataPort });

process.stdout.write(
  `\nDeers Rock sandbox running\n` +
  `  control:  http://127.0.0.1:${handle.controlPort}/sandbox/health\n` +
  `  data:     http://127.0.0.1:${handle.dataPort}/api/status\n\n` +
  `Create a session:\n` +
  `  curl -X POST http://127.0.0.1:${handle.controlPort}/sandbox/sessions \\\n` +
  `       -H 'Content-Type: application/json' -d '{"seed":42,"patients":50}'\n\n`,
);
