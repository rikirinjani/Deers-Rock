/**
 * Dashboard lesson from Epic V (2026-10-26): the inline <script> in
 * public/index.html failed to parse for 19 days and nothing noticed. Parse
 * every inline script in public/*.html so a syntax error fails CI.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const PUBLIC = join(__dirname, "..", "public");
const pages = readdirSync(PUBLIC).filter(f => f.endsWith(".html")).sort();

function inlineScripts(html: string): { code: string; line: number }[] {
  const out: { code: string; line: number }[] = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  for (let m: RegExpExecArray | null; (m = re.exec(html)); ) {
    const attrs = m[1] ?? "";
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1]?.toLowerCase();
    // Classic scripts only: vm.Script cannot parse ES module syntax (none in public/ today).
    if (type && type !== "text/javascript" && type !== "application/javascript") continue;
    out.push({ code: m[2] ?? "", line: html.slice(0, m.index).split("\n").length });
  }
  return out;
}

describe("public/*.html inline scripts parse", () => {
  it("finds the dashboard pages", () => {
    expect(pages).toContain("index.html");
  });

  for (const page of pages) {
    it(`${page}: every inline <script> compiles`, () => {
      const html = readFileSync(join(PUBLIC, page), "utf8");
      const scripts = inlineScripts(html);
      expect(scripts.length).toBeGreaterThan(0);
      for (const s of scripts) {
        // Compile only (never run). Script-goal parse matches how browsers load a classic <script>.
        expect(() => new vm.Script(s.code, { filename: `${page}:${s.line}` }), `${page} <script> at line ${s.line}`).not.toThrow();
      }
    });
  }

  it("detects a broken script (self-check)", () => {
    const [s] = inlineScripts("<html><script>const a = ;</script></html>");
    expect(() => new vm.Script(s!.code)).toThrow(SyntaxError);
  });
});
