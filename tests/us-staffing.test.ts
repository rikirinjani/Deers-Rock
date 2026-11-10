/** Epic X M10.5c: US clinical staffing per bed (BLS OEWS 2025 / AHA 2024); Indonesian roster unchanged. */
import { describe, it, expect, afterEach } from "vitest";
import { generateAgentPool, resetAgentCounter } from "../src/agent/generator.js";
import { useUSLocale, resetLocale } from "../src/locale/us-locale.js";
import { USStaffing, US_STAFF_PER_BED, US_STAFFED_BEDS_2024, US_HOSPITAL_EMPLOYMENT_2025 } from "../src/locale/us-staffing.js";
import { IndonesiaStaffing } from "../src/locale/indonesia.js";
import type { AgentRole } from "../src/agent/types.js";

const lcg = (seed: number) => { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
const count = (pool: ReturnType<typeof generateAgentPool>) => {
  const by: Record<string, number> = {};
  for (const a of pool.agents.values()) by[a.role] = (by[a.role] ?? 0) + 1;
  return by;
};
afterEach(() => { resetLocale(); });

describe("staffing seam", () => {
  it("default (Indonesian) headcounts for 131 beds are the legacy formulas", () => {
    resetAgentCounter();
    const by = count(generateAgentPool(131, lcg(1)));
    expect(by).toMatchObject({ dokter_spesialis: 9, dokter_umum: 5, perawat: 44, perawat_anestesi: 2, bidan: 4, apoteker: 3, asisten_apoteker: 4, radiografer: 3, analis_lab: 4, admin: 7 });
    expect(Object.values(by).reduce((a, b) => a + b, 0)).toBe(122);
  });

  it("US clinical roles follow BLS per-bed ratios, other roles keep the legacy count", () => {
    useUSLocale();
    resetAgentCounter();
    const by = count(generateAgentPool(131, lcg(1)));
    const E = US_HOSPITAL_EMPLOYMENT_2025;
    expect(by.perawat).toBe(Math.round(131 * (E.registeredNurses + E.licensedPracticalNurses) / US_STAFFED_BEDS_2024));
    expect(by.perawat).toBe(307);
    expect(by.apoteker).toBe(15);
    expect(by.radiografer).toBe(20);
    expect(by.dokter_spesialis! + by.dokter_umum!).toBe(31);
    expect(by.bidan).toBe(1);
    expect(by.admin).toBe(39);
    expect(by.analis_lab).toBe(22);
    expect(by.petugas_keamanan).toBe(8);
    expect(by.petugas_kebersihan).toBe(14);
    expect(by.fisioterapis).toBe(10);
    expect((by.rekam_medis ?? 0) + (by.koder ?? 0)).toBe(8);
  });

  it("scales with bed count, never below one, and is deterministic", () => {
    const us = new USStaffing();
    expect(us.headcount("perawat", 300)).toBeGreaterThan(us.headcount("perawat", 131));
    expect(us.headcount("apoteker", 1)).toBe(1);
    const roles = Object.keys(US_STAFF_PER_BED) as AgentRole[];
    for (const r of roles) expect(us.headcount(r, 131)).toBe(us.headcount(r, 131));
    expect(new IndonesiaStaffing().headcount("perawat", 131)).toBe(44);
  });
});
