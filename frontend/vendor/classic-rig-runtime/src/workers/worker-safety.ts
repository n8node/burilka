/**
 * Безопасность персонала: уровень (земля/пол/балкон), красная зона у устья, запрет нахождения под буровой.
 * Красная зона — как счётчик «Людей у устья» эталона: на полу (|y − O| < 0.6) и ближе 3.4 м к оси скважины.
 */
import type { Vec3, WorkerLevel } from "../types";
import { FLOOR_LEVEL_TOLERANCE, FLOOR_Y, RED_ZONE_RADIUS, SUBSTRUCTURE_HALF } from "../reference/constants";

export function levelOf(pos: Vec3): WorkerLevel {
  if (pos[1] > 20) return "derrick";
  if (pos[1] > FLOOR_Y / 2) return "rig_floor";
  return "ground";
}

export function inRedZone(pos: Vec3, rigX: number): boolean {
  return Math.abs(pos[1] - FLOOR_Y) < FLOOR_LEVEL_TOLERANCE && Math.hypot(pos[0] - rigX, pos[2]) < RED_ZONE_RADIUS;
}

/** Под вышечным блоком (на земле, в плане основания) — люди находиться не должны. */
export function underSubstructure(pos: Vec3, rigX: number): boolean {
  return pos[1] < 1 && Math.abs(pos[0] - rigX) < SUBSTRUCTURE_HALF && Math.abs(pos[2]) < SUBSTRUCTURE_HALF;
}

/** Зона под СВП: опасна, если СВП опускается ниже 4 м над полом. */
export function inTopdriveCollisionZone(pos: Vec3, rigX: number): boolean {
  return Math.abs(pos[1] - FLOOR_Y) < FLOOR_LEVEL_TOLERANCE && Math.hypot(pos[0] - rigX, pos[2]) < 1.2;
}
