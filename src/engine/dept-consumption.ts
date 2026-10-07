/**
 * Department-Level Supply Consumption Tracking — Epic VI M6.3 (ADR-017)
 *
 * Tracks which department consumed which supplies, enabling per-department
 * cost attribution and reorder alerts.
 */
import type { HospitalState } from "./state-store.js";

/**
 * Maximum entries per department consumption record (bounded).
 */
const MAX_CONSUMPTION_ENTRIES = 1000;

export interface DeptConsumption {
  department: string;
  itemCode: string;
  quantity: number;
  tick: number;
}

/**
 * Record a supply consumption by a department.
 */
export function recordConsumption(
  state: HospitalState,
  department: string,
  itemCode: string,
  quantity: number,
  tick: number
): void {
  const consumption = getDeptConsumption(state);
  const key = `${department}:${itemCode}`;
  const existing = consumption.get(key);
  if (existing) {
    existing.quantity += quantity;
    existing.tick = tick;
  } else {
    consumption.set(key, { department, itemCode, quantity, tick });
  }
  // Bounded: evict oldest if over limit
  while (consumption.size > MAX_CONSUMPTION_ENTRIES) {
    const firstKey = consumption.keys().next().value;
    if (firstKey) consumption.delete(firstKey);
  }
}

/**
 * Get all consumption records for a department.
 */
export function getDeptConsumption(state: HospitalState): Map<string, DeptConsumption> {
  return (state as unknown as { _deptConsumption?: Map<string, DeptConsumption> })._deptConsumption ?? new Map();
}

/**
 * Get total consumption by department.
 */
export function getConsumptionByDept(state: HospitalState): Record<string, number> {
  const consumption = getDeptConsumption(state);
  const byDept: Record<string, number> = {};
  for (const c of consumption.values()) {
    byDept[c.department] = (byDept[c.department] ?? 0) + c.quantity;
  }
  return byDept;
}

/**
 * Get consumption for a specific item across all departments.
 */
export function getConsumptionByItem(state: HospitalState, itemCode: string): Record<string, number> {
  const consumption = getDeptConsumption(state);
  const byDept: Record<string, number> = {};
  for (const c of consumption.values()) {
    if (c.itemCode === itemCode) {
      byDept[c.department] = (byDept[c.department] ?? 0) + c.quantity;
    }
  }
  return byDept;
}

/**
 * Check if any department stock is below threshold (reorder alert).
 * Returns list of alert messages.
 */
export function checkReorderAlerts(
  state: HospitalState,
  reorderThreshold: number = 10
): string[] {
  const alerts: string[] = [];
  const consumption = getDeptConsumption(state);
  for (const [key, c] of consumption) {
    if (c.quantity >= reorderThreshold) {
      alerts.push(`[${c.department}] ${c.itemCode}: ${c.quantity} units consumed — reorder threshold exceeded`);
    }
  }
  return alerts;
}

/**
 * Reset consumption tracker (for testing).
 */
export function resetConsumption(state: HospitalState): void {
  const consumption = getDeptConsumption(state);
  consumption.clear();
}
