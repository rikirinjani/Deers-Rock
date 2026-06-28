export interface RngState {
  seed: number;
  next: () => number;
}

export function createRng(seed: number): RngState {
  let s = seed | 0;
  return {
    seed,
    next: (): number => {
      s |= 0;
      s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    },
  };
}

export interface Clock {
  tick: number;
  hospitalTimeMs: number;
  tickIntervalMs: number;
  speedMultiplier: number;
  running: boolean;
  rng: () => number;
  rngSeed: number;
}

export function createClock(speedMultiplier: number = 60, seed?: number): Clock {
  const s = seed ?? Date.now();
  const rng = createRng(s);
  return {
    tick: 0,
    hospitalTimeMs: 0,
    tickIntervalMs: 1000,
    speedMultiplier,
    running: false,
    rng: rng.next,
    rngSeed: rng.seed,
  };
}

export function tick(clock: Clock): Clock {
  const nextTick = clock.tick + 1;
  return {
    ...clock,
    tick: nextTick,
    hospitalTimeMs: nextTick * clock.tickIntervalMs * clock.speedMultiplier,
  };
}

export function cloneClockWithRng(clock: Clock, rngSeed: number): Clock {
  const rng = createRng(rngSeed);
  return { ...clock, rng: rng.next, rngSeed: rng.seed };
}

export function formatHospitalTime(clock: Clock): string {
  const totalMinutes = Math.floor(clock.hospitalTimeMs / 60000);
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const days = Math.floor(totalMinutes / 1440);
  return days > 0
    ? `Day ${days} ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
    : `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
