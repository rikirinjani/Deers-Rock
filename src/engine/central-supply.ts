import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { InventoryItem, StockTransaction } from "../patient/schema.js";

const CATALOG: { code: string; name: string; category: InventoryItem["category"]; unit: string; min: number; max: number }[] = [
  // Medications (central pharmacy serves all wards/ED) — 93 drugs
  // ── Existing 22 ───────────────────────────────────────────────
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
  // ── New 23–50 ─────────────────────────────────────────────────
  { code: "MED-LOS", name: "Losartan 50mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-HCT", name: "Hydrochlorothiazide 25mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-NIF", name: "Nifedipine 10mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-LAB", name: "Labetalol 100mg", category: "medication", unit: "vial", min: 100, max: 1000 },
  { code: "MED-ISO", name: "Isosorbide dinitrate 5mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-GLP", name: "Glipizide 5mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-PIO", name: "Pioglitazone 30mg", category: "medication", unit: "tab", min: 100, max: 1000 },
  { code: "MED-CAN", name: "Canagliflozin 100mg", category: "medication", unit: "tab", min: 100, max: 1000 },
  { code: "MED-DIA2", name: "Sitagliptin 100mg", category: "medication", unit: "tab", min: 100, max: 1000 },
  { code: "MED-PCA", name: "Insulin NPH 40U", category: "medication", unit: "vial", min: 50, max: 500 },
  { code: "MED-DOX", name: "Doxycycline 100mg", category: "medication", unit: "cap", min: 200, max: 2000 },
  { code: "MED-CLI", name: "Clarithromycin 250mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-TIN", name: "Tinidazole 500mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-CPM", name: "Cefixime 200mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-MEM", name: "Meropenem 500mg", category: "medication", unit: "vial", min: 50, max: 500 },
  { code: "MED-VAN", name: "Vancomycin 500mg", category: "medication", unit: "vial", min: 50, max: 500 },
  { code: "MED-AMG", name: "Amikacin 250mg", category: "medication", unit: "vial", min: 50, max: 500 },
  { code: "MED-ACT", name: "Acyclovir 400mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-TDF", name: "Tenofovir 300mg", category: "medication", unit: "tab", min: 100, max: 1000 },
  { code: "MED-3TC", name: "Lamivudine 150mg", category: "medication", unit: "tab", min: 100, max: 1000 },
  { code: "MED-FLC", name: "Fluconazole 200mg", category: "medication", unit: "cap", min: 100, max: 1000 },
  { code: "MED-WAF", name: "Warfarin 5mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-RIV", name: "Rivaroxaban 20mg", category: "medication", unit: "tab", min: 100, max: 1000 },
  { code: "MED-CLO", name: "Clopidogrel 75mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-SIM", name: "Simvastatin 20mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-ROS", name: "Rosuvastatin 10mg", category: "medication", unit: "tab", min: 100, max: 1000 },
  { code: "MED-IBU", name: "Ibuprofen 400mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-NEC", name: "Diclofenac 50mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-TRM", name: "Tramadol 50mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-PHT", name: "Phenytoin 100mg", category: "medication", unit: "cap", min: 100, max: 1000 },
  { code: "MED-VAL", name: "Valproate 200mg", category: "medication", unit: "tab", min: 100, max: 1000 },
  { code: "MED-LEV", name: "Levetiracetam 500mg", category: "medication", unit: "tab", min: 100, max: 1000 },
  { code: "MED-OLA", name: "Olanzapine 5mg", category: "medication", unit: "tab", min: 100, max: 1000 },
  { code: "MED-HAL", name: "Haloperidol 5mg", category: "medication", unit: "vial", min: 50, max: 500 },
  { code: "MED-SER", name: "Sertraline 50mg", category: "medication", unit: "tab", min: 100, max: 1000 },
  { code: "MED-ESC", name: "Escitalopram 10mg", category: "medication", unit: "tab", min: 100, max: 1000 },
  { code: "MED-PRED", name: "Prednisone 5mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-DEX", name: "Dexamethasone 4mg", category: "medication", unit: "vial", min: 100, max: 1000 },
  { code: "MED-HYD", name: "Hydrocortisone 100mg", category: "medication", unit: "vial", min: 50, max: 500 },
  { code: "MED-IPR", name: "Ipratropium bromide 20mcg", category: "medication", unit: "puff", min: 50, max: 500 },
  { code: "MED-PNT", name: "Pantoprazole 40mg", category: "medication", unit: "vial", min: 100, max: 1000 },
  { code: "MED-RAN", name: "Ranitidine 100mg", category: "medication", unit: "vial", min: 100, max: 1000 },
  { code: "MED-MET2", name: "Metoclopramide 10mg", category: "medication", unit: "vial", min: 100, max: 1000 },
  { code: "MED-CA", name: "Calcium gluconate 1g", category: "medication", unit: "vial", min: 100, max: 1000 },
  { code: "MED-NS", name: "NaCl 0.9% 500ml", category: "medication", unit: "bag", min: 100, max: 1000 },
  { code: "MED-ART", name: "Artemether-lumefantrine 6-tab", category: "medication", unit: "tab", min: 100, max: 1000 },
  { code: "MED-PRQ", name: "Primaquine 15mg", category: "medication", unit: "tab", min: 100, max: 1000 },
  { code: "MED-H", name: "Isoniazid 100mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-R", name: "Rifampicin 150mg", category: "medication", unit: "cap", min: 200, max: 2000 },
  { code: "MED-Z", name: "Pyrazinamide 500mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-E", name: "Ethambutol 400mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  // ── ADR-011: New drugs for protocol coverage ───────────────────
  { code: "MED-AZM", name: "Azithromycin 250mg", category: "medication", unit: "tab", min: 100, max: 1000 },
  { code: "MED-PCN", name: "Penicillin G 1MU", category: "medication", unit: "vial", min: 100, max: 1000 },
  { code: "MED-DAP", name: "Dapsone 100mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-VALA", name: "Valacyclovir 500mg", category: "medication", unit: "tab", min: 100, max: 1000 },
  { code: "MED-LVT", name: "Levothyroxine 100mcg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-PTU", name: "Propylthiouracil 100mg", category: "medication", unit: "tab", min: 100, max: 1000 },
  { code: "MED-KET", name: "Ketoconazole 200mg", category: "medication", unit: "tab", min: 100, max: 1000 },
  { code: "MED-METO", name: "Metoprolol 50mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-NIM", name: "Nimodipine 60mg", category: "medication", unit: "tab", min: 100, max: 1000 },
  { code: "MED-PRA", name: "Prazosin 1mg", category: "medication", unit: "tab", min: 200, max: 2000 },
  { code: "MED-MAG", name: "Magnesium sulfate 1g", category: "medication", unit: "vial", min: 100, max: 1000 },
  { code: "MED-DON", name: "Donepezil 10mg", category: "medication", unit: "tab", min: 100, max: 1000 },
  { code: "MED-MPH", name: "Methylphenidate 10mg", category: "medication", unit: "tab", min: 100, max: 1000 },
  { code: "MED-SUM", name: "Sumatriptan 50mg", category: "medication", unit: "tab", min: 100, max: 1000 },
  { code: "MED-BET", name: "Betahistine 16mg", category: "medication", unit: "tab", min: 100, max: 1000 },
  { code: "MED-MOR5", name: "Morphine 5mg", category: "medication", unit: "vial", min: 50, max: 500 },
  { code: "MED-NAC", name: "N-acetylcysteine 600mg", category: "medication", unit: "tab", min: 100, max: 1000 },
  { code: "MED-TOB", name: "Tobramycin eye drops", category: "medication", unit: "drop", min: 50, max: 500 },
  { code: "MED-PREDN", name: "Prednisolone eye drops", category: "medication", unit: "drop", min: 50, max: 500 },
  { code: "MED-FOL", name: "Folic acid 1mg", category: "medication", unit: "tab", min: 500, max: 5000 },
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
