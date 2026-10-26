/**
 * Simulation run control (Epic V M5.2): pause/resume and tick speed for the
 * wall-clock loop that drives `step()`. Before this, the dashboard's pause and
 * speed buttons only changed how often the browser polled; the world kept
 * stepping. Speed changes the wall-clock period between ticks only — one tick
 * still advances hospital time by tickIntervalMs * speedMultiplier, so replay
 * and determinism are unaffected.
 */

export const SIM_SPEEDS = [1, 2, 5] as const;
export type SimSpeed = (typeof SIM_SPEEDS)[number];

export interface SimStatus {
  paused: boolean;
  speed: SimSpeed;
  /** Base wall-clock ms between ticks at 1x. */
  baseTickMs: number;
  /** Effective wall-clock ms between ticks (baseTickMs / speed). */
  tickMs: number;
  tick: number;
}

export type SimEvent = { kind: "tick" | "state"; status: SimStatus };

export interface SimControl {
  status(): SimStatus;
  pause(): void;
  resume(): void;
  /** Returns false (and changes nothing) for a speed outside SIM_SPEEDS. */
  setSpeed(speed: number): boolean;
  subscribe(fn: (ev: SimEvent) => void): () => void;
  stop(): void;
}

export function createSimControl(tickOnce: () => number, baseTickMs: number): SimControl {
  let paused = false;
  let speed: SimSpeed = 1;
  let tick = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  const subs = new Set<(ev: SimEvent) => void>();

  const status = (): SimStatus => ({
    paused, speed, baseTickMs, tickMs: Math.max(1, Math.round(baseTickMs / speed)), tick,
  });
  const emit = (kind: SimEvent["kind"]) => {
    const ev = { kind, status: status() };
    for (const fn of subs) {
      try { fn(ev); } catch { /* a failing subscriber must not stop the loop */ }
    }
  };
  const arm = () => {
    if (timer) clearInterval(timer);
    timer = null;
    if (paused) return;
    timer = setInterval(() => { tick = tickOnce(); emit("tick"); }, status().tickMs);
  };

  arm();
  return {
    status,
    pause() { if (!paused) { paused = true; arm(); emit("state"); } },
    resume() { if (paused) { paused = false; arm(); emit("state"); } },
    setSpeed(s: number) {
      if (!(SIM_SPEEDS as readonly number[]).includes(s)) return false;
      speed = s as SimSpeed; arm(); emit("state"); return true;
    },
    subscribe(fn) { subs.add(fn); return () => { subs.delete(fn); }; },
    stop() { if (timer) clearInterval(timer); timer = null; subs.clear(); },
  };
}
