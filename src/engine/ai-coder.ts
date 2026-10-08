/**
 * AI Medical Coder Agent — ADR-018
 *
 * Extends the basic medical-records.ts with:
 *   1. ICD-10 validation (cross-check vs INA-CBG formulary)
 *   2. DRG/CBG assignment with severity inference
 *   3. Chart completeness scoring (diagnoses, procedures, lab/rad coverage)
 *   4. Learning from outcomes (accuracy improves with case volume)
 *
 * Integration:
 *   - Called from medicalRecordsHandler (every 3 ticks)
 *   - Results stored on MedicalChart (coderAccuracy, drgGroup, completeness)
 *   - Feeds back into finance.ts claim validation
 */
import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import type { MedicalChart } from "../patient/schema.js";
import {
  lookupCbgTariff, getFullCbgTariff, inferSeverity,
  CC_LIST, listCbgGroups, type CbgEntry, type SeverityLevel,
} from "./ina-cbg.js";

// ── Coder definitions with learning state ────────────────────────────────
export interface CoderProfile {
  name: string;
  specialty: string;
  baseAccuracy: number;
  /** Current learned accuracy (improves with experience) */
  accuracy: number;
  casesProcessed: number;
  correctAssignments: number;
  /** Specialty-biased ICD prefixes */
  icdPrefixes: string[];
}

const CODER_PROFILES: CoderProfile[] = [
  { name: "AI Coder Alpha", specialty: "internal_medicine", baseAccuracy: 0.92, accuracy: 0.92, casesProcessed: 0, correctAssignments: 0, icdPrefixes: ["I", "E", "N", "R", "J", "K", "G", "F"] },
  { name: "AI Coder Beta", specialty: "surgery", baseAccuracy: 0.88, accuracy: 0.88, casesProcessed: 0, correctAssignments: 0, icdPrefixes: ["S", "T", "M", "V", "W", "X"] },
  { name: "AI Coder Gamma", specialty: "pediatrics", baseAccuracy: 0.90, accuracy: 0.90, casesProcessed: 0, correctAssignments: 0, icdPrefixes: ["P", "Q", "R"] },
  { name: "AI Coder Delta", specialty: "general", baseAccuracy: 0.85, accuracy: 0.85, casesProcessed: 0, correctAssignments: 0, icdPrefixes: ["A", "B", "C", "D", "H", "L", "O", "U", "Z"] },
];

// ── ICD-10 Validation ─────────────────────────────────────────────────────
export interface IcdValidationResult {
  code: string;
  valid: boolean;
  warning?: string;
  severity?: SeverityLevel;
  cbgGroup?: string;
  tariffIdr?: number;
  suggestion?: string;
}

/** Validate an ICD-10 code against the INA-CBG formulary */
export function validateIcdCode(icdCode: string): IcdValidationResult {
  const entry = lookupCbgTariff(icdCode, "I");
  if (entry) {
    const { level } = inferSeverity([icdCode]);
    return {
      code: icdCode,
      valid: true,
      severity: level,
      cbgGroup: entry.cbgGroup,
      tariffIdr: entry.tariffIdr,
    };
  }
  // Check if it's a known ICD code prefix (3+ chars, starts with letter)
  if (/^[A-Z][0-9][.\d]/.test(icdCode) && icdCode.length >= 3) {
    // Known format but not in CBG tariff table — valid ICD but no tariff
    return { code: icdCode, valid: true, warning: "No INA-CBG tariff mapping" };
  }
  // Unknown code
  return {
    code: icdCode,
    valid: false,
    warning: "Unknown ICD-10 code",
    suggestion: suggestCode(icdCode),
  };
}

function suggestCode(unknown: string): string | undefined {
  // Fuzzy match: try removing trailing chars
  for (let len = unknown.length - 1; len >= 3; len--) {
    const candidate = unknown.substring(0, len);
    if (lookupCbgTariff(candidate, "I")) return candidate;
  }
  return undefined;
}

/** Validate all diagnoses on a chart, return grouped results */
export function validateChartDiagnoses(diagnoses: { code: string; name: string; type: string }[]): IcdValidationResult[] {
  return diagnoses.map(d => validateIcdCode(d.code));
}

// ── DRG / CBG Assignment ──────────────────────────────────────────────────
export interface DrgAssignment {
  cbgGroup: string;
  severity: SeverityLevel;
  sep: number;
  tariffIdr: number;
  description: string;
}

/** Assign DRG/CBG to a chart based on diagnoses + procedures */
export function assignDrg(
  primaryCode: string,
  secondaryCodes: string[],
  procedureCodes: string[],
): DrgAssignment | null {
  if (!primaryCode) return null;
  const allCodes = [primaryCode, ...secondaryCodes.filter(c => c !== primaryCode)];
  const { sep, level } = inferSeverity(allCodes);
  const entry = lookupCbgTariff(primaryCode, level);
  if (!entry) return null;

  // Boost severity if surgical procedure matches diagnosis
  const prog = procedureCodes.length > 0 ? 1 : 0;
  const boostedSep = Math.min(4, sep + (prog > 0 && sep < 3 ? 1 : 0));
  const boostedLevel: SeverityLevel = boostedSep >= 3 ? "III" : boostedSep >= 2 ? "II" : "I";
  const finalEntry = lookupCbgTariff(primaryCode, boostedLevel) ?? entry;

  return {
    cbgGroup: finalEntry.cbgGroup,
    severity: boostedLevel,
    sep: boostedSep,
    tariffIdr: finalEntry.tariffIdr,
    description: finalEntry.description,
  };
}

// ── Chart Completeness Scorer ─────────────────────────────────────────────
export interface CompletenessScore {
  score: number;           // 0–100
  diagnosesComplete: boolean;
  proceduresComplete: boolean;
  labCoverage: number;     // 0–1
  radCoverage: number;     // 0–1
  notesComplete: boolean;
  gaps: string[];
}

export function scoreChartCompleteness(
  chart: MedicalChart,
  state: HospitalState,
): CompletenessScore {
  const gaps: string[] = [];
  let score = 0;

  // Diagnoses: primary required, up to 5 secondary
  const dxCount = chart.diagnoses.length;
  if (dxCount === 0) { gaps.push("no_diagnosis"); }
  else if (dxCount === 1) { score += 20; }
  else if (dxCount >= 2) { score += 30; }
  if (dxCount >= 3) score += 10;

  // Procedures
  const hasProcs = chart.procedures.length > 0;
  if (hasProcs) { score += 20; }
  else { score += 10; } // baseline for non-surgical

  // Lab coverage: check if encounter has lab orders
  const labOrders = Array.from((state as unknown as { _labOrders?: Map<string, any> })._labOrders?.values() ?? []);
  const encLabOrders = labOrders.filter((l: any) => l.encounterId === chart.encounterId);
  const labRatio = Math.min(1, encLabOrders.length / 2);
  score += Math.round(labRatio * 10);
  if (labRatio === 0) gaps.push("no_lab_orders");

  // Radiology coverage
  const radOrders = Array.from((state as unknown as { _radOrders?: Map<string, any> })._radOrders?.values() ?? []);
  const encRadOrders = radOrders.filter((r: any) => r.encounterId === chart.encounterId);
  const radRatio = Math.min(1, encRadOrders.length / 1);
  score += Math.round(radRatio * 5);

  // Notes / discharge summary
  const nurseNotes = Array.from((state as unknown as { _nurseNotes?: Map<string, any> })._nurseNotes?.values() ?? []);
  const hasNotes = nurseNotes.some((n: any) => n.encounterId === chart.encounterId);
  if (hasNotes) { score += 5; }
  else { gaps.push("no_nurse_notes"); }

  // Coder assigned?
  if (chart.coder) { score += 10; }
  else { gaps.push("no_coder_assigned"); }

  return {
    score: Math.min(100, score),
    diagnosesComplete: dxCount >= 1,
    proceduresComplete: hasProcs,
    labCoverage: labRatio,
    radCoverage: radRatio,
    notesComplete: hasNotes,
    gaps,
  };
}

// ── Coder Learning Engine ─────────────────────────────────────────────────
export interface CoderOutcome {
  coderName: string;
  icdCode: string;
  assignedDrg: string;
  correct: boolean;
  tick: number;
}

export interface CoderLearningState {
  outcomes: CoderOutcome[];
  accuracyHistory: Map<string, number[]>; // coderName → [accuracy, ...]
}

export function initCoderLearningState(): CoderLearningState {
  return { outcomes: [], accuracyHistory: new Map() };
}

/** Update coder accuracy based on outcome feedback */
export function recordCoderOutcome(
  state: HospitalState,
  outcome: CoderOutcome,
): void {
  const learnState = (state as unknown as { _coderLearningState?: CoderLearningState })._coderLearningState;
  if (!learnState) return;

  learnState.outcomes.push(outcome);

  // Maintain rolling accuracy window (last 50 outcomes per coder)
  const history = learnState.accuracyHistory.get(outcome.coderName) ?? [];
  history.push(outcome.correct ? 1 : 0);
  if (history.length > 50) history.shift();
  learnState.accuracyHistory.set(outcome.coderName, history);

  // Update coder profile accuracy
  const profile = CODER_PROFILES.find(c => c.name === outcome.coderName);
  if (profile) {
    profile.casesProcessed++;
    if (outcome.correct) profile.correctAssignments++;
    // Weighted average: 70% historical, 30% recent window
    const recentAcc = history.length > 0
      ? history.reduce((a, b) => a + b, 0) / history.length
      : 0;
    profile.accuracy = Math.round((0.7 * profile.baseAccuracy + 0.3 * recentAcc) * 100) / 100;
    // Clamp to realistic range
    profile.accuracy = Math.max(0.60, Math.min(0.98, profile.accuracy));
  }
}

/** Get current accuracy for a coder */
export function getCoderAccuracy(coderName: string): number {
  const profile = CODER_PROFILES.find(c => c.name === coderName);
  return profile?.accuracy ?? 0.85;
}

/** Get all coder profiles (for API exposure) */
export function getAllCoderProfiles(): CoderProfile[] {
  return [...CODER_PROFILES];
}

// ── Main Handler ──────────────────────────────────────────────────────────
export function aiCoderHandler(state: HospitalState, clock: Clock, _queue: import("./event-queue.js").EventQueue): HospitalState {
  // Run every 3 ticks to avoid blocking
  if (clock.tick % 3 !== 0) return state;

  const charts = new Map(state.medicalCharts);
  const learnState = (state as unknown as { _coderLearningState?: CoderLearningState })._coderLearningState;

  // Process open/incomplete charts
  let processed = 0;
  for (const [id, chart] of charts) {
    if (processed >= 8) break;
    if (chart.status !== "open" && chart.status !== "incomplete") continue;

    const primaryDx = chart.diagnoses.find(d => d.type === "primary");
    const secondaryDx = chart.diagnoses.filter(d => d.type === "secondary").map(d => d.code);
    const procCodes = chart.procedures.map(p => p.code);

    // Validate ICD codes
    const validations = validateChartDiagnoses(chart.diagnoses);
    const hasInvalid = validations.some(v => !v.valid);

    // Assign DRG
    const drg = assignDrg(
      primaryDx?.code ?? "",
      secondaryDx,
      procCodes,
    );

    // Score completeness
    const completeness = scoreChartCompleteness(chart, state);

    // Pick coder and determine coding decision
    const coderName = chart.coder ?? pickBestCoder(primaryDx?.code ?? "", () => clock.rng());
    const coderAccuracy = getCoderAccuracy(coderName);
    const willCode = clock.rng() < coderAccuracy;

    let newStatus: MedicalChart["status"] = chart.status;
    if (willCode && !hasInvalid && drg) {
      newStatus = "coded";
    } else if (hasInvalid) {
      newStatus = "incomplete"; // flag for manual review
    } else {
      newStatus = "incomplete";
    }

    charts.set(id, {
      ...chart,
      status: newStatus,
      _drg: drg ?? undefined,
      _completeness: completeness.score,
      _validations: validations,
    });

    // Record outcome for learning when chart transitions to coded
    if (learnState && chart.status === "incomplete" && newStatus === "coded" && drg) {
      recordCoderOutcome(state, {
        coderName,
        icdCode: primaryDx?.code ?? "",
        assignedDrg: drg.cbgGroup,
        correct: true, // will be updated when outcome is known
        tick: clock.tick,
      });
    }

    processed++;
  }

  return { ...state, medicalCharts: charts };
}

function pickBestCoder(primaryIcd: string, rng: () => number): string {
  const prefix = primaryIcd.charAt(0);
  const specialists = CODER_PROFILES.filter(c => c.icdPrefixes.includes(prefix));
  const pool = specialists.length > 0 ? specialists : CODER_PROFILES;
  return pool[Math.floor(rng() * pool.length)]!.name;
}

// ── Extended MedicalChart type (additive, backward-compatible) ───────────
export interface MedicalChartExtended extends MedicalChart {
  /** Assigned DRG/CBG info */
  _drg?: DrgAssignment;
  /** Completeness score 0–100 */
  _completeness?: number;
  /** ICD validation results */
  _validations?: IcdValidationResult[];
  /** Active coder name */
  _coderName?: string;
}
