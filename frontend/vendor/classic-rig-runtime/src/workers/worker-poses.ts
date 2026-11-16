/**
 * Процедурные позы персонажей — точный перенос эталона (G, Hr, fu, zo, id.*).
 * Поза — массив из 30 чисел (углы суставов, смещения таза). Анимация ходьбы — через суставы ног/рук.
 */
import type { WorkerTaskKind } from "../types";

const DEG = Math.PI / 180;

/** G — индексы канала позы */
export const POSE = {
  PY: 0, PX: 1, PRX: 2, PRY: 3, PRZ: 4, SPX: 5, SPZ: 6, CHX: 7, CHY: 8, CHZ: 9,
  NKX: 10, HDX: 11, HDY: 12, HIP: 13, KN: 15, AN: 17, SHX: 19, SHZ: 21, EL: 23, WR: 25, TAB: 27, HZ: 28,
} as const;
export const POSE_SIZE = 30;
const G = POSE;

/** Or — гауссов «импульс» по фазе цикла шага */
const pulse = (x: number, c: number, w: number) => {
  let n = x - c;
  n -= Math.round(n);
  return Math.exp(-(n * n) / (w * w));
};

/** Hr — стойка: покачивание таза, ноги */
function stance(p: Float32Array, t: number, seed: number, crouch = 0) {
  const s = Math.sin(t * 0.33 + seed);
  p[G.PX] = 0.018 * s;
  p[G.PRZ] = 0.035 * s;
  p[G.PY] = -0.006 - 0.01 * Math.abs(s) - crouch;
  for (let r = 0; r < 2; r++) {
    const a = 0.05 + 0.16 * (r === 0 ? Math.max(0, -s) : Math.max(0, s)) + (crouch ? crouch * 6 : 0);
    p[G.HIP + r] = -a * 0.5;
    p[G.KN + r] = a;
    p[G.AN + r] = -a * 0.5;
    p[G.HZ + r] = (r ? -1 : 1) * 0.04;
  }
}

/** fu — руки вдоль тела */
function armsRelaxed(p: Float32Array, t: number, seed: number) {
  const n = Math.sin(t * 1.6 + seed);
  for (let s = 0; s < 2; s++) {
    const r = s ? -1 : 1;
    p[G.SHX + s] = 0.03 + 0.02 * n;
    p[G.SHZ + s] = r * 0.12;
    p[G.EL + s] = -0.2 - 0.03 * n;
    p[G.WR + s] = 0;
  }
}

/** zo — дыхание */
function breathe(p: Float32Array, t: number, seed: number) {
  const n = Math.sin(t * 1.6 + seed);
  p[G.CHX] -= 0.02 * n;
  p[G.SPX] += 0.02;
  p[G.NKX] += 0.01 * n;
}

export type PoseFn = (p: Float32Array, t: number, seed: number, gaitPhase: number) => void;

export const POSES: Record<string, PoseFn> = {
  idle(p, t, seed) {
    stance(p, t, seed);
    armsRelaxed(p, t, seed);
    breathe(p, t, seed);
    p[G.HDY] = 0.35 * Math.sin(t * 0.21 + seed * 2) + 0.15 * Math.sin(t * 0.53 + seed);
    p[G.HDX] = 0.04 + 0.05 * Math.sin(t * 0.4 + seed);
  },
  walk(p, _t, _seed, gph) {
    const s = gph % 1;
    const r = Math.cos(2 * Math.PI * s);
    const o = Math.sin(2 * Math.PI * s);
    p[G.PY] = -0.014 - 0.026 * Math.cos(4 * Math.PI * s);
    p[G.PX] = 0.02 * o;
    p[G.PRY] = -0.1 * r;
    p[G.PRZ] = 0.045 * o;
    p[G.PRX] = 0.04;
    p[G.SPX] = 0.05;
    p[G.CHY] = 0.17 * r;
    p[G.CHZ] = -0.035 * o;
    p[G.NKX] = -0.02;
    p[G.HDX] = 0.03 + 0.02 * Math.cos(4 * Math.PI * s);
    p[G.HDY] = -(0.07 * r);
    for (let a = 0; a < 2; a++) {
      const c = (s + a * 0.5) % 1;
      const l = a ? -1 : 1;
      const hip = 5 + 20 * Math.cos(2 * Math.PI * (c - 0.03));
      const knee = 4 + 13 * pulse(c, 0.14, 0.07) + 58 * pulse(c, 0.72, 0.11);
      const ankle = -6 * pulse(c, 0.06, 0.04) + 10 * pulse(c, 0.42, 0.1) - 19 * pulse(c, 0.62, 0.05) + 4 * pulse(c, 0.85, 0.08);
      p[G.HIP + a] = -hip * DEG;
      p[G.KN + a] = knee * DEG;
      p[G.AN + a] = -ankle * DEG;
      p[G.HZ + a] = l * 0.02;
      const f = Math.cos(2 * Math.PI * c);
      p[G.SHX + a] = -(4 - 17 * f) * DEG;
      p[G.SHZ + a] = l * 0.13;
      p[G.EL + a] = -(14 + (16 * (1 - f)) / 2) * DEG;
      p[G.WR + a] = -0.1;
    }
  },
  reach(p, t, seed) {
    stance(p, t, seed, 0.02);
    for (let s = 0; s < 2; s++) {
      p[G.HIP + s] = -0.3;
      p[G.KN + s] = 0.5;
      p[G.AN + s] = -0.2;
    }
    p[G.PY] = -0.035;
    p[G.PRX] = 0.2;
    p[G.SPX] = 0.32;
    p[G.CHX] = 0.18;
    p[G.NKX] = -0.15;
    p[G.HDX] = -0.25;
    const n = Math.sin(t * 2.6 + seed);
    for (let s = 0; s < 2; s++) {
      const r = s ? -1 : 1;
      p[G.SHX + s] = -1.05 + 0.14 * n;
      p[G.SHZ + s] = r * -0.08;
      p[G.EL + s] = -0.55 + 0.25 * Math.sin(t * 2.6 + seed + 1.1);
      p[G.WR + s] = -0.25;
    }
  },
  wrench(p, t, seed) {
    for (let s = 0; s < 2; s++) {
      p[G.HIP + s] = -1.05 + (s ? 0.25 : 0);
      p[G.KN + s] = 1.6 - (s ? 0.3 : 0);
      p[G.AN + s] = -0.55 + (s ? 0.05 : 0);
      p[G.HZ + s] = (s ? -1 : 1) * 0.18;
    }
    p[G.PY] = -0.25;
    p[G.PRX] = 0.15;
    p[G.SPX] = 0.38;
    p[G.CHX] = 0.15;
    p[G.NKX] = -0.1;
    p[G.HDX] = -0.05;
    const n = t * 5.5 + seed;
    p[G.SHX + 1] = -1.05 + 0.38 * Math.sin(n);
    p[G.SHZ + 1] = 0.05;
    p[G.EL + 1] = -0.85 + 0.4 * Math.sin(n + 1.3);
    p[G.WR + 1] = -0.3 + 0.2 * Math.sin(n + 2);
    p[G.SHX] = -0.75;
    p[G.SHZ] = 0.15;
    p[G.EL] = -0.75;
    p[G.WR] = -0.2;
    p[G.CHY] = 0.08 * Math.sin(n);
  },
  look(p, t, seed) {
    stance(p, t, seed);
    armsRelaxed(p, t, seed);
    breathe(p, t, seed);
    const n = (t * 0.12 + seed) % 2 < 1;
    p[G.SHX + 1] = n ? -1.35 : -0.25;
    p[G.SHZ + 1] = n ? -0.2 : -0.1;
    p[G.EL + 1] = n ? -0.12 : -1.4;
    p[G.WR + 1] = n ? -0.1 : 0;
    p[G.HDY] = 0.5 * Math.sin(t * 0.55 + seed);
    p[G.HDX] = -0.18 + 0.08 * Math.sin(t * 0.9);
    p[G.CHY] = 0.15 * Math.sin(t * 0.55 + seed);
  },
  write(p, t, seed) {
    stance(p, t, seed);
    breathe(p, t, seed);
    p[G.SHX] = -0.5;
    p[G.SHZ] = 0.14;
    p[G.EL] = -1.3;
    p[G.WR] = 0.15;
    p[G.SHX + 1] = -0.58;
    p[G.SHZ + 1] = 0.12;
    p[G.EL + 1] = -1.42 + 0.06 * Math.sin(t * 9 + seed);
    p[G.WR + 1] = -0.3 + 0.06 * Math.sin(t * 9);
    p[G.CHY] = 0.12;
    p[G.HDX] = 0.42 + 0.03 * Math.sin(t * 0.7);
    p[G.HDY] = 0.06 * Math.sin(t * 0.3);
    p[G.CHX] += 0.06;
    p[G.TAB] = 1;
  },
  console(p, t, seed) {
    stance(p, t, seed);
    breathe(p, t, seed);
    p[G.SPX] = 0.14;
    for (let n = 0; n < 2; n++) {
      const s = n ? -1 : 1;
      p[G.SHX + n] = -0.62 + 0.04 * Math.sin(t * 1.7 + n * 2);
      p[G.SHZ + n] = s * 0.16;
      p[G.EL + n] = -0.85 + 0.08 * Math.sin(t * (2 + n * 0.6) + n);
      p[G.WR + n] = 0.25;
    }
    p[G.HDX] = 0.22;
    p[G.HDY] = 0.25 * Math.sin(t * 0.35 + seed);
  },
  talk(p, t, seed) {
    stance(p, t, seed);
    armsRelaxed(p, t, seed);
    breathe(p, t, seed);
    const n = t * 2.1 + seed;
    p[G.SHX + 1] = -0.38 + 0.25 * Math.sin(n);
    p[G.SHZ + 1] = -0.18 - 0.1 * Math.sin(t * 1.3);
    p[G.EL + 1] = -1.1 + 0.35 * Math.sin(n + 0.8);
    p[G.WR + 1] = 0.2 * Math.sin(n + 1.6);
    p[G.SHX] = -0.12 + 0.1 * Math.sin(n * 0.6);
    p[G.EL] = -0.4 + 0.15 * Math.sin(n * 0.7 + 1);
    p[G.HDY] = 0.28 * Math.sin(t * 0.7 + seed);
    p[G.HDX] = 0.04 + 0.06 * Math.sin(t * 3.1);
    p[G.CHY] = 0.08 * Math.sin(t * 0.7 + seed);
  },
};

export const poseNameFor = (anim: WorkerTaskKind): string => (anim === "wait_on_derrick" ? "idle" : POSES[anim] ? anim : "idle");

/**
 * dS(): применение позы к суставам. Возвращает углы Эйлера для каждого именованного узла персонажа
 * (имена узлов в rig-characters/*.glb). _L — индекс 0 (сторона +X персонажа), _R — индекс 1.
 */
export type JointTransforms = Record<string, { rotation: [number, number, number]; position?: [number, number, number] }>;

export function poseToJoints(e: ArrayLike<number>): JointTransforms {
  const j: JointTransforms = {
    pelvis: { position: [e[G.PX], 0.955 + e[G.PY], 0], rotation: [e[G.PRX], e[G.PRY], e[G.PRZ]] },
    spine: { rotation: [e[G.SPX] - e[G.PRX] * 0.6, 0, e[G.SPZ]] },
    chest: { rotation: [e[G.CHX], e[G.CHY], e[G.CHZ] - e[G.PRZ] * 0.7] },
    neck: { rotation: [e[G.NKX], 0, 0] },
    head: { rotation: [e[G.HDX], e[G.HDY], 0] },
  };
  const side = ["L", "R"];
  for (let n = 0; n < 2; n++) {
    const s = side[n];
    j[`hip_${s}`] = { rotation: [e[G.HIP + n] - e[G.PRX], 0, e[G.HZ + n] - e[G.PRZ]] };
    j[`knee_${s}`] = { rotation: [e[G.KN + n], 0, 0] };
    j[`ankle_${s}`] = { rotation: [e[G.AN + n], 0, -e[G.HZ + n]] };
    j[`shoulder_${s}`] = { rotation: [e[G.SHX + n], 0, e[G.SHZ + n]] };
    j[`elbow_${s}`] = { rotation: [e[G.EL + n], 0, 0] };
    j[`wrist_${s}`] = { rotation: [e[G.WR + n], 0, 0] };
  }
  return j;
}
