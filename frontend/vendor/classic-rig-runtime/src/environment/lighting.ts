/**
 * Освещение: положение солнца и фаза суток (эталон kl(), s0()). Чистые вычисления для renderer'а.
 */
export type SunPosition = { elevation: number; azimuth: number; hourAngle: number };

export function sunPosition(utcMs: number, lat: number, lon: number): SunPosition {
  const RAD = Math.PI / 180;
  const n = utcMs / 864e5 + 2440587.5 - 2451545;
  const g = (357.529 + 0.98560028 * n) * RAD;
  const L = (280.459 + 0.98564736 * n + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const e = (23.439 - 3.6e-7 * n) * RAD;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  let H = (((((18.697374558 + 24.06570982441908 * n) % 24) + 24) % 24) * 15 + lon) * RAD - ra;
  H = Math.atan2(Math.sin(H), Math.cos(H));
  const f = lat * RAD;
  const el = Math.asin(Math.sin(f) * Math.sin(dec) + Math.cos(f) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(-Math.sin(H), Math.tan(dec) * Math.cos(f) - Math.sin(f) * Math.cos(H));
  return { elevation: el / RAD, azimuth: ((az / RAD) + 360) % 360, hourAngle: H };
}

export type DayPhase = "day" | "morning" | "dusk" | "night";

/** s0(): день > 8°, сумерки/утро > −6°, иначе ночь */
export function dayPhase(sun: SunPosition): DayPhase {
  if (sun.elevation > 8) return "day";
  if (sun.elevation > -6) return sun.hourAngle < 0 ? "morning" : "dusk";
  return "night";
}

/** Доля дневного света 0..1 (для интенсивности ламп) */
export const daylight = (sun: SunPosition): number => Math.max(0, Math.min(1, (sun.elevation + 6) / 14));
