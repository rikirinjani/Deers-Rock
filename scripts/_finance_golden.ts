// Epic X M10.2: byte-identity oracle for the billing refactor. Prints a sha256
// of claims+charges+payments for fixed seeds. Run before and after; must match.
import { createHash } from "node:crypto";
import { createWorld, runWorld } from "../src/engine/world.js";

const out: Record<string, string> = {};
for (const [seed, n, ticks] of [[42, 60, 900], [7, 40, 1500], [123, 50, 2000]] as const) {
  const w = runWorld(createWorld(n, undefined, seed), ticks);
  const s = w.state;
  const pick = (m: Map<string, unknown>) => JSON.stringify(Array.from(m.entries()).sort(([a], [b]) => (a < b ? -1 : 1)));
  const blob = pick(s.insuranceClaims as Map<string, unknown>) + pick(s.charges as Map<string, unknown>) + pick(s.payments as Map<string, unknown>);
  out[`${seed}/${n}/${ticks}`] = `${s.insuranceClaims.size} claims ${createHash("sha256").update(blob).digest("hex").slice(0, 16)}`;
}
console.log(JSON.stringify(out, null, 1));
