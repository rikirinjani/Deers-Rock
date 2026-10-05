import { describe, it, expect } from "vitest";
import { createClock } from "../src/engine/clock.js";
import { EventQueue } from "../src/engine/event-queue.js";
import { createState } from "../src/engine/state-store.js";
import { generatePatientPool } from "../src/patient/generator.js";
import { centralSupplyInit, centralSupplyHandler, dispenseItem, getStock } from "../src/engine/central-supply.js";

describe("Central Supply", () => {
  it("initializes 181 inventory items with stock between min and max", () => {
    const inv = centralSupplyInit();
    expect(inv.size).toBe(181);
    for (const item of inv.values()) {
      expect(item.stock).toBeGreaterThanOrEqual(item.minStock);
      expect(item.stock).toBeLessThanOrEqual(item.maxStock);
    }
  });

  it("has all expected item codes", () => {
    const inv = centralSupplyInit();
    const codes = ["MED-ACE", "MED-MET", "MED-ATR", "MED-OMP", "MED-LVF", "MED-PRC", "MED-HEP", "MED-SAL", "MED-FUR", "MED-DIA", "LAB-CBC", "LAB-CHEM", "RAD-CONTRAST", "RAD-FILM", "SUR-GLOVES", "SUR-SUTURE", "O2", "CON-IV"];
    for (const c of codes) expect(inv.has(c)).toBe(true);
  });

  it("dispenseItem reduces stock and creates transaction", () => {
    const patients = generatePatientPool(1);
    let state = createState(patients);
    const clock = createClock(60);
    clock.tick = 5;

    const before = getStock(state, "MED-PRC");
    state = dispenseItem(state, "MED-PRC", 10, clock, "ENC-001");
    expect(getStock(state, "MED-PRC")).toBe(before - 10);
    expect(state.stockTransactions.size).toBe(1);
    const tx = Array.from(state.stockTransactions.values())[0]!;
    expect(tx.type).toBe("dispense");
    expect(tx.itemCode).toBe("MED-PRC");
    expect(tx.quantity).toBe(10);
  });

  it("dispenseItem returns unchanged state when stock insufficient", () => {
    const patients = generatePatientPool(1);
    let state = createState(patients);
    const origTxns = state.stockTransactions.size;
    const stock = getStock(state, "LAB-CBC"); // ~55
    state = dispenseItem(state, "LAB-CBC", 99999, createClock(60), "ENC-001");
    expect(getStock(state, "LAB-CBC")).toBe(stock);
    expect(state.stockTransactions.size).toBe(origTxns);
  });

  it("auto-restocks items below min every 50 ticks", () => {
    const patients = generatePatientPool(1);
    let state = createState(patients);
    state = dispenseItem(state, "LAB-CBC", 99999, createClock(60), "ENC-001");
    state.inventory.set("LAB-CBC", { ...state.inventory.get("LAB-CBC")!, stock: 2 });

    const clock = createClock(60);
    clock.tick = 50;
    state = centralSupplyHandler(state, clock, new EventQueue());
    const item = state.inventory.get("LAB-CBC")!;
    expect(item.stock).toBe(item.maxStock);
    expect(Array.from(state.stockTransactions.values()).some(t => t.type === "restock")).toBe(true);
  });

  it("does not restock on non-50 ticks", () => {
    const patients = generatePatientPool(1);
    let state = createState(patients);
    state.inventory.set("MED-PRC", { ...state.inventory.get("MED-PRC")!, stock: 1 });
    const before = state.inventory.get("MED-PRC")!.stock;
    const clock = createClock(60);
    clock.tick = 51;
    state = centralSupplyHandler(state, clock, new EventQueue());
    expect(state.inventory.get("MED-PRC")!.stock).toBe(before);
  });
});
