/**
 * Per-tick outcome snapshots for time-series analysis.
 *
 * Lightweight snapshots captured every tick — bounded to last 1000 entries
 * to prevent unbounded growth. Exposed via GET /api/outcomes/snapshots.
 */
export interface OutcomeSnapshot {
  tick: number;
  patients: number;
  occupiedBeds: number;
  encounters: number;
  morgueCount: number;
  totalCharges: number;
  totalPaid: number;
}

const MAX_SNAPSHOTS = 1000;
const snapshots: OutcomeSnapshot[] = [];

/**
 * Capture a lightweight snapshot of the current hospital state.
 * O(1) over state size — only reads pre-computed sizes/counters.
 */
export function takeSnapshot(state: {
  patients: Map<string, unknown>;
  beds: Map<string, { patientId: string | null }>;
  encounters: Map<string, { status: string }>;
  morgue: unknown[];
  charges: Map<string, { amount: number; paid: boolean }>;
}, tick: number): OutcomeSnapshot {
  const occupiedBeds = Array.from(state.beds.values()).filter(b => b.patientId !== null).length;
  const totalCharges = Array.from(state.charges.values()).reduce((sum, c) => sum + (c.amount ?? 0), 0);
  const totalPaid = Array.from(state.charges.values())
    .filter(c => c.paid)
    .reduce((sum, c) => sum + (c.amount ?? 0), 0);

  const snap: OutcomeSnapshot = {
    tick,
    patients: state.patients.size,
    occupiedBeds,
    encounters: state.encounters.size,
    morgueCount: state.morgue.length,
    totalCharges,
    totalPaid,
  };

  snapshots.push(snap);
  if (snapshots.length > MAX_SNAPSHOTS) {
    snapshots.splice(0, snapshots.length - MAX_SNAPSHOTS);
  }

  return snap;
}

/**
 * Return all snapshots. Ordered oldest-first for time-series display.
 */
export function getSnapshots(): OutcomeSnapshot[] {
  return [...snapshots];
}

/**
 * Clear all snapshots (for testing).
 */
export function clearSnapshots(): void {
  snapshots.length = 0;
}
