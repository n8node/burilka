/**
 * Модель траектории скважин куста (эталон: lh, lr()).
 * Профиль: вертикаль до KOP → дуга набора угла радиусом R → горизонтальный участок длиной h.
 */
import type { Vec3 } from "../types";
import { DEPTH_SCALE, TARGET_TVD, WELLS, type WellDefinition } from "../reference/constants";

export type WellGeometry = WellDefinition & {
  R: number;
  dir: { x: number; z: number };
  TD: number;
};

export function buildWellGeometry(w: WellDefinition): WellGeometry {
  const R = TARGET_TVD - w.kop;
  const a = (w.az * Math.PI) / 180;
  return { ...w, R, dir: { x: Math.cos(a), z: Math.sin(a) }, TD: w.kop + (Math.PI / 2) * R + w.h };
}

export const WELL_GEOMETRY: WellGeometry[] = WELLS.map(buildWellGeometry);

export type TrajectoryPoint = { position: Vec3; tangent: Vec3; inc: number; tvd: number };

/** lr(): точка траектории на глубине по стволу md (м сцены). */
export function trajectoryAt(w: WellGeometry, mdIn: number): TrajectoryPoint {
  const arc = (Math.PI / 2) * w.R;
  const md = Math.max(0, Math.min(w.TD, mdIn));
  if (md <= w.kop) {
    return { position: [w.x, -md, 0], tangent: [0, -1, 0], inc: 0, tvd: md };
  }
  if (md <= w.kop + arc) {
    const a = (md - w.kop) / w.R;
    const off = w.R * (1 - Math.cos(a));
    const tvd = w.kop + w.R * Math.sin(a);
    return {
      position: [w.x + w.dir.x * off, -tvd, w.dir.z * off],
      tangent: [w.dir.x * Math.sin(a), -Math.cos(a), w.dir.z * Math.sin(a)],
      inc: (a * 180) / Math.PI,
      tvd,
    };
  }
  const off = w.R + (md - w.kop - arc);
  const tvd = w.kop + w.R;
  return { position: [w.x + w.dir.x * off, -tvd, w.dir.z * off], tangent: [w.dir.x, 0, w.dir.z], inc: 90, tvd };
}

/** ja(): глубины в реальных метрах. */
export function wellDepths(w: WellGeometry, mdScene: number, casTDScene: number) {
  const t = trajectoryAt(w, mdScene);
  return { md: mdScene * DEPTH_SCALE, tvd: t.tvd * DEPTH_SCALE, inc: t.inc, td: w.TD * DEPTH_SCALE, casTD: casTDScene * DEPTH_SCALE };
}
