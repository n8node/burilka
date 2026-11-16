/** Сезон (эталон PT): зима — ноябрь…март, а также октябрь при широте ≥ 58° и апрель при широте ≥ 60°. */
import type { SeasonId } from "../types";

export function autoSeason(month0: number, lat: number): SeasonId {
  return month0 >= 10 || month0 <= 2 || (month0 === 9 && lat >= 58) || (month0 === 3 && lat >= 60) ? "winter" : "summer";
}
