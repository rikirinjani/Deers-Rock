export interface Clock {
  tick: number;
  hospitalTimeMs: number;
  tickIntervalMs: number;
  speedMultiplier: number;
  running: boolean;
}

export function createClock(speedMultiplier: number = 60): Clock {
  return {
    tick: 0,
    hospitalTimeMs: 0,
    tickIntervalMs: 1000,
    speedMultiplier,
    running: false,
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

export function formatHospitalTime(clock: Clock): string {
  const totalMinutes = Math.floor(clock.hospitalTimeMs / 60000);
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const days = Math.floor(totalMinutes / 1440);
  return days > 0
    ? `Day ${days} ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
    : `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
