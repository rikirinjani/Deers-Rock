/**
 * Epic X M10.2: the engine-side contract mirror must stay byte-identical to
 * the core package's (src/ cannot import packages/ under rootDir=src).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const MARK = "// ---- contract body";
const body = (p: string) => {
  const s = readFileSync(p, "utf8").replace(/\r\n/g, "\n");
  return s.slice(s.indexOf(MARK));
};

describe("billing contract mirror", () => {
  it("src/engine/billing/contracts.ts matches packages/core billing.ts", () => {
    const core = body("packages/core/src/adapters/billing.ts");
    expect(core.length).toBeGreaterThan(500);
    expect(body("src/engine/billing/contracts.ts")).toBe(core);
  });
});
