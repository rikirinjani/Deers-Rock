/**
 * Epic XII 12.4: a lightweight scenario world. SCENARIO PATH ONLY.
 *
 * The full handler stack slows down sharply over simulated days (measured on Kaggle:
 * about 27 s for day 1, 7 min for day 5, independent of layout and arrival rate, because
 * every handler walks a growing patient pool and encounter set). Layout money depends only on
 * the demand stream, routing, bed occupancy and discharge times, none of which use the
 * clinical handlers, so a scenario run keeps only `admissionHandler` (which hands over to
 * `scenarioDemandStep`). The queue still processes discharge events inside `step`, so beds are
 * freed exactly as in the full world. Clinical outputs (deaths, orders, vitals) do not exist
 * in this mode; nothing here uses them.
 *
 * No engine file is touched: it only replaces `world.handlers` on a normal world.
 */
import { createWorld, HANDLER_NAMES, type World } from "../engine/world.js";
import type { HospitalLayout } from "../engine/state-store.js";
import type { DemandConfig } from "../engine/scenario-demand.js";

export function createLiteScenarioWorld(seed: number, layout: HospitalLayout, demand: DemandConfig): World {
  const w = createWorld(5, undefined, seed, layout, demand);
  const i = HANDLER_NAMES.indexOf("admissionHandler");
  if (i < 0) throw new Error("admissionHandler not found in HANDLER_NAMES");
  return { ...w, handlers: [w.handlers[i]!] };
}
