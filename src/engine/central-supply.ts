import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { InventoryItem, StockTransaction } from "../patient/schema.js";

const CATALOG: { code: string; name: string; category: InventoryItem["category"]; unit: string; min: number; max: number }[] = [
  // Medications (central pharmacy serves all wards/ED)
  { code: "MED-ACE", name: "Enalapril 5mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-MET", name: "Metformin 500mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-ATR", name: "Atorvastatin 20mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-OMP", name: "Omeprazole 20mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-LVF", name: "Levofloxacin 500mg", category: "medication", unit: "vial", min: 100, max: 1000 },
  { code: "MED-PRC", name: "Paracetamol 500mg", category: "medication", unit: "tab", min: 500, max: 5000 },
  { code: "MED-HEP", name: "Enoxaparin 40mg", category: "medication", unit: "syringe", min: 100, max: 1000 },
  { code: "MED-SAL", name: "Salbutamol Inhaler", category: "medication", unit: "puff", min: 50, max: 500 },
  { code: "MED-FUR", name: "Furosemide 40mg", category: "medication", unit: "vial", min: 100, max: 1000 },
  { code: "MED-DIA", name: "Diazepam 5mg", category: "medication", unit: "tab", min: 50, max: 500 },
  { code: "MED-AMX", name: "Amoxicillin 500mg", category: "medication", unit: "cap", min: 200, max: 2000 },
  { code: "MED-CTR", name: "Ceftriaxone 1g", category: "medication", unit: "vial", min: 100, max: 1000 },
  { code: "MED-MTZ", name: "Metronidazole 500mg", category: "medication", unit: "vial", min: 100, max: 1000 },
  { code: "MED-CIP", name: "Ciprofloxacin 500mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-AML", name: "Amlodipine 5mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-BIS", name: "Bisoprolol 5mg", category: "medication", unit: "tab", min: 100, max: 1000 },
  { code: "MED-ASP", name: "Aspirin 80mg", category: "medication", unit: "tab", min: 500, max: 5000 },
  { code: "MED-INS", name: "Insulin Regular 10U", category: "medication", unit: "vial", min: 50, max: 500 },
  { code: "MED-OND", name: "Ondansetron 4mg", category: "medication", unit: "vial", min: 100, max: 1000 },
  { code: "MED-MOR", name: "Morphine 10mg", category: "medication", unit: "vial", min: 50, max: 500 },
  { code: "MED-KCL", name: "KCl 20mEq", category: "medication", unit: "vial", min: 100, max: 1000 },
  { code: "MED-RL", name: "Ringer's Lactate IV", category: "medication", unit: "bag", min: 100, max: 1000 },
  // Lab reagents
  { code: "LAB-CBC", name: "CBC Reagent Kit", category: "lab-reagent", unit: "kit", min: 10, max: 100 },
  { code: "LAB-CHEM", name: "Chemistry Reagent", category: "lab-reagent", unit: "kit", min: 10, max: 100 },
  // Radiology
  { code: "RAD-CONTRAST", name: "IV Contrast (Iohexol)", category: "contrast", unit: "dose", min: 20, max: 200 },
  { code: "RAD-FILM", name: "X-ray Film", category: "consumable", unit: "sheet", min: 100, max: 1000 },
  // Surgical
  { code: "SUR-GLOVES", name: "Surgical Gloves (Sterile)", category: "surgical", unit: "pair", min: 200, max: 2000 },
  { code: "SUR-SUTURE", name: "Suture Kit", category: "surgical", unit: "kit", min: 50, max: 500 },
  // General
  { code: "O2", name: "Medical Oxygen", category: "oxygen", unit: "L", min: 5000, max: 50000 },
  { code: "CON-IV", name: "IV Tubing Set", category: "consumable", unit: "set", min: 100, max: 1000 },
];

export function centralSupplyInit(): Map<string, InventoryItem> {
  const items = new Map<string, InventoryItem>();
  for (const c of CATALOG) {
    items.set(c.code, {
      itemCode: c.code,
      itemName: c.name,
      category: c.category,
      unit: c.unit,
      stock: Math.floor((c.min + c.max) / 2),
      minStock: c.min,
      maxStock: c.max,
      departmentId: "central-pharmacy",
    });
  }
  return items;
}

/**
 * Phase E: adaptive restock threshold driven by macro supply-chain pressure.
 *
 * Semantic contract:
 *   supplyChainPressure = 0.0 → restock at normal minStock (baseline behavior)
 *   supplyChainPressure = 0.5 → restock at midpoint (more aggressive)
 *   supplyChainPressure = 1.0 → restock at maxStock (always restock)
 *
 * Formula: effectiveMin = minStock + (maxStock − minStock) × supplyChainPressure
 *
 * Causal direction (defensible from adapter semantics):
 *   EXTREME_WEATHER → supplyChainPressure = 0.4 → earlier restocking
 *   WAR_START → supplyChainPressure = 0.5 → earlier restocking
 *   WAR_CASUALTIES → supplyChainPressure += 0.1 → progressively earlier
 *
 * This is a supply-chain RESILIENCE response: when external pressure is high,
 * the hospital restocks proactively to buffer against potential disruptions.
 * The existing restock cadence (every 50 ticks) is preserved; only the
 * trigger threshold changes.
 */
export function centralSupplyHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const newInventory = new Map(state.inventory);
  const newTransactions = new Map(state.stockTransactions);

  // Auto-restock every 50 ticks for items below effective minimum
  if (clock.tick > 0 && clock.tick % 50 === 0) {
    const pressure = state._supplyChainPressure ?? 0;
    for (const [code, item] of newInventory) {
      // Adaptive threshold: higher pressure → higher effective minimum → earlier restocking
      const effectiveMin = item.minStock + (item.maxStock - item.minStock) * pressure;
      if (item.stock < effectiveMin) {
        const restockQty = item.maxStock - item.stock;
        newInventory.set(code, { ...item, stock: item.maxStock });
        const tx: StockTransaction = {
          id: `RESTOCK-${clock.tick}-${code}`,
          itemCode: code,
          type: "restock",
          quantity: restockQty,
          timestamp: clock.hospitalTimeMs,
          departmentId: item.departmentId,
          referenceId: null,
        };
        newTransactions.set(tx.id, tx);
      }
    }
  }

  return { ...state, inventory: newInventory, stockTransactions: newTransactions };
}

export function dispenseItem(
  state: HospitalState,
  itemCode: string,
  quantity: number,
  clock: Clock,
  referenceId: string
): HospitalState {
  const newInventory = new Map(state.inventory);
  const item = newInventory.get(itemCode);
  if (!item || item.stock < quantity) return state;

  newInventory.set(itemCode, { ...item, stock: item.stock - quantity });

  const newTransactions = new Map(state.stockTransactions);
  const tx: StockTransaction = {
    id: `DISP-${clock.tick}-${itemCode}-${Math.floor(clock.rng() * 1000)}`,
    itemCode,
    type: "dispense",
    quantity,
    timestamp: clock.hospitalTimeMs,
    departmentId: item.departmentId,
    referenceId,
  };
  newTransactions.set(tx.id, tx);

  return { ...state, inventory: newInventory, stockTransactions: newTransactions };
}

export function getStock(state: HospitalState, itemCode: string): number {
  return state.inventory.get(itemCode)?.stock ?? 0;
}

/**
 * Phase D: deterministic supply-stress metric derived from ACTUAL simulated
 * inventory state. Pure function of state.inventory — no RNG, no wall clock.
 *
 * Semantics: mean NORMALIZED BUFFER DEPLETION across the supply catalog.
 *   per item: depletion = clamp01((maxStock - stock) / (maxStock - minStock))
 *   supplyStress = mean(depletion) over items with a positive buffer range
 *                 (min < max). 0.0 = every item at maximum stock;
 *                 1.0 = every item at its minimum stock level.
 * The initial state (stock = (min+max)/2 for every item) yields exactly 0.5.
 *
 * Dynamics (all existing DR behavior, unchanged): pharmacy/lab dispensing
 * drains stock (dispenseItem); centralSupplyHandler restocks any item below
 * min back to max every 50 ticks (runs at cadence 3). The metric therefore
 * oscillates deterministically with consumption and restocking.
 *
 * SCIENTIFIC BOUNDARY: this is a SEMANTIC operational proxy from simulated
 * state — NOT a clinically calibrated or logistics-validated measure.
 * Note: the Kronos-side adapter still hardcodes supplyStress = 0.3; wiring
 * this function into the sentinel output is Phase E work (Kronos repo).
 */
export function computeSupplyStress(state: HospitalState): number {
  const items = Array.from(state.inventory.values());
  if (items.length === 0) return 0;
  let total = 0;
  let counted = 0;
  for (const item of items) {
    const range = item.maxStock - item.minStock;
    if (range <= 0) continue; // degenerate entries excluded from the mean
    const depletion = Math.min(1, Math.max(0, (item.maxStock - item.stock) / range));
    total += depletion;
    counted++;
  }
  if (counted === 0) return 0;
  return total / counted;
}
