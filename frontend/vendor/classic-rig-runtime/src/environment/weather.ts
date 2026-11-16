/** Погода (эталон: Fi, RT, VT — ветер сглаживается к цели пресета или ручному значению). */
import type { WeatherPresetId, WeatherState } from "../types";
import { WEATHER_PRESETS, WEATHER_SEASON_FALLBACK } from "../reference/environment-reference";
import { WIND_LIMIT } from "../reference/constants";

export { WEATHER_PRESETS, WIND_LIMIT };

export function windTarget(w: WeatherState): number {
  return w.windOverride ?? WEATHER_PRESETS[w.preset].wind;
}

/** VT: Q.wind = lerp(Q.wind, target, 1 − exp(−dt · 1.1)) */
export function stepWind(w: WeatherState, dt: number): void {
  const k = 1 - Math.exp(-dt * 1.1);
  w.wind += (windTarget(w) - w.wind) * k;
}

/** Vf: если пресет не подходит сезону — замена (дождь ↔ снег, ливень ↔ метель) */
export function fitPresetToSeason(w: WeatherState): void {
  if (!WEATHER_PRESETS[w.preset].seasons.includes(w.season)) w.preset = (WEATHER_SEASON_FALLBACK[w.preset] ?? "clear") as WeatherPresetId;
}

export const workAtHeightBanned = (w: WeatherState): boolean => w.wind >= WIND_LIMIT;
