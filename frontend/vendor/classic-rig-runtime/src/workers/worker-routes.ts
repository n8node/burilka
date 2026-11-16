/**
 * Маршруты персонажей и правило «маршрут едет вместе с буровой» (эталон Ll()).
 */
import type { Vec3 } from "../types";
import {
  CLASSIC_WORKERS,
  FLOOR_TO_GROUND,
  KICK_MUSTER,
  PAD_TO_STAIRS,
  ROAD_JUNCTION,
  STAIRS_DOWN,
  STAIRS_FLIGHT,
  STAIRS_UP,
} from "../reference/workers-reference";

/** Ll(): точки площадки буровой (x ≥ −62) смещаются на rigX; городок и дорога — нет. */
export const routeOffset = (x: number, rigX: number): number => (x < -62 ? 0 : rigX);

export const withRigOffset = (p: Vec3, rigX: number): Vec3 => [p[0] + routeOffset(p[0], rigX), p[1], p[2]];

export type NamedRoute = { id: string; workerId?: string; points: Vec3[] };

/** Все маршруты классической бригады (для тестов, отладки и визуализации). */
export function allRoutes(): NamedRoute[] {
  const out: NamedRoute[] = [
    { id: "stairs_up", points: STAIRS_UP },
    { id: "stairs_down", points: STAIRS_DOWN },
    { id: "pad_to_stairs", points: PAD_TO_STAIRS },
    { id: "floor_to_ground", points: FLOOR_TO_GROUND },
  ];
  for (const w of CLASSIC_WORKERS) {
    let prev: Vec3 = w.start;
    for (const t of w.tasks ?? []) {
      if ("walk" in t) {
        out.push({ id: t.routeId, workerId: w.id, points: [prev, ...t.walk] });
        prev = t.walk[t.walk.length - 1];
      }
    }
  }
  for (const [id, m] of Object.entries(KICK_MUSTER)) if (m) out.push({ id: `kick_muster_${id}`, workerId: id, points: m.pts });
  return out;
}

export { ROAD_JUNCTION, STAIRS_FLIGHT };
