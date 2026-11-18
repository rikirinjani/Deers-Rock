import { describe, it, expect } from "vitest";
import { createState, BUILDING_LAYOUT, type HospitalLayout } from "../src/engine/state-store.js";
import { createWorld } from "../src/engine/world.js";

const count = (beds: Map<string, { ward: string; roomClass: string }>, ward: string, rc: string) =>
  [...beds.values()].filter((b) => b.ward === ward && b.roomClass === rc).length;

describe("Epic XII 12.0 layout input", () => {
  it("honours a custom layout (counts by ward and class)", () => {
    const layout: HospitalLayout = {
      wards: [
        { ward: "General K2", roomClass: "kelas-2", specialties: "general", beds: 10, bedsPerRoom: 2 },
        { ward: "General K3", roomClass: "kelas-3", specialties: "general", beds: 20, bedsPerRoom: 4 },
        { ward: "ICU", roomClass: "icu", specialties: ["Critical Care"], beds: 4 },
      ],
    };
    const w = createWorld(5, undefined, 42, layout);
    expect(w.state.beds.size).toBe(34);
    expect(count(w.state.beds, "General K2", "kelas-2")).toBe(10);
    expect(count(w.state.beds, "General K3", "kelas-3")).toBe(20);
    expect(count(w.state.beds, "ICU", "icu")).toBe(4);
    expect(w.state.wardCapacity).toEqual({ "General K2": 10, "General K3": 20, ICU: 4 });
    expect(w.state._layout).toBe(layout);
  });

  it("class-neutral order interleaves classes inside a ward; as-listed does not", () => {
    const wards: HospitalLayout["wards"] = [
      { ward: "W", roomClass: "kelas-1", specialties: "general", beds: 2 },
      { ward: "W", roomClass: "kelas-3", specialties: "general", beds: 4 },
    ];
    const order = (l: HospitalLayout) => [...createState([], {}, undefined, l).beds.values()].map((b) => b.roomClass);
    expect(order({ wards })).toEqual(["kelas-1", "kelas-1", "kelas-3", "kelas-3", "kelas-3", "kelas-3"]);
    expect(order({ wards, bedOrder: "class-neutral" })).toEqual(["kelas-1", "kelas-3", "kelas-1", "kelas-3", "kelas-3", "kelas-3"]);
  });

  it("rejects a bad bed count", () => {
    expect(() => createState([], {}, undefined, { wards: [{ ward: "W", roomClass: "kelas-3", specialties: "general", beds: -1 }] })).toThrow();
  });

  it("default layout is unchanged: same beds, ids and order as BUILDING_LAYOUT; no _layout key", () => {
    const expected: [string, string, string, string][] = [];
    let g = 1;
    for (const b of BUILDING_LAYOUT) for (const w of b.wards)
      for (const [rc, n] of Object.entries(w.roomClasses))
        for (let i = 0; i < (n as number); i++) {
          expected.push([`${w.name.replace(/\s+/g, "-")}-${String(g).padStart(2, "0")}`, w.name, b.name, rc]);
          g++;
        }
    const viaWorld = createWorld(5, undefined, 42).state;
    const viaState = createState([]);
    for (const s of [viaWorld, viaState]) {
      expect([...s.beds.values()].map((b) => [b.id, b.ward, b.building, b.roomClass])).toEqual(expected);
      expect("_layout" in s).toBe(false);
      expect(Object.keys(s.beds.values().next().value!).sort()).toEqual(["building", "id", "patientId", "roomClass", "ward"]);
    }
    expect(viaWorld.beds.size).toBe(expected.length);
  });
});
