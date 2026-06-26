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

export function centralSupplyHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const newInventory = new Map(state.inventory);
  const newTransactions = new Map(state.stockTransactions);

  // Auto-restock every 20 ticks for items below min
  if (clock.tick > 0 && clock.tick % 20 === 0) {
    for (const [code, item] of newInventory) {
      if (item.stock < item.minStock) {
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
    id: `DISP-${clock.tick}-${itemCode}-${Math.floor(Math.random() * 1000)}`,
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
