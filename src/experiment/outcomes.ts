/**
 * Outcome metrics for multi-day baselines (2026-10-27).
 *
 * The E1 RunResult/CSV format is frozen (EXPERIMENT-FREEZE-2026-10-27), so
 * inpatient-outcome metrics live here, in a separate per-seed record. Since
 * inpatient stays last 3–7 days (e458f6f), these need a horizon of ≥ 10
 * simulated days to mean anything.
 */
import type { World } from "../engine/world.js";

const TICKS_PER_DAY = 1440;

export interface OutcomeMetrics {
  seed: number;
  ticks: number;
  simDays: number;
  /** Inpatient encounters (ENC-*) closed, alive or dead. */
  inpatientDischarges: number;
  /** Deaths (morgue records; deaths are rolled at inpatient discharge). */
  deaths: number;
  /** deaths / inpatientDischarges, percent. */
  inHospitalMortalityPct: number;
  /** Mean / median length of stay of closed inpatient encounters, days. */
  inpatientLosMeanDays: number;
  inpatientLosMedianDays: number;
  outcomes: { improved: number; deteriorated: number; deceased: number };
  deathsByIcd: Record<string, number>;
  edEncounters: number;
  outpatientEncounters: number;
  bedOccupancyEnd: number;
  totalBeds: number;
  workforce: { sickLeaveEpisodes: number; staffOnDutyEnd: number; staffTotal: number };
  referral: { letters: number; completed: number; returned: number; ambulanceDispatches: number; ambulanceChargedIdr: number };
  kontrol: { booked: number; completed: number; noShow: number };
  jasaRaharja: { incidents: number; claims: number; claimsWithIncident: number };
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

const round = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

export function outcomeMetrics(world: World, seed: number): OutcomeMetrics {
  const s = world.state;
  // Outcome records are append-only (one per closed encounter), unlike
  // encounters, which cleanup prunes.
  const inpatient = (s._outcomeRecords ?? []).filter(r => r.encounterId.startsWith("ENC-"));
  const los = inpatient.map(r => r.losTicks / TICKS_PER_DAY);
  const deathsByIcd: Record<string, number> = {};
  for (const m of s.morgue) deathsByIcd[m.icdCode] = (deathsByIcd[m.icdCode] ?? 0) + 1;
  const encs = Array.from(s.encounters.values());
  const agents = Array.from(s._agentState?.pool.agents.values() ?? []);
  const letters = Array.from(s._referralState?.letters.values() ?? []);
  const dispatches = Array.from(s._ambulanceState?.dispatches.values() ?? []);
  const appts = Array.from(s._appointmentState?.appointments.values() ?? []);
  const jrClaims = Array.from(s.insuranceClaims.values()).filter(c => c.payer === "Jasa Raharja");
  return {
    seed,
    ticks: world.clock.tick,
    simDays: round(world.clock.tick / TICKS_PER_DAY, 1),
    inpatientDischarges: inpatient.length,
    deaths: s.morgue.length,
    inHospitalMortalityPct: inpatient.length > 0 ? round((100 * s.morgue.length) / inpatient.length) : 0,
    inpatientLosMeanDays: los.length > 0 ? round(los.reduce((a, b) => a + b, 0) / los.length) : 0,
    inpatientLosMedianDays: round(median(los)),
    outcomes: {
      improved: inpatient.filter(r => r.outcome === "improved").length,
      deteriorated: inpatient.filter(r => r.outcome === "deteriorated").length,
      deceased: inpatient.filter(r => r.outcome === "deceased").length,
    },
    deathsByIcd,
    edEncounters: encs.filter(e => e.id.startsWith("ED-")).length,
    outpatientEncounters: encs.filter(e => e.id.startsWith("POLI-")).length,
    bedOccupancyEnd: Array.from(s.beds.values()).filter(b => b.patientId).length,
    totalBeds: s.beds.size,
    workforce: {
      sickLeaveEpisodes: s._sickLeaveState?.records.size ?? 0,
      staffOnDutyEnd: agents.filter(a => a.status.inShift).length,
      staffTotal: agents.length,
    },
    referral: {
      letters: letters.length,
      completed: letters.filter(l => l.status === "completed").length,
      returned: letters.filter(l => l.status === "returned").length,
      ambulanceDispatches: dispatches.length,
      ambulanceChargedIdr: dispatches.filter(d => d.chargeId).reduce((n, d) => n + d.costIdr, 0),
    },
    kontrol: {
      booked: appts.length,
      completed: appts.filter(a => a.status === "completed").length,
      noShow: appts.filter(a => a.status === "no_show").length,
    },
    jasaRaharja: {
      incidents: s._jrState?.incidents.size ?? 0,
      claims: jrClaims.length,
      claimsWithIncident: jrClaims.filter(c => c.incidentRef).length,
    },
  };
}
