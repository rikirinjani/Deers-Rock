import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { Charge, Encounter, InsuranceClaim, Payment, RoomClass, PayerType, ClaimDenialReason } from "../patient/schema.js";
import { appendCharge, ROOM_CLASS_MULTIPLIER, CHARGE_RATES } from "./charge-generator.js";
import { lookupCbgTariff, inferSeverity } from "./ina-cbg.js";
import { isBoundedStateEnabled } from "./config.js";
import { PRIVATE_TIERS } from "../patient/schema.js";
import { getPrimaryDiagnosis } from "./diagnosis-utils.js";

/**
 * ADR-025: Expanded accident ICD code detection for Jasa Raharja eligibility.
 * Covers trauma, injury, poisoning, and external cause codes per ICD-10 chapters.
 */
const ACCIDENT_ICD_CODES = new Set([
  // Trauma (S00-S99) - head, neck, trunk, limb injuries
  "S00", "S01", "S02", "S03", "S04", "S05", "S06", "S07", "S08", "S09",
  "S10", "S11", "S12", "S13", "S14", "S15", "S16", "S17", "S18", "S19",
  "S20", "S21", "S22", "S23", "S24", "S25", "S26", "S27", "S28", "S29",
  "S30", "S31", "S32", "S33", "S34", "S35", "S36", "S37", "S38", "S39",
  "S40", "S41", "S42", "S43", "S44", "S45", "S46", "S47", "S48", "S49",
  "S50", "S51", "S52", "S53", "S54", "S55", "S56", "S57", "S58", "S59",
  "S60", "S61", "S62", "S63", "S64", "S65", "S66", "S67", "S68", "S69",
  "S70", "S71", "S72", "S73", "S74", "S75", "S76", "S77", "S78", "S79",
  "S80", "S81", "S82", "S83", "S84", "S85", "S86", "S87", "S88", "S89",
  "S90", "S91", "S92", "S93", "S94", "S95", "S96", "S97", "S98", "S99",
  // Injury, poisoning & certain other consequences of external causes (T00-T98)
  "T00", "T01", "T02", "T03", "T04", "T05", "T06", "T07", "T08", "T09",
  "T10", "T11", "T12", "T13", "T14", "T15", "T16", "T17", "T18", "T19",
  "T20", "T21", "T22", "T23", "T24", "T25", "T26", "T27", "T28", "T29",
  "T30", "T31", "T32", "T33", "T34", "T35", "T36", "T37", "T38", "T39",
  "T40", "T41", "T42", "T43", "T44", "T45", "T46", "T47", "T48", "T49",
  "T50", "T51", "T52", "T53", "T54", "T55", "T56", "T57", "T58", "T59",
  "T60", "T61", "T62", "T63", "T64", "T65", "T66", "T67", "T68", "T69",
  "T70", "T71", "T72", "T73", "T74", "T75", "T76", "T77", "T78", "T79",
  "T80", "T81", "T82", "T83", "T84", "T85", "T86", "T87", "T88", "T89",
  "T90", "T91", "T92", "T93", "T94", "T95", "T96", "T97", "T98",
]);
const JR_TICK_CAP = 30 * 24 * 60; // 30-day Jasa Raharja treatment cap (in ticks / minutes)

/** ADR-015 D2: one sim-day = 1440 ticks (1 tick = 1 sim-minute). */
const TICKS_PER_SIM_DAY = 1440;

/**
 * ADR-015 D5 (Epic IX Phase 2): payer mix table.
 * One PAYER_MIX draw at encounter creation (injected rng source), stored on
 * the encounter — never re-derived per-tick (D8 entity-creation rule).
 *
 * - Non-WNI patients → Self-pay (override, no roll)
 * - Accident ICD codes → Jasa Raharja (override, no roll)
 * - Everyone else rolls against PAYER_MIX:
 *     BPJS Kesehatan 82%, BPJS Ketenagakerjaan 8% (CBG-like path, billed
 *     identically to BPJS Kesehatan in wave 1 — JKK accident workflow is
 *     deferred, D10), Private Insurance 7%, Self-pay 3%.
 *
 * The dead PAYERS array from the original design (containing invalid values
 * like "Private Insurance A/B") is deleted.
 */
export const PAYER_MIX: [PayerType, number][] = [
  ["BPJS Kesehatan", 0.82],
  ["BPJS Ketenagakerjaan", 0.08],
  ["Private Insurance", 0.07],
  ["Self-pay", 0.03],
];

function rollPayerMix(rng: number): PayerType {
  // Bound check: last entry takes the remainder (guards float drift).
  for (const [payer, share] of PAYER_MIX) {
    if (rng < share) return payer;
    rng -= share;
  }
  return PAYER_MIX[PAYER_MIX.length - 1][0];
}

/**
 * Assign payer at encounter start.
 * ADR-015 D5: `rngDraw` is an OPTIONAL one-shot rng source (inject
 * clock.rng from the calling handler). Without it the function is
 * deterministic and roll-free — existing callers that haven't been updated
 * still get the legacy default (BPJS Kesehatan for WNI non-accidents).
 * With it, the PAYER_MIX table is rolled ONCE at encounter creation.
 */
export function assignPayer(
  patient: { diagnoses: { code: string; active: boolean }[]; identity?: { nationality?: string } },
  rngDraw?: () => number,
): PayerType {
  if (patient.identity?.nationality && patient.identity.nationality !== "WNI") {
    return "Self-pay";
  }
  const primaryDiag = getPrimaryDiagnosis(patient);
  if (primaryDiag && ACCIDENT_ICD_CODES.has(primaryDiag.code)) {
    return "Jasa Raharja";
  }
  if (rngDraw) {
    return rollPayerMix(rngDraw());
  }
  return "BPJS Kesehatan";
}

/**
 * ADR-015 D5: deterministic private-insurance tier selection (zero rng).
 * String-hash claim.id into PRIVATE_TIERS (0-2). This keeps the per-claim
 * draw count at exactly 1 (the adjudication roll), satisfying D8.
 */
export function selectPrivateTier(claimId: string): number {
  let h = 0;
  for (let i = 0; i < claimId.length; i++) h = (h * 31 + claimId.charCodeAt(i)) | 0;
  return Math.abs(h) % PRIVATE_TIERS.length;
}

/**
 * Generate a BPJS SEP (Surat Elegibilitas Peserta) number.
 * Format: SEP + timestamp + sequential (simplified).
 */
function generateSepNumber(clock: Clock): string {
  return `SEP-${clock.tick}-${Math.floor(clock.rng() * 9000) + 1000}`;
}

/**
 * Check if the claim's ICD codes match the INA-CBG tariff group.
 * Returns true if valid, false if mismatched.
 */
function validateCbgCoding(enc: { id: string }, patient: { diagnoses: { code: string; active: boolean }[] } | undefined): boolean {
  if (!patient) return false;
  const primaryDx = patient.diagnoses.find(d => d.active) ?? patient.diagnoses[0];
  if (!primaryDx) return false;
  const cbgEntry = lookupCbgTariff(primaryDx.code);
  return cbgEntry !== undefined;
}

const PAYERS = ["BPJS Kesehatan", "BPJS Ketenagakerjaan", "Private Insurance A", "Private Insurance B", "Self-pay"];

/** Professional fees per action type (IDR). Used by AI Doctor/AI Nurse when performing actions. */
export const PROCEDURE_COSTS: Record<string, number> = {
  "doctor_round": 150000,
  "specialist_consult": 300000,
  "nursing_procedure": 50000,
  "surgery_major": 15000000,
  "surgery_intermediate": 10000000,
  "surgery_minor": 5000000,
};

export function billingHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  let newCharges = new Map(state.charges);
  const newClaims = new Map(state.insuranceClaims);
  const billedAdmin = new Set(Array.from(newCharges.values()).filter(c => c.category === "administration").map(c => c.encounterId));

  // Admin tariff: once per encounter (both inpatient and outpatient)
  for (const enc of state.encounters.values()) {
    if (enc.status !== "active") continue;
    if (billedAdmin.has(enc.id)) continue;
    newCharges = appendCharge(newCharges, clock, enc.id, enc.patientId, "administration", "Administration fee");
    billedAdmin.add(enc.id);
  }

  // Room tariff (ADR-015 D2 — fixes F-A): bill ONCE per 1440-tick sim-day
  // against the encounter's roomClassAtAdmission stamp (set at bed
  // assignment, markov.ts). Full days are charged at each complete-day
  // anniversary while active; at discharge ONE final partial day covers the
  // remainder (total days = ceil((end−start)/1440), min 1). Idempotent per
  // encounter-day via the lastRoomDayBilled counter, so this pass is safe to
  // run at any cadence (the world drives it every 5 ticks). Pure arithmetic —
  // no rng draws. Only inpatients carry the stamp: outpatient/ED encounters
  // never accrue room charges.
  const msPerTick = clock.tickIntervalMs * clock.speedMultiplier;
  if (msPerTick > 0) {
    const nowTick = Math.floor(clock.hospitalTimeMs / msPerTick);
    let updatedEncounters: Map<string, Encounter> | null = null;
    for (const enc of state.encounters.values()) {
      if (enc.type !== "inpatient") continue;
      const rc: RoomClass | undefined = enc.roomClassAtAdmission;
      if (!rc) continue;
      const startTick = Math.floor(enc.startTime / msPerTick);
      let targetDays: number;
      if (enc.status === "active") {
        targetDays = Math.floor((nowTick - startTick) / TICKS_PER_SIM_DAY);
      } else if (enc.status === "discharged" && enc.endTime !== null) {
        const endTick = Math.floor(enc.endTime / msPerTick);
        targetDays = Math.max(1, Math.ceil((endTick - startTick) / TICKS_PER_SIM_DAY));
      } else {
        continue;
      }
      const lastBilled = enc.lastRoomDayBilled ?? 0;
      if (targetDays <= lastBilled) continue;
      const rate = Math.round(CHARGE_RATES.room * (ROOM_CLASS_MULTIPLIER[rc] ?? 1));
      for (let day = lastBilled + 1; day <= targetDays; day++) {
        newCharges = appendCharge(newCharges, clock, enc.id, enc.patientId, "room",
          `Room (${rc}) - day ${day}`, rate, { code: rc, unitPrice: rate, quantity: 1 });
      }
      if (updatedEncounters === null) updatedEncounters = new Map(state.encounters);
      updatedEncounters.set(enc.id, { ...enc, lastRoomDayBilled: targetDays });
    }
    if (updatedEncounters !== null) state = { ...state, encounters: updatedEncounters };
  }

  for (const enc of state.encounters.values()) {
    if (enc.status !== "discharged") continue;
    const claimId = `CLM-${enc.id}`;
    if (newClaims.has(claimId)) continue;

    const encCharges = Array.from(newCharges.values()).filter(c => c.encounterId === enc.id);
    const total = encCharges.reduce((s, c) => s + c.amount, 0);
    if (total === 0) continue;

    const payer = enc.payer ?? "BPJS Kesehatan";

    // BPJS / BPJS Ketenagakerjaan claims require coded chart before submission
    const patient = state.patients.get(enc.patientId);
    const chart = Array.from(state.medicalCharts.values()).find(c => c.encounterId === enc.id);
    const chartStatus = chart?.status ?? "open";
    const isCbgPayer = payer === "BPJS Kesehatan" || payer === "BPJS Ketenagakerjaan";
    if (isCbgPayer && chartStatus !== "coded") {
      continue;
    }

    // Compute severity from chart diagnoses (ADR-015 D4 — chart is the grouping
    // truth source for both severity and tariff lookup)
    const chartDxCodes = chart?.diagnoses.map(d => d.code) ?? [];
    const { level: severity } = inferSeverity(chartDxCodes);
    const primaryDx = patient?.diagnoses.find(d => d.active) ?? patient?.diagnoses[0];
    const cbgEntry = primaryDx ? lookupCbgTariff(primaryDx.code, severity) : undefined;

    let totalCharges = total;
    let coveredAmount: number;
    let patientResponsibility: number;
    let sepNumber: string | null = null;
    let denialReason: ClaimDenialReason = null;
    let privateTier: number | undefined;

    if (isCbgPayer) {
      // BPJS / Ketenagakerjaan: all-inclusive tariff per INA-CBG (wave 1: same path)
      if (cbgEntry) {
        totalCharges = cbgEntry.tariffIdr;
        coveredAmount = cbgEntry.tariffIdr;
        patientResponsibility = 0;
        sepNumber = generateSepNumber(clock);
      } else {
        // ADR-015 D3: no longer a stillborn denied claim — submitted with
        // denial deferred to the verification stage (invalid_principal_dx).
        totalCharges = total;
        coveredAmount = 0;
        patientResponsibility = total;
        denialReason = "mismatched_icd_cbg";
      }
    } else if (payer === "Jasa Raharja") {
      // JR: full coverage for accident cases, capped at 30 days
      const encounterDurationTicks = (enc.endTime && enc.startTime)
        ? Math.round((enc.endTime - enc.startTime) / 60000)
        : 0;
      const jrCapRatio = encounterDurationTicks > JR_TICK_CAP
        ? JR_TICK_CAP / encounterDurationTicks
        : 1;
      totalCharges = total;
      coveredAmount = Math.round(total * jrCapRatio);
      patientResponsibility = total - coveredAmount;
      sepNumber = generateSepNumber(clock);
    } else if (payer === "Self-pay") {
      totalCharges = total;
      coveredAmount = 0;
      patientResponsibility = total;
    } else {
      // ADR-015 D5: private insurance — 3-tier table replaces the flat 70%.
      // Tier is deterministic (string hash of claim id), zero rng (D8).
      privateTier = selectPrivateTier(claimId);
      const tier = PRIVATE_TIERS[privateTier] ?? PRIVATE_TIERS[0];
      totalCharges = total;
      coveredAmount = Math.round(total * tier.coverage);
      patientResponsibility = total - coveredAmount;
    }

    const claim: InsuranceClaim = {
      id: claimId,
      encounterId: enc.id,
      patientId: enc.patientId,
      payer,
      sepNumber,
      actualCost: total,
      totalCharges,
      coveredAmount,
      patientResponsibility,
      // ADR-015 D3: every new claim enters the lifecycle at "submitted";
      // Jasa Raharja (fully covered, no verifikator step) goes straight to
      // paid — existing behavior.
      status: denialReason && payer === "Jasa Raharja" ? "paid" : "submitted",
      denialReason,
      submittedAt: clock.hospitalTimeMs,
      resolvedAt: payer === "Jasa Raharja" ? clock.hospitalTimeMs : null,
      privateTier,
    };
    newClaims.set(claim.id, claim);
  }

  // ── ADR-015 D3 (Phase 2): verifying stage — 1 pass between submitted and
  //    adjudicated. Runs every 15 ticks alongside adjudication; moves
  //    submitted → verifying (verifikator review). Pure state transition,
  //    zero rng draws. Bounded batch of 8 to avoid O(n) per-claim scans.
  if (clock.tick > 0 && clock.tick % 15 === 0) {
    let batch = 0;
    for (const [id, claim] of newClaims) {
      if (batch >= 8) break;
      if (claim.status !== "submitted") continue;
      newClaims.set(id, { ...claim, status: "verifying" });
      batch++;
    }

    // Adjudicate verifying claims — batch of up to 8 per pass (fixes F-B:
    // one-claim-per-pass could not drain the backlog created by discharges).
    // ONE rng draw per transitioned claim (D8 transition rule); draw count
    // is a pure function of state (number of claims in "verifying").
    batch = 0;
    for (const [id, claim] of newClaims) {
      if (batch >= 8) break;
      if (claim.status !== "verifying") continue;

      let newStatus: InsuranceClaim["status"];
      let denialReason: ClaimDenialReason = null;

      // ADR-015 D3: causal denial checks (deterministic, chart-driven — no rng).
      const enc = state.encounters.get(claim.encounterId);
      const encChart = Array.from(state.medicalCharts.values()).find(c => c.encounterId === claim.encounterId);
      const isCbgClaim = claim.payer === "BPJS Kesehatan" || claim.payer === "BPJS Ketenagakerjaan";

      if (isCbgClaim) {
        // invalid_principal_dx: billed CBG claim whose coded chart's primary
        // dx has no tariff mapping (or the claim was born with the legacy
        // mismatched_icd_cbg marker — surface it as the proper denial).
        const chartPrimary = encChart?.diagnoses.find(d => d.type === "primary")
          ?? encChart?.diagnoses[0];
        const chartHasTariff = chartPrimary ? lookupCbgTariff(chartPrimary.code) !== undefined : false;
        const chartDxHasTariff = encChart?.diagnoses.some(d => lookupCbgTariff(d.code) !== undefined) ?? false;
        if (claim.denialReason === "mismatched_icd_cbg" || (chartHasTariff === false && chartDxHasTariff === false)) {
          newStatus = "denied";
          denialReason = "invalid_principal_dx";
        } else {
          // procedure_not_documented: a billed procedure charge with no
          // corresponding chart procedure entry.
          const procCharges = Array.from(newCharges.values()).filter(c =>
            c.encounterId === claim.encounterId &&
            (c.category === "surgery" || c.category === "dialysis" || c.category === "radiotherapy"));
          const chartProcs = encChart?.procedures ?? [];
          if (procCharges.length > 0 && chartProcs.length === 0) {
            newStatus = "denied";
            denialReason = "procedure_not_documented";
          } else {
            // ADR-015 D3/D6: coding-defect probability varies with chart
            // completeness — fewer secondary diagnoses → higher chance the
            // verifikator flags the resume medis as incomplete. Bounded
            // deterministic function of chart state; ONE rng roll for the
            // paid/returned/denied outcome (D8: 1 draw per transitioned claim).
            const secondaryCount = encChart?.diagnoses.filter(d => d.type === "secondary").length ?? 0;
            const defectProb = Math.min(0.25, 0.10 + Math.max(0, 2 - secondaryCount) * 0.05);
            const roll = clock.rng();
            if (roll < 1 - defectProb) {
              newStatus = "paid";
            } else {
              // Split the defect probability: 2/3 returned-for-coding (auto
              // resubmits when the chart is coded — existing loop below),
              // 1/3 hard-denied missing_documents.
              if (roll < 1 - defectProb * (1/3)) {
                newStatus = "returned";
                denialReason = "incomplete_coding";
              } else {
                newStatus = "denied";
                denialReason = "missing_documents";
              }
            }
          }
        }
      } else {
        // Non-CBG payers (JR is already terminal at creation; private/
        // self-pay settle on their coverage math): verifying passes
        // straight to paid with no denial roll (zero extra rng draws).
        newStatus = "paid";
      }

      newClaims.set(id, { ...claim, status: newStatus, denialReason, resolvedAt: clock.hospitalTimeMs });
      batch++;
    }
  }

  // Process returned claims: resubmit if coding is now complete
  for (const [id, claim] of newClaims) {
    if (claim.status !== "returned") continue;
    const chart = Array.from(state.medicalCharts.values()).find(c => c.encounterId === claim.encounterId);
    if (chart?.status === "coded") {
      newClaims.set(id, { ...claim, status: "submitted", denialReason: null, resolvedAt: null });
    }
  }

  // ADR-004 D2 — bounded growth: charges pruning (flag-gated, in-handler).
  newCharges = pruneAgedCharges(state, newCharges, newClaims, clock);

  return { ...state, charges: newCharges, insuranceClaims: newClaims };
}

/**
 * ADR-004 D2 — bounded growth: prune settled, aged charges.
 *
 * A charge is pruned only when ALL hold:
 *   1. its encounter is discharged (a MISSING encounter counts as discharged:
 *      cleanup.ts only ever prunes non-active encounters, so a missing record
 *      was necessarily non-active; retaining its charges would leak orphans);
 *   2. every linked claim (same encounterId) is terminal (paid/denied);
 *      an encounter with NO claim yet is always retained — claim creation
 *      above sums live charges into actualCost/totalCharges, and claims carry
 *      no charge IDs (reference audit: no reader dereferences charge.id or
 *      looks charges up by ID; finance aggregates by encounterId, reports
 *      sum amounts, producers are append-only);
 *   3. charge age exceeds the TTL (strictly greater; age == TTL is retained).
 *
 * Age is derived deterministically from `clock` (billedAt is hospital-time ms;
 * 1 tick = tickIntervalMs * speedMultiplier ms) — never wall-clock. No rng()
 * is consumed, none reordered. Flags OFF (or an off-cadence tick) returns the
 * input map UNTOUCHED (same reference), so OFF-mode behavior is byte-identical.
 *
 * PERFORMANCE: this pass scans the charges map, so it runs at most every
 * PRUNE_EVERY_TICKS ticks — never an O(n) scan per tick.
 *
 * Steady-state sizing: charges grow ~28/tick (local pilot, seed 42), so
 * TTL 2000 ticks bounds the map at ~56k entries.
 */
const PRUNE_EVERY_TICKS = 100;
const DEFAULT_CHARGES_TTL_TICKS = 2000;

function chargesTtlTicks(): number {
  const raw = Number(process.env.DR_PRUNE_TTL_CHARGES);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_CHARGES_TTL_TICKS;
}

/** Hospital-time ms → tick, same convention as respiratory.ts/dietary.ts. */
function ticksFromMs(hospitalTimeMs: number, msPerTick: number): number {
  return Math.floor(hospitalTimeMs / msPerTick);
}

function pruneAgedCharges(
  state: HospitalState,
  charges: Map<string, Charge>,
  claims: Map<string, InsuranceClaim>,
  clock: Clock,
): Map<string, Charge> {
  if (!isBoundedStateEnabled()) return charges;
  if (clock.tick <= 0 || clock.tick % PRUNE_EVERY_TICKS !== 0) return charges;
  if (charges.size === 0) return charges;

  const ttl = chargesTtlTicks();
  const msPerTick = clock.tickIntervalMs * clock.speedMultiplier;
  if (!(msPerTick > 0)) return charges;
  const nowTick = ticksFromMs(clock.hospitalTimeMs, msPerTick);

  // Index linked claims by encounterId (one claim per encounter in practice:
  // `CLM-${enc.id}` — but handle multiples; ALL must be terminal).
  const claimsByEncounter = new Map<string, InsuranceClaim[]>();
  for (const claim of claims.values()) {
    const list = claimsByEncounter.get(claim.encounterId);
    if (list) list.push(claim);
    else claimsByEncounter.set(claim.encounterId, [claim]);
  }

  let pruned: Map<string, Charge> | null = null;
  for (const [id, charge] of charges) {
    if (nowTick - ticksFromMs(charge.billedAt, msPerTick) <= ttl) continue;
    const enc = state.encounters.get(charge.encounterId);
    if (enc !== undefined && enc.status !== "discharged") continue;
    const linked = claimsByEncounter.get(charge.encounterId);
    if (linked === undefined || linked.length === 0) {
      // No claim yet: charges are still needed for claim totals — retain,
      // unless the encounter record itself is already gone (fully orphaned).
      if (enc !== undefined) continue;
    } else if (!linked.every(c => c.status === "paid" || c.status === "denied")) {
      continue;
    }
    if (pruned === null) pruned = new Map(charges);
    pruned.delete(id);
  }
  return pruned ?? charges;
}

function processCashier(state: HospitalState, clock: Clock, encounterType: string): HospitalState {
  let newPayments = new Map(state.payments);
  const newClaims = new Map(state.insuranceClaims);
  let newCharges: Map<string, Charge> | null = null;

  for (const [id, claim] of newClaims) {
    if (claim.status !== "paid" || claim.patientResponsibility <= 0) continue;
    const enc = state.encounters.get(claim.encounterId);
    if (!enc || enc.type !== encounterType) continue;

    const payment: Payment = {
      id: `PAY-${clock.tick}-${claim.patientId}`,
      encounterId: claim.encounterId,
      patientId: claim.patientId,
      type: clock.rng() > 0.5 ? "cash" : "card",
      amount: claim.patientResponsibility,
      paidAt: clock.hospitalTimeMs,
      note: `Patient responsibility for ${claim.id}`,
    };
    newPayments.set(payment.id, payment);

    // ADR-015 D9: flip linked charges to paid in the same pass. Charges link
    // to encounters via encounterId (claims carry no charge IDs); no partial
    // payments in wave 1 — every still-unpaid charge of the encounter flips.
    for (const charge of (newCharges ?? state.charges).values()) {
      if (charge.encounterId !== claim.encounterId || charge.paid) continue;
      if (newCharges === null) newCharges = new Map(state.charges);
      newCharges.set(charge.id, { ...charge, paid: true });
    }
    break;
  }

  return newCharges !== null
    ? { ...state, insuranceClaims: newClaims, payments: newPayments, charges: newCharges }
    : { ...state, insuranceClaims: newClaims, payments: newPayments };
}

export function edCashierHandler(state: HospitalState, clock: Clock, queue: EventQueue): HospitalState {
  return processCashier(state, clock, "outpatient");
}

export function inpatientCashierHandler(state: HospitalState, clock: Clock, queue: EventQueue): HospitalState {
  return processCashier(state, clock, "inpatient");
}

export function outpatientCashierHandler(state: HospitalState, clock: Clock, queue: EventQueue): HospitalState {
  return processCashier(state, clock, "outpatient");
}
