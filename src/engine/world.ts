import { createClock, tick, type Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import { createState, type HospitalState } from "./state-store.js";
import { admissionHandler, dischargeHandler, newPatientHandler, vitalsUpdateHandler } from "./markov.js";
import { generatePatientPool } from "../patient/generator.js";
import { labHandler, labResultHandler } from "./lab.js";
import { pharmacyHandler, medAdminHandler } from "./pharmacy.js";
import { nursingHandler } from "./nursing.js";
import { physicianHandler, orderCompleteHandler } from "./physician.js";
import { radiologyHandler, radResultHandler } from "./radiology.js";
import { emergencyHandler, edDischargeHandler } from "./emergency.js";
import { surgeryHandler, surgeryResultHandler } from "./surgery.js";
import { respiratoryHandler } from "./respiratory.js";
import { dietaryHandler } from "./dietary.js";
import { socialWorkHandler } from "./social-work.js";
import { centralSupplyHandler } from "./central-supply.js";
import { medicalRecordsHandler } from "./medical-records.js";
import { billingHandler, cashierHandler } from "./finance.js";

export interface World {
  clock: Clock;
  state: HospitalState;
  queue: EventQueue;
  handlers: ((state: HospitalState, clock: Clock, queue: EventQueue) => HospitalState)[];
}

export function createWorld(patientCount: number = 100): World {
  const patients = generatePatientPool(patientCount);
  return {
    clock: createClock(60),
    state: createState(patients),
    queue: new EventQueue(),
    handlers: [
      admissionHandler,
      newPatientHandler,
      emergencyHandler,
      labHandler,
      pharmacyHandler,
      nursingHandler,
      physicianHandler,
      radiologyHandler,
      surgeryHandler,
      respiratoryHandler,
      dietaryHandler,
      socialWorkHandler,
      centralSupplyHandler,
      medicalRecordsHandler,
      billingHandler,
      cashierHandler,
      vitalsUpdateHandler,
    ],
  };
}

export function step(world: World): World {
  const newClock = tick(world.clock);
  const dueEvents = world.queue.dueEvents(newClock.tick);
  let state = world.state;

  for (const evt of dueEvents) {
    switch (evt.type) {
      case "discharge": state = dischargeHandler(state, newClock, world.queue); break;
      case "lab_result": state = labResultHandler(state, newClock, world.queue); break;
      case "rad_result": state = radResultHandler(state, newClock, world.queue); break;
      case "ed_discharge": state = edDischargeHandler(state, newClock, world.queue); break;
      case "surgery_done": state = surgeryResultHandler(state, newClock, world.queue); break;
    }
  }

  for (const handler of world.handlers) {
    state = handler(state, newClock, world.queue);
  }

  state = medAdminHandler(state, newClock, world.queue);
  state = orderCompleteHandler(state, newClock, world.queue);

  if (newClock.tick % 5 === 0) {
    world.queue.schedule("admission", newClock.tick + 3, {});
  }

  return { ...world, clock: newClock, state };
}

export function runWorld(world: World, steps: number): World {
  let w = world;
  for (let i = 0; i < steps; i++) w = step(w);
  return w;
}
