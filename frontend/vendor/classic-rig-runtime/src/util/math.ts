/** Чистая математика без three.js (эталонные cs, xe, Re, Um, mt). */
import type { Quat, Vec3 } from "../types";

/** cs */
export const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
/** xe — easeInOutQuad */
export const easeInOut = (x: number): number => {
  const t = clamp01(x);
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};
/** Re */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** Um — треугольная волна 0..1..0 */
export const triangle = (x: number): number => 1 - Math.abs(2 * (x - Math.floor(x)) - 1);

export const v3 = (x = 0, y = 0, z = 0): Vec3 => [x, y, z];
export const vSub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const vAdd = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const vScale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const vLen = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const vNorm = (a: Vec3): Vec3 => {
  const l = vLen(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const vDist = (a: Vec3, b: Vec3): number => vLen(vSub(a, b));

/** Кватернион поворота единичного вектора a в b (как THREE.Quaternion.setFromUnitVectors). */
export function quatFromUnitVectors(a: Vec3, b: Vec3): Quat {
  let r = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + 1;
  let x: number, y: number, z: number, w: number;
  if (r < 1e-6) {
    r = 0;
    if (Math.abs(a[0]) > Math.abs(a[2])) { x = -a[1]; y = a[0]; z = 0; w = r; }
    else { x = 0; y = -a[2]; z = a[1]; w = r; }
  } else {
    x = a[1] * b[2] - a[2] * b[1];
    y = a[2] * b[0] - a[0] * b[2];
    z = a[0] * b[1] - a[1] * b[0];
    w = r;
  }
  const l = Math.hypot(x, y, z, w) || 1;
  return [x / l, y / l, z / l, w / l];
}

/** Детерминированный псевдослучайный генератор (LCG как в эталоне для леса/сугробов). */
export function lcg(seed: number): () => number {
  let c = seed;
  return () => {
    c = (c * 16807) % 2147483647;
    return c / 2147483647;
  };
}
