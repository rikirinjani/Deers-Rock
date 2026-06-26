import { createClock, tick, type Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import { createState, type HospitalState } from "./state-store.js";
import { admissionHandler, dischargeHandler, newPatientHandler, vitalsUpdateHandler } from "./markov.js";
import { generatePatientPool } from "../patient/generator.js";

export interface World {
  clock: Clock;
  state: HospitalState;
  queue: EventQueue;
  handlers: ((state: HospitalState, clock: Clock, queue: EventQueue) => HospitalState)[];
}

export function createWorld(patientCount: number = 50): World {
  const patients = generatePatientPool(patientCount);
  return {
    clock: createClock(60),
    state: createState(patients),
    queue: new EventQueue(),
    handlers: [
      admissionHandler,
      newPatientHandler,
      vitalsUpdateHandler,
    ],
  };
}

export function step(world: World): World {
  const newClock = tick(world.clock);

  const dueEvents = world.queue.dueEvents(newClock.tick);
  let state = world.state;
  for (const evt of dueEvents) {
    if (evt.type === "discharge") {
      state = dischargeHandler(state, newClock, world.queue);
    }
  }

  for (const handler of world.handlers) {
    state = handler(state, newClock, world.queue);
  }

  if (newClock.tick % 5 === 0) {
    world.queue.schedule("admission", newClock.tick + 3, {});
  }

  return {
    ...world,
    clock: newClock,
    state,
  };
}

export function runWorld(world: World, steps: number): World {
  let w = world;
  for (let i = 0; i < steps; i++) {
    w = step(w);
  }
  return w;
}
