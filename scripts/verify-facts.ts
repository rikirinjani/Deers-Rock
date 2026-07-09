import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { load } from "js-yaml";
import { resolve } from "node:path";

interface CheckDef {
  id: string;
  description: string;
  type: string;
  expected?: unknown;
  file?: string;
  path?: string;
  symbol?: string;
  regex?: string;
  pattern?: string;
}

interface Result {
  id: string;
  description: string;
  status: "PASS" | "FAIL" | "SKIP";
  detail: string;
}

const root = resolve(import.meta.dirname, "..");

function loadFacts(): CheckDef[] {
  const raw = readFileSync(resolve(root, "facts.yaml"), "utf-8");
  const doc = load(raw) as { checks: CheckDef[] };
  return doc.checks ?? [];
}

function checkTestCount(expected: number): Result {
  try {
    const out = execSync("npx vitest run --reporter=json", {
      cwd: root,
      timeout: 300_000,
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const json = JSON.parse(out);
    const actual = json.numTotalTests as number;
    const ok = actual === expected;
    return {
      id: "test-count",
      description: `Test count: expected ${expected}, got ${actual}`,
      status: ok ? "PASS" : "FAIL",
      detail: ok ? "Matches" : `Expected ${expected}, got ${actual}`,
    };
  } catch (err) {
    const stderr = (err as { stderr?: Buffer })?.stderr?.toString() ?? "";
    const stdout = (err as { stdout?: Buffer })?.stdout?.toString() ?? "";
    const combined = stdout || stderr;
    try {
      const json = JSON.parse(combined);
      const actual = json.numTotalTests as number;
      const ok = actual === expected;
      return {
        id: "test-count",
        description: `Test count: expected ${expected}, got ${actual}`,
        status: ok ? "PASS" : "FAIL",
        detail: ok ? "Matches (exit code ignored)" : `Expected ${expected}, got ${actual}`,
      };
    } catch {
      return {
        id: "test-count",
        description: "Test count check failed",
        status: "FAIL",
        detail: String(err),
      };
    }
  }
}

function checkCount(file: string, pattern: string, expected: number): Result {
  const fullPath = resolve(root, file);
  let count: number;
  if (!existsSync(fullPath)) {
    return { id: "count", description: `File not found: ${file}`, status: "FAIL", detail: "file not found" };
  }
  if (statSync(fullPath).isDirectory()) {
    const entries = readdirSync(fullPath);
    const re = new RegExp(pattern);
    count = entries.filter(e => re.test(e)).length;
  } else {
    const content = readFileSync(fullPath, "utf-8");
    const matches = content.match(new RegExp(pattern, "g"));
    count = matches?.length ?? 0;
  }
  const ok = count === expected;
  return {
    id: "count",
    description: `${file}: ${pattern} count = ${count}, expected ${expected}`,
    status: ok ? "PASS" : "FAIL",
    detail: ok ? `Found ${count}` : `Expected ${expected}, found ${count}`,
  };
}

function checkFileExists(path: string): Result {
  const full = resolve(root, path);
  const ok = existsSync(full);
  return {
    id: "file-exists",
    description: `File exists: ${path}`,
    status: ok ? "PASS" : "FAIL",
    detail: ok ? "Found" : "Not found",
  };
}

function checkExportExists(file: string, symbol: string): Result {
  const full = resolve(root, file);
  if (!existsSync(full)) {
    return { id: "export-exists", description: `File not found: ${file}`, status: "FAIL", detail: "file not found" };
  }
  const content = readFileSync(full, "utf-8");
  const re = new RegExp(`export\\s+(function|const|type|class|interface|default)\\s+${symbol}\\b`);
  const ok = re.test(content);
  return {
    id: "export-exists",
    description: `Symbol exported: ${symbol} from ${file}`,
    status: ok ? "PASS" : "FAIL",
    detail: ok ? "Exported" : `Symbol ${symbol} not found as export in ${file}`,
  };
}

function checkNoExportExists(file: string, symbol: string): Result {
  const full = resolve(root, file);
  if (!existsSync(full)) {
    return { id: "no-export-exists", description: `File not found: ${file}`, status: "FAIL", detail: "file not found" };
  }
  const content = readFileSync(full, "utf-8");
  const re = new RegExp(`\\b${symbol}\\b`);
  const ok = !re.test(content);
  return {
    id: "no-export-exists",
    description: `Symbol absent: ${symbol} from ${file}`,
    status: ok ? "PASS" : "FAIL",
    detail: ok ? "Not found (correct)" : `Symbol ${symbol} is still referenced in ${file} (should have been removed)`,
  };
}

function checkRegexMatch(file: string, regex: string): Result {
  const full = resolve(root, file);
  if (!existsSync(full)) {
    return { id: "regex-match", description: `File not found: ${file}`, status: "FAIL", detail: "file not found" };
  }
  const content = readFileSync(full, "utf-8");
  const ok = new RegExp(regex).test(content);
  return {
    id: "regex-match",
    description: `Regex match: /${regex}/ in ${file}`,
    status: ok ? "PASS" : "FAIL",
    detail: ok ? "Match found" : `No match for /${regex}/ in ${file}`,
  };
}

const runners: Record<string, (c: CheckDef) => Result> = {
  "test-count": (c) => checkTestCount(c.expected as number),
  "count": (c) => checkCount(c.file!, c.pattern!, c.expected as number),
  "file-exists": (c) => checkFileExists(c.path!),
  "export-exists": (c) => checkExportExists(c.file!, c.symbol!),
  "no-export-exists": (c) => checkNoExportExists(c.file!, c.symbol!),
  "regex-match": (c) => checkRegexMatch(c.file!, c.regex!),
};

function main(): void {
  const checks = loadFacts();
  const results: Result[] = [];

  for (const check of checks) {
    const runner = runners[check.type];
    if (!runner) {
      results.push({ id: check.id, description: check.description, status: "SKIP", detail: `Unknown check type: ${check.type}` });
      continue;
    }
    results.push(runner(check));
  }

  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  const skipped = results.filter(r => r.status === "SKIP").length;

  console.log(`\n verify:facts — ${results.length} checks: ${passed} passed, ${failed} failed, ${skipped} skipped\n`);

  for (const r of results) {
    const icon = r.status === "PASS" ? "✓" : r.status === "FAIL" ? "✗" : "–";
    console.log(`  ${icon} ${r.id} — ${r.status}${r.status !== "PASS" ? ` (${r.detail})` : ""}`);
  }

  if (failed > 0) {
    console.log(`\n ❌ ${failed} fact(s) failed verification\n`);
    for (const r of results) {
      if (r.status === "FAIL") {
        console.log(`  FAIL: ${r.id} — ${r.detail}`);
      }
    }
    process.exit(1);
  }
  console.log();
}

main();
