import type { HospitalState } from "./state-store.js";
import { subStreamRng, streamId, type Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { Charge, Encounter, InsuranceClaim, Payment, RoomClass, PayerType, ClaimDenialReason } from "../patient/schema.js";
import { appendCharge, ROOM_CLASS_MULTIPLIER, CHARGE_RATES } from "./charge-generator.js";
import { getClaimLifecycle } from "./billing/registry.js";
import type { ClaimContext } from "./billing/contracts.js";
import { selectPrivateTier } from "./billing/indonesia-claims.js";
import { isBoundedStateEnabled } from "./config.js";
import { PRIVATE_TIERS } from "../patient/schema.js";
import { getPrimaryDiagnosis } from "./diagnosis-utils.js";
import { getIncidentForEncounter } from "../referral/jr-provenance.js";

/**
 * Jasa Raharja eligibility — traffic accidents only (owner decision 2026-10-31,
 * supersedes ADR-025's all-S/T-chapter rule and M9.3-BLOCKER-DECISIONS §5).
 * Jasa Raharja covers road-traffic victims and public-transport passengers
 * (UU 33 & 34/1964); a police traffic-accident report backs every claim.
 *
 * The simulation records injuries, not their cause, so a trauma injury gets
 * a mechanism: traffic with P_TRAFFIC_GIVEN_INJURY, drawn ONCE per patient
 * from a dedicated sub-stream keyed on (world seed, patient id). The same
 * accident therefore stays traffic across re-presentations, and no existing
 * rng stream moves. Burns, poisonings and complications of care (T15–T98)
 * are not traffic injuries.
 */
const TRANSPORT_ACCIDENT = /^V\d\d/;           // ICD-10 V01–V99: transport accidents
const TRAUMA_INJURY = /^(S\d\d|T0\d|T1[0-4])/; // S00–S99, T00–T14
/**
 * Share of trauma injuries caused by traffic. Riskesdas: motorcycle crashes
 * 40.6 % of all injuries (falls 40.9 %), plus other road users; hospital
 * series run higher (70 % of traumatic brain injury). Calibration target.
 */
export const P_TRAFFIC_GIVEN_INJURY = 0.45;

export type InjuryMechanism = "traffic" | "other";

interface PayerPatient {
  id?: string;
  diagnoses: { code: string; active: boolean }[];
  identity?: { nationality?: string };
  injuryMechanism?: InjuryMechanism;
}

/**
 * Mechanism of a patient's injury, or null when the code is not an injury.
 * An explicit `patient.injuryMechanism` wins; V codes are traffic by
 * definition; trauma codes draw once per (world seed, patient).
 */
export function injuryMechanism(patient: PayerPatient, code: string, worldSeed?: number): InjuryMechanism | null {
  if (TRANSPORT_ACCIDENT.test(code)) return "traffic";
  if (!TRAUMA_INJURY.test(code)) return null;
  if (patient.injuryMechanism) return patient.injuryMechanism;
  if (worldSeed === undefined || patient.id === undefined) return "other";
  return subStreamRng(worldSeed, 0, streamId(`injury-mechanism:${patient.id}`))() < P_TRAFFIC_GIVEN_INJURY ? "traffic" : "other";
}

const JR_TICK_CAP = 30 * 24 * 60; // 30-day Jasa Raharja treatment cap (in ticks / minutes)

/** ADR-015 D2: one sim-day = 1440 ticks (1 tick = 1 sim-minute). */
const TICKS_PER_SIM_DAY = 1440;

/**
 * ADR-015 D5 (Epic IX Phase 2): payer mix table.
 * One PAYER_MIX draw at encounter creation (injected rng source), stored on
 * the encounter — never re-derived per-tick (D8 entity-creation rule).
 *
 * - Non-WNI patients → Self-pay (override, no roll)
 * - Traffic-accident injuries → Jasa Raharja (override, no roll); other
 *   injuries roll the mix like any other case (see injuryMechanism)
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
  patient: PayerPatient,
  rngDraw?: () => number,
  worldSeed?: number,
): PayerType {
  if (patient.identity?.nationality && patient.identity.nationality !== "WNI") {
    return "Self-pay";
  }
  const primaryDiag = getPrimaryDiagnosis(patient);
  if (primaryDiag && injuryMechanism(patient, primaryDiag.code, worldSeed) === "traffic") {
    return "Jasa Raharja";
  }
  if (rngDraw) {
    return rollPayerMix(rngDraw());
  }
  return "BPJS Kesehatan";
}

/** Re-exported: moved to billing/indonesia-claims.ts (Epic X M10.2). */
export { selectPrivateTier };

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
  const lifecycle = getClaimLifecycle();
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

    const patient = state.patients.get(enc.patientId);
    const chart = Array.from(state.medicalCharts.values()).find(c => c.encounterId === enc.id);
    const primaryDx = patient?.diagnoses.find(d => d.active) ?? patient?.diagnoses[0];
    // Epic X M10.2: country rules (coded-chart gate, tariff/severity, coverage
    // math, payer reference) live behind IClaimLifecycle; the engine keeps
    // scheduling and state.
    const ctx: ClaimContext = {
      claimId,
      encounterId: enc.id,
      patientId: enc.patientId,
      payerType: payer,
      tick: clock.tick,
      totalCharges: total,
      patientPrimaryDxCode: primaryDx?.code ?? null,
      chartDiagnoses: chart?.diagnoses.map(d => ({ code: d.code, type: d.type })) ?? [],
      chartProcedureCount: chart?.procedures?.length ?? 0,
      billedProcedureChargeCount: 0,
      chartCoded: (chart?.status ?? "open") === "coded",
      encounterDurationTicks: (enc.endTime && enc.startTime) ? Math.round((enc.endTime - enc.startTime) / 60000) : 0,
      existingDenialCode: null,
      coveredAmount: 0,
    };
    if (!lifecycle.canSubmit(ctx)) continue;
    const draft = lifecycle.buildClaim(ctx, () => clock.rng());

    const claim: InsuranceClaim = {
      id: claimId,
      encounterId: enc.id,
      patientId: enc.patientId,
      payer,
      sepNumber: draft.payerReference,
      actualCost: total,
      totalCharges: draft.billedAmount,
      coveredAmount: draft.coveredAmount,
      patientResponsibility: draft.patientResponsibility,
      // ADR-015 D3: every new claim enters the lifecycle at "submitted";
      // payers that settle at creation (Jasa Raharja) are stamped resolved.
      status: draft.initialStatus as InsuranceClaim["status"],
      denialReason: (draft.deferredDenial?.code ?? null) as ClaimDenialReason,
      submittedAt: clock.hospitalTimeMs,
      resolvedAt: draft.settledAtCreation ? clock.hospitalTimeMs : null,
      privateTier: draft.tierIndex,
    };
    // Epic IX M9.3: a Jasa Raharja claim is filed under its accident incident.
    if (payer === "Jasa Raharja" && state._jrState) {
      const incident = getIncidentForEncounter(state._jrState, enc.id);
      if (incident) claim.incidentRef = incident.id;
    }
    newClaims.set(claim.id, claim);
  }

  // ── ADR-015 D3 (Phase 2): verifying stage — 1 pass between submitted and
  //    adjudicated. Runs every 15 ticks alongside adjudication; moves
  //    submitted → verifying (verifikator review). Pure state transition,
  //    zero rng draws. Bounded batch of 8 to avoid O(n) per-claim scans.
  if (clock.tick > 0 && clock.tick % lifecycle.verifyEveryTicks === 0) {
    let batch = 0;
    for (const [id, claim] of newClaims) {
      if (batch >= lifecycle.batchSize) break;
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
      if (batch >= lifecycle.batchSize) break;
      if (claim.status !== "verifying") continue;

      // ADR-015 D3: causal denial checks (deterministic, chart-driven) and the
      // single outcome roll live in the lifecycle (Epic X M10.2).
      const encChart = Array.from(state.medicalCharts.values()).find(c => c.encounterId === claim.encounterId);
      const procCharges = Array.from(newCharges.values()).filter(c =>
        c.encounterId === claim.encounterId &&
        (c.category === "surgery" || c.category === "dialysis" || c.category === "radiotherapy"));
      const outcome = lifecycle.verify({
        claimId: claim.id,
        encounterId: claim.encounterId,
        patientId: claim.patientId,
        payerType: claim.payer as PayerType,
        tick: clock.tick,
        totalCharges: claim.totalCharges,
        patientPrimaryDxCode: null,
        chartDiagnoses: encChart?.diagnoses.map(d => ({ code: d.code, type: d.type })) ?? [],
        chartProcedureCount: encChart?.procedures?.length ?? 0,
        billedProcedureChargeCount: procCharges.length,
        chartCoded: encChart?.status === "coded",
        encounterDurationTicks: 0,
        existingDenialCode: claim.denialReason,
        coveredAmount: claim.coveredAmount,
      }, () => clock.rng());
      const newStatus: InsuranceClaim["status"] = outcome.status;
      const denialReason = (outcome.denial?.code ?? null) as ClaimDenialReason;

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
