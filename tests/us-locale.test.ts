/**
 * Epic X M10.5a: US locale (MRN identity, geography, EMTALA-style transfers).
 * Demographic mixes and facility lists are placeholders pending M10.5c; these
 * tests pin structure and determinism, not epidemiological validity.
 */
import { describe, it, expect, afterEach } from "vitest";
import { USIdentityLocale, IDENTITY_DRAWS, US_REFERENCE_YEAR, resetMrnCounter } from "../src/locale/us-identity.js";
import { US_STATES, US_TOTAL_POP, pickState } from "../src/locale/us-geography.js";
import { USReferralNetwork, US_FACILITIES } from "../src/locale/us-network.js";
import { IndonesiaReferralNetwork } from "../src/locale/indonesia.js";
import { useUSLocale, resetLocale } from "../src/locale/us-locale.js";
import { getIdentityLocale, getReferralNetwork } from "../src/locale/registry.js";
import { useUSAdapter, resetBillingAdapter } from "../src/engine/billing/us-adapter.js";
import { generatePatient } from "../src/patient/generator.js";
import { reachableByRoad } from "../src/referral/ambulance.js";
import { createWorld, runWorld } from "../src/engine/world.js";

const lcg = (seed: number) => { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
const counting = (rng: () => number) => { let n = 0; return { rng: () => { n++; return rng(); }, count: () => n }; };

afterEach(() => { resetLocale(); resetBillingAdapter(); resetMrnCounter(); });

describe("US geography", () => {
  it("50 states + DC with unique FIPS and abbreviations", () => {
    expect(US_STATES).toHaveLength(51);
    expect(new Set(US_STATES.map(s => s.fips)).size).toBe(51);
    expect(new Set(US_STATES.map(s => s.abbr)).size).toBe(51);
    for (const s of US_STATES) expect(s.zip3[0]).toBeLessThanOrEqual(s.zip3[1]);
  });

  it("population-weighted pick reproduces state shares", () => {
    const r = lcg(3), counts = new Map<string, number>();
    const N = 60_000;
    for (let i = 0; i < N; i++) { const st = pickState(r()); counts.set(st.abbr, (counts.get(st.abbr) ?? 0) + 1); }
    const share = (abbr: string) => (counts.get(abbr) ?? 0) / N;
    const ca = US_STATES.find(s => s.abbr === "CA")!;
    expect(share("CA")).toBeCloseTo(ca.popMillions / US_TOTAL_POP, 1);
    expect(share("CA")).toBeGreaterThan(share("TX"));
    expect(share("TX")).toBeGreaterThan(share("WY"));
  });
});

describe("USIdentityLocale", () => {
  const L = new USIdentityLocale();

  it("consumes exactly IDENTITY_DRAWS draws and is deterministic", () => {
    const c = counting(lcg(7));
    const a = L.identity("female", c.rng);
    expect(c.count()).toBe(IDENTITY_DRAWS);
    resetMrnCounter();
    expect(L.identity("female", lcg(7))).toEqual(a);
  });

  it("MRN is 8 digits, increments, mirrors nik.value, and resets", () => {
    const r = lcg(1);
    const a = L.identity("male", r), b = L.identity("male", r);
    expect(a.mrn).toMatch(/^\d{8}$/);
    expect(Number(b.mrn)).toBe(Number(a.mrn) + 1);
    expect(a.nik.value).toBe(a.mrn);
    L.resetCounters();
    expect(L.identity("male", r).mrn).toBe(a.mrn);
  });

  it("birth date, age and address are consistent and use no wall clock", () => {
    const r = lcg(11);
    for (let i = 0; i < 200; i++) {
      const id = L.identity(i % 2 ? "male" : "female", r);
      expect(id.birthDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const age = L.ageOf(id);
      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThanOrEqual(95);
      expect(Number(id.birthDate.slice(0, 4))).toBe(US_REFERENCE_YEAR - age);
      const st = US_STATES.find(s => s.fips === id.addressKtp.provinceCode)!;
      const zip3 = Number(id.addressKtp.postalCode.slice(0, 3));
      expect(id.addressKtp.postalCode).toMatch(/^\d{5}$/);
      expect(zip3).toBeGreaterThanOrEqual(st.zip3[0]);
      expect(zip3).toBeLessThanOrEqual(st.zip3[1]);
      expect(id.addressKtp.provinsi).toBe(st.name);
      expect(id.locale).toBe("US");
    }
  });

  it("age mix follows the population bands (about 17% are 65+)", () => {
    const r = lcg(5);
    let old = 0, kids = 0;
    const N = 8000;
    for (let i = 0; i < N; i++) { const a = L.ageOf(L.identity("male", r)); if (a >= 65) old++; if (a < 18) kids++; }
    expect(old / N).toBeCloseTo(0.17, 1);
    expect(kids / N).toBeCloseTo(0.22, 1);
  });

  it("phone numbers are in the reserved fictional range; names are well formed", () => {
    const r = lcg(2);
    for (let i = 0; i < 100; i++) {
      expect(L.phone(r)).toMatch(/^\d{3}-555-01\d\d$/);
      expect(L.patientName("female", r).split(" ")).toHaveLength(2);
    }
  });
});

describe("US referral / transfer network", () => {
  const N = new USReferralNetwork();

  it("every facility has a known tier and the eligible-sender states are road reachable", () => {
    for (const f of US_FACILITIES) {
      expect(N.tier(f.type)).toBeGreaterThan(0);
      expect(N.isEligibleSender(f.provinceCode)).toBe(true);
      expect(N.reachableByRoad(f.provinceCode)).toBe(true);
    }
    expect(N.tier("RS Tipe C")).toBe(0);
  });

  it("every sender tier has a higher-tier target, and the fallback exists", () => {
    const tiers = new Set(US_FACILITIES.map(f => N.tier(f.type)));
    for (const t of [1, 2]) expect(tiers.has(t + 1)).toBe(true);
    expect(US_FACILITIES.some(f => f.id === N.fallbackTarget)).toBe(true);
  });

  it("Indonesian network is unchanged by the seam", () => {
    const id = new IndonesiaReferralNetwork();
    expect(id.reasons).toHaveLength(8);
    expect(id.diagnoses).toHaveLength(10);
    expect(id.homeRegionCode).toBe(73);
    expect(id.reachableByRoad("73")).toBe(true);
    expect(id.reachableByRoad("91")).toBe(false);
    expect(id.tier("RS Tipe C")).toBe(3);
    expect(reachableByRoad("72")).toBe(true);
    expect(reachableByRoad("53")).toBe(false);
  });
});

describe("locale selection", () => {
  it("defaults to Indonesian generation; the US pack swaps and resets cleanly", () => {
    expect(getIdentityLocale().config.countryCode).toBe("ID");
    const idPatient = generatePatient(lcg(9));
    expect(idPatient.phone).toMatch(/^08\d{10}$/);
    useUSLocale();
    expect(getIdentityLocale().config.countryCode).toBe("US");
    expect(getReferralNetwork().config.countryCode).toBe("US");
    const usPatient = generatePatient(lcg(9));
    expect(usPatient.phone).toMatch(/-555-01\d\d$/);
    expect(usPatient.identity.locale).toBe("US");
    resetLocale();
    expect(generatePatient(lcg(9)).phone).toMatch(/^08\d{10}$/);
  });
});

describe("US world (locale + billing)", () => {
  it("runs with US identities, real ages (Medicare appears) and English transfer letters", () => {
    useUSLocale();
    useUSAdapter();
    const w = runWorld(createWorld(40, undefined, 11), 1800);
    const patients = Array.from(w.state.patients.values());
    expect(patients.every(p => p.identity.locale === "US" && /^\d{8}$/.test(p.identity.mrn!))).toBe(true);
    expect(Math.max(...patients.map(p => p.age))).toBeGreaterThanOrEqual(65);
    const claims = Array.from(w.state.insuranceClaims.values());
    expect(claims.some(c => c.payer === "Medicare")).toBe(true);
    const ref = (w.state as unknown as { _referralState?: { letters: Map<string, { notes: string; fromFacility: string }> } })._referralState;
    const letters = Array.from(ref?.letters.values() ?? []);
    expect(letters.length).toBeGreaterThan(0);
    for (const l of letters) {
      expect(l.notes.startsWith("Transferred from")).toBe(true);
      expect(US_FACILITIES.some(f => f.id === l.fromFacility)).toBe(true);
    }
  });
});

describe("age derivation (clinical-v2 fix)", () => {
  it("Indonesian patients get their real age from the birth year, not a constant", async () => {
    const { ageFromBirthDate, SIM_REFERENCE_YEAR } = await import("../src/identity/reference-year.js");
    expect(ageFromBirthDate("12/01/1959")).toBe(SIM_REFERENCE_YEAR - 1959);
    expect(ageFromBirthDate("1959-01-12")).toBe(SIM_REFERENCE_YEAR - 1959);
    const r = lcg(4);
    const ages = Array.from({ length: 300 }, () => generatePatient(r).age);
    expect(new Set(ages).size).toBeGreaterThan(20);
    expect(Math.min(...ages)).toBeLessThan(18);
    expect(Math.max(...ages)).toBeGreaterThan(60);
  });
});
