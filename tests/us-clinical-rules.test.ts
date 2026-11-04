/**
 * Epic X M10.5b (closing slice): interaction and contraindication tables for
 * the US-only drugs, allergy-conditional alternatives in the US order sets,
 * and the US Monday-Friday clinic calendar. Severities are simulation values
 * modelled on standard drug references, not a pharmacist-reviewed table.
 */
import { describe, it, expect, afterEach } from "vitest";
import { US_DRUG_INTERACTIONS, US_DRUG_CONTRAINDICATIONS, US_EXTRA_DRUGS } from "../src/locale/us-drugs.js";
import { US_PROTOCOL_OVERRIDES } from "../src/locale/us-protocols.js";
import { useUSLocale, resetLocale } from "../src/locale/us-locale.js";
import { activeCatalog } from "../src/engine/drug-catalog.js";
import { checkDrugInteraction, checkDiagnosisContraindication } from "../src/engine/pharmacy-knowledge.js";
import { resolveActionMed, resolveOrderableMed } from "../src/engine/ai-doctor.js";
import { ICD_PROTOCOLS } from "../src/engine/clinical-knowledge.js";
import { clinicSlotTick } from "../src/engine/appointment-scheduling.js";
import { shiftAt, rosterStatus } from "../src/agent/roster.js";
import type { Medication } from "../src/patient/schema.js";

const H = 60, DAY = 1440;
const med = (code: string): Medication => ({ code, name: code, dose: "", route: "PO" }) as unknown as Medication;
afterEach(() => { resetLocale(); });

describe("US drug interactions and contraindications", () => {
  it("every code in the tables exists in the active US catalogue", () => {
    useUSLocale();
    const codes = new Set(activeCatalog().map(d => d.code));
    for (const [a, row] of Object.entries(US_DRUG_INTERACTIONS)) {
      expect(codes.has(a), a).toBe(true);
      for (const b of Object.keys(row)) expect(codes.has(b), `${a}->${b}`).toBe(true);
    }
    for (const c of US_DRUG_CONTRAINDICATIONS) expect(codes.has(c.drugCode), c.drugCode).toBe(true);
  });

  it("every interaction is listed in both directions with the same severity", () => {
    for (const [a, row] of Object.entries(US_DRUG_INTERACTIONS)) {
      for (const [b, v] of Object.entries(row)) {
        const back = US_DRUG_INTERACTIONS[b]?.[a];
        expect(back, `${b}->${a} missing`).toBeDefined();
        expect(back!.severity, `${a}<->${b}`).toBe(v.severity);
      }
    }
  });

  it("every extension drug is covered by at least one interaction or contraindication rule", () => {
    const covered = new Set([...Object.keys(US_DRUG_INTERACTIONS), ...US_DRUG_CONTRAINDICATIONS.map(c => c.drugCode)]);
    const silent = US_EXTRA_DRUGS.map(d => d.code).filter(c => !covered.has(c));
    // Reviewed as having no clinically significant rule in this simulator: substitutes and a vitamin.
    expect(silent.sort()).toEqual(["DIC", "FAM", "THI"].filter(c => silent.includes(c)).sort());
    expect(silent.every(c => ["DIC", "FAM", "THI"].includes(c))).toBe(true);
  });

  it("the checks fire under the US formulary only", () => {
    expect(checkDrugInteraction({ code: "HEP", name: "HEP" }, [med("APX")]).severity).toBe("none");
    useUSLocale();
    expect(checkDrugInteraction({ code: "APX", name: "APX" }, [med("WAF")]).severity).toBe("major");
    expect(checkDrugInteraction({ code: "HEP", name: "HEP" }, [med("APX")]).severity).toBe("major");   // base drug, extension drug on chart
    expect(checkDrugInteraction({ code: "NTX", name: "NTX" }, [med("BUP")]).severity).toBe("major");
    expect(checkDrugInteraction({ code: "EMP", name: "EMP" }, [med("MET")]).severity).toBe("none");
    expect(checkDiagnosisContraindication("APX", [{ code: "S06", name: "", active: true }]).contraindicated).toBe(true);
    expect(checkDiagnosisContraindication("EMP", [{ code: "N17", name: "", active: true }]).contraindicated).toBe(true);
    expect(checkDiagnosisContraindication("APX", [{ code: "I10", name: "", active: true }]).contraindicated).toBe(false);
    resetLocale();
    expect(checkDiagnosisContraindication("APX", [{ code: "S06", name: "", active: true }]).contraindicated).toBe(false);
  });
});

describe("allergy-conditional alternatives", () => {
  const withAlt = Object.entries(US_PROTOCOL_OVERRIDES).flatMap(([code, acts]) => acts.filter(a => a.ifAllergic).map(a => ({ code, a })));

  it("exist only in the US order sets, and each alternative is orderable as written", () => {
    expect(ICD_PROTOCOLS.flatMap(p => p.actions).filter(a => a.ifAllergic)).toEqual([]);
    expect(withAlt.length).toBeGreaterThanOrEqual(5);
    useUSLocale();
    for (const { code, a } of withAlt) {
      const r = resolveOrderableMed(a.ifAllergic!.label, a.ifAllergic!.detail);
      expect(r, `${code} ${a.label}`).toBeDefined();
    }
  });

  it("a penicillin-allergic sepsis patient gets a carbapenem, an aspirin-allergic ACS patient clopidogrel", () => {
    useUSLocale();
    const pip = US_PROTOCOL_OVERRIDES.A49!.find(a => a.label.startsWith("Piperacillin"))!;
    expect(resolveActionMed(pip, [])?.med.code).toBe("PIP");
    expect(resolveActionMed(pip, ["Seafood"])?.med.code).toBe("PIP");
    expect(resolveActionMed(pip, ["Penicillin"])?.med.code).toBe("MEM");
    const asp = US_PROTOCOL_OVERRIDES.I21!.find(a => a.label === "Aspirin 80mg")!;
    expect(resolveActionMed(asp, ["None"])?.med.code).toBe("ASP");
    expect(resolveActionMed(asp, ["NSAIDs"])?.med.code).toBe("CLO");
    expect(resolveActionMed(asp, ["Aspirin"])?.med.code).toBe("CLO");
  });

  it("actions without an alternative are unaffected by allergies", () => {
    useUSLocale();
    const vanc = US_PROTOCOL_OVERRIDES.A49!.find(a => a.label === "Vancomycin 500mg")!;
    expect(resolveActionMed(vanc, ["Penicillin", "Aspirin"])?.med.code).toBe("VAN");
  });
});

describe("US Monday-Friday clinic calendar", () => {
  const saturdayMorning = 13 * H + 4 * DAY;   // roster day 5 (Saturday) 07:00
  const office = { role: "dokter_spesialis", status: { rosterPattern: "day", rosterTeam: 0 } } as never;

  it("clinics: Indonesia closes Sunday only; the US also closes Saturday", () => {
    const dow = (t: number) => shiftAt(t).dayOfWeek;
    expect(dow(clinicSlotTick(saturdayMorning, 0))).toBe(5);          // Indonesia: Saturday open
    expect(dow(clinicSlotTick(saturdayMorning + DAY, 0))).toBe(0);    // Sunday -> Monday
    useUSLocale();
    expect(dow(clinicSlotTick(saturdayMorning, 0))).toBe(0);          // Saturday -> Monday
    expect(dow(clinicSlotTick(saturdayMorning + DAY, 0))).toBe(0);
    expect(dow(clinicSlotTick(13 * H, 0))).toBe(1);                   // Tuesday stays Tuesday
  });

  it("office roles: Indonesia works Saturday, the US does not", () => {
    expect(rosterStatus(office, saturdayMorning + 2 * H).onDuty).toBe(true);
    useUSLocale();
    expect(rosterStatus(office, saturdayMorning + 2 * H).onDuty).toBe(false);
    expect(rosterStatus(office, 13 * H + 2 * H).onDuty).toBe(true);   // Tuesday
  });
});
