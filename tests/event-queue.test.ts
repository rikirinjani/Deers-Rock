import { describe, it, expect } from "vitest";
import { EventQueue } from "../src/engine/event-queue.js";

describe("EventQueue", () => {
  it("schedules and returns due events", () => {
    const q = new EventQueue();
    q.schedule("test", 5, { foo: "bar" });
    expect(q.pending()).toBe(1);
    const due = q.dueEvents(5);
    expect(due).toHaveLength(1);
    expect(due[0]!.type).toBe("test");
    expect(due[0]!.data).toEqual({ foo: "bar" });
    expect(q.pending()).toBe(0);
  });

  it("does not return events not yet due", () => {
    const q = new EventQueue();
    q.schedule("later", 10);
    const due = q.dueEvents(5);
    expect(due).toHaveLength(0);
    expect(q.pending()).toBe(1);
  });
});
