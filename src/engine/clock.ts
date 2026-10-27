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

/**
 * ADR-008 sub-streams: a deterministic rng for one (world seed, tick, stream)
 * triple. Each handler draws from its own stream, so a handler whose draw
 * count depends on state (queue length, capacity, health mix) can no longer
 * shift the draws of handlers that run after it. Because the stream depends
 * only on (seed, tick, stream) and not on prior draws, a world resumed at
 * tick N replays the same draws as an uninterrupted run.
 */
export function subStreamRng(seed: number, tickN: number, stream: number): () => number {
  let h = (seed ^ Math.imul(tickN + 1, 0x9E3779B1) ^ Math.imul(stream + 1, 0x85EBCA77)) | 0;
  // murmur3 fmix32 so neighbouring (tick, stream) pairs give unrelated seeds
  h ^= h >>> 16; h = Math.imul(h, 0x85EBCA6B);
  h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35);
  h ^= h >>> 16;
  return createRng(h).next;
}

/** Stable stream id from a name (djb2), so reordering handlers keeps streams. */
export function streamId(name: string): number {
  let h = 5381;
  for (let i = 0; i < name.length; i++) h = (Math.imul(h, 33) ^ name.charCodeAt(i)) | 0;
  return h >>> 0;
}

/** The clock a handler sees: same time fields, rng replaced by its sub-stream. */
export function withSubStream(clock: Clock, name: string): Clock {
  return { ...clock, rng: subStreamRng(clock.rngSeed, clock.tick, streamId(name)) };
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
