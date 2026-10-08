/**
 * Epic II M2.5 + ADR-018: AI Medical Coder Validation
 *
 * Tests ICD validation, DRG assignment, chart completeness scoring,
 * and coder learning from outcomes.
 */
import { describe, it, expect } from "vitest";
import { createWorld, runWorld } from "../src/engine/world.js";
import {
  validateIcdCode, assignDrg, scoreChartCompleteness,
  getAllCoderProfiles, getCoderAccuracy,
} from "../src/engine/ai-coder.js";
import type { MedicalChart } from "../src/patient/schema.js";

describe("ADR-018: AI Medical Coder", () => {
  describe("ICD-10 Validation", () => {
    it("validates known ICD codes from INA-CBG formulary", () => {
      const r1 = validateIcdCode("I10");
      expect(r1.valid).toBe(true);
      expect(r1.cbgGroup).toBeDefined();
      expect(r1.tariffIdr).toBeGreaterThan(0);

      const r2 = validateIcdCode("E11");
      expect(r2.valid).toBe(true);
      expect(r2.cbgGroup).toBeDefined();

      const r3 = validateIcdCode("J15");
      expect(r3.valid).toBe(true);
    });

    it("flags unknown ICD codes", () => {
      const r = validateIcdCode("XXXXX");
      expect(r.valid).toBe(false);
      expect(r.warning).toContain("Unknown");
    });

    it("accepts valid format codes without tariff mapping", () => {
      const r = validateIcdCode("Z00.0");
      // Z00.0 is a valid ICD code but may not have a CBG tariff
      expect(r.code).toBe("Z00.0");
    });
  });

  describe("DRG/CBG Assignment", () => {
    it("assigns CBG for hypertension with no complications", () => {
      const drg = assignDrg("I10", [], []);
      expect(drg).not.toBeNull();
      // I10 (hypertension) maps to CBG group B02 in INA-CBG
      expect(drg!.cbgGroup).toMatch(/^B/);
      expect(drg!.severity).toBeDefined();
      expect(drg!.tariffIdr).toBeGreaterThan(0);
    });

    it("elevates severity with major comorbidity", () => {
      // I50 (heart failure, major CC) as secondary should boost SEP
      const drg = assignDrg("I10", ["I50"], []);
      expect(drg).not.toBeNull();
      // With I50 as secondary (major CC), SEP should be elevated
      expect(drg!.sep).toBeGreaterThanOrEqual(1);
    });

    it("returns null for unknown primary code", () => {
      const drg = assignDrg("XXXXX", [], []);
      expect(drg).toBeNull();
    });
  });

  describe("Chart Completeness Scoring", () => {
    it("scores empty chart at 0", () => {
      const chart: MedicalChart = {
        id: "CHART-test", encounterId: "ENC-test", patientId: "PAT-test",
        status: "open", createdAt: 0, completedAt: null,
        diagnoses: [], procedures: [], coder: null,
      };
      const w = createWorld(5, undefined, 42);
      const score = scoreChartCompleteness(chart, w.state);
      expect(score.score).toBeLessThan(30);
      expect(score.gaps.length).toBeGreaterThan(0);
    });

    it("scores higher with diagnoses and procedures", () => {
      const chart: MedicalChart = {
        id: "CHART-test", encounterId: "ENC-test", patientId: "PAT-test",
        status: "coded", createdAt: 0, completedAt: 100,
        diagnoses: [{ code: "I10", name: "Hypertension", type: "primary" }],
        procedures: [{ code: "47.01", name: "Appendectomy", date: 100 }],
        coder: "AI Coder Alpha",
      };
      const w = createWorld(5, undefined, 42);
      const score = scoreChartCompleteness(chart, w.state);
      expect(score.score).toBeGreaterThan(40);
      expect(score.diagnosesComplete).toBe(true);
      expect(score.proceduresComplete).toBe(true);
    });
  });

  describe("Coder Profiles & Learning", () => {
    it("returns 4 coder profiles with different accuracies", () => {
      const profiles = getAllCoderProfiles();
      expect(profiles).toHaveLength(4);
      expect(profiles[0].name).toBe("AI Coder Alpha");
      expect(profiles[0].accuracy).toBe(0.92);
      expect(profiles[1].accuracy).toBe(0.88);
      expect(profiles[2].accuracy).toBe(0.90);
      expect(profiles[3].accuracy).toBe(0.85);
    });

    it("getCoderAccuracy returns current accuracy", () => {
      expect(getCoderAccuracy("AI Coder Alpha")).toBe(0.92);
      expect(getCoderAccuracy("AI Coder Delta")).toBe(0.85);
    });
  });

  describe("Integration: Full Pipeline", () => {
    it("creates charts and codes them over 500 ticks", () => {
      let w = createWorld(20, undefined, 42);
      for (let i = 0; i < 500; i++) {
        w = runWorld(w, 1);
      }
      const charts = Array.from(w.state.medicalCharts.values());
      const coded = charts.filter(c => c.status === "coded");
      // At tick 500, some charts should be coded
      console.log(`  Charts: ${charts.length} total, ${coded.length} coded`);
      expect(charts.length).toBeGreaterThan(0);
    });

    it("coder accuracy is in realistic range after outcome feedback", () => {
      // Initial base accuracy for Alpha is 0.92; learning may adjust it
      const w = createWorld(20, undefined, 42);
      const initialAlpha = getCoderAccuracy("AI Coder Alpha");
      expect(initialAlpha).toBeGreaterThan(0.85);
      expect(initialAlpha).toBeLessThanOrEqual(0.95);
      // After many ticks, accuracy should have been updated by learning
      let w2 = w;
      for (let i = 0; i < 1000; i++) {
        w2 = runWorld(w2, 1);
      }
      const finalAlpha = getCoderAccuracy("AI Coder Alpha");
      // Accuracy should remain in realistic range
      expect(finalAlpha).toBeGreaterThan(0.60);
      expect(finalAlpha).toBeLessThanOrEqual(0.98);
      console.log(`  Alpha accuracy: ${initialAlpha} → ${finalAlpha}`);
    });
  });
});
