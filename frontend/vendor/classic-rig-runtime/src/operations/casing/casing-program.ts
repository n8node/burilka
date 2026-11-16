/**
 * Программа «Обсадка и цемент» эталона (To.casing, 8 шагов) — общая кинематика для трёх операций:
 *   tripping  = [pooh]
 *   casing    = [rigup, rih]
 *   cementing = [circ, pump, disp, bump, woc]
 * Порядок и длительности шагов сохранены: pooh → rigup → rih → circ → pump → disp → bump → woc.
 * Перенос эталонной функции U1() (ветка e.op === "casing") и LS() (цементировочный флот).
 */
import type { ClassicRigState } from "../../simulation/ClassicRigState";
import { CASING_PROGRAM_STEPS } from "../../reference/operations-reference";
import { BHA_LENGTH, HOLE_DRAW_FROM, TD_BOTTOM, TD_TOP } from "../../reference/constants";
import { lerp, triangle } from "../../util/math";
import type { WellGeometry } from "../../well/depth-model";
import { SETBACK_STAND_COUNT } from "../../simulation/ClassicRigState";

export const CASING_PROGRAM_KEYS = CASING_PROGRAM_STEPS.map((s) => s.key);

export const PROGRAM_SEGMENTS = {
  tripping: ["pooh"],
  casing: ["rigup", "rih"],
  cementing: ["circ", "pump", "disp", "bump", "woc"],
} as const;

export type ProgramOp = keyof typeof PROGRAM_SEGMENTS;

/** Индекс шага в исходной 8-шаговой программе (эталон e.i). */
export function programIndex(s: ClassicRigState): number {
  if (s.op !== "tripping" && s.op !== "casing" && s.op !== "cementing") return -1;
  const key = PROGRAM_SEGMENTS[s.op][Math.min(s.stepIndex, PROGRAM_SEGMENTS[s.op].length - 1)];
  return CASING_PROGRAM_KEYS.indexOf(key);
}

export function programStepKey(s: ClassicRigState): string | null {
  const i = programIndex(s);
  return i < 0 ? null : CASING_PROGRAM_KEYS[i];
}

/** Обновление состояния на шаге программы (то, что эталон писал в e.tdY и Rn). */
export function updateProgramState(s: ClassicRigState, well: WellGeometry, p: number): void {
  const key = programStepKey(s);
  if (!key) return;
  const w = s.casing.casTD;
  const M = well.kop - 12;
  const v = w - M;
  s.cement.toc = M;
  let td = s.drill.tdY;
  if (key === "pooh") td = TD_BOTTOM + (TD_TOP - TD_BOTTOM) * triangle(p * 9);
  if (key === "rigup") td = TD_TOP;
  if (key === "rih") td = TD_BOTTOM + (TD_TOP - TD_BOTTOM) * triangle(p * 10);
  if (["circ", "pump", "disp", "bump", "woc"].includes(key)) td = TD_BOTTOM + 0.5;
  s.cement.plug = null;
  if (key === "pump") {
    s.cement.pumped = 18 * p;
    s.cement.pressure = 4 + 3 * p;
  }
  if (key === "disp") {
    s.cement.plug = w * p;
    s.cement.pumped = 18 + 22 * p;
    s.cement.pressure = 7 + 6 * p;
  }
  if (key === "bump") {
    s.cement.plug = w;
    s.cement.pressure = 13 + 9 * Math.sin((Math.min(1, p * 2) * Math.PI) / 2);
  }
  if (key === "woc") {
    s.cement.plug = w;
    s.cement.pressure = 22 * (1 - p);
  }
  if (key === "circ") s.cement.pressure = 6;
  s.drill.tdY = td;
  // подъём колонны: свечи возвращаются в подсвечник (эталон: setStands[v < round(len × r)].visible = true)
  if (key === "pooh") {
    const n = Math.round(SETBACK_STAND_COUNT * p);
    for (let i = 0; i < n; i++) s.setbackVisible[i] = true;
  }
  void v;
}

export type ProgramVisuals = {
  /** глубина бурильной колонны (м сцены) */
  stringMD: number;
  /** низ обсадной колонны */
  casingTo: number;
  cementInside: [number, number] | null;
  cementAnnulus: [number, number] | null;
  plug: number | null;
  /** верх колонны над устьем (эталон d) */
  stringTop: number | null;
  /** цементировочный флот (эталон LS(i, e, t, n, s)) */
  fleet: { visible: boolean; arrive: number; leave: number; hoses: boolean; head: boolean };
};

/** Визуальные величины шага программы (эталон U1, локальные a, c, l, h, u, d и LS). */
export function programVisuals(s: ClassicRigState, well: WellGeometry): ProgramVisuals {
  const key = programStepKey(s);
  const idx = programIndex(s);
  const r = s.stepP;
  const w = s.casing.casTD;
  const M = well.kop - 12;
  const v = w - M;
  let a = s.drill.md;
  let c = 0;
  let l: [number, number] | null = null;
  let h: [number, number] | null = null;
  let d: number | null = null;
  if (key) {
    a = key === "pooh" ? lerp(s.casing.md0, 0, r) : 0;
    if (key === "pooh") d = s.drill.tdY;
    if (key === "rih") {
      c = lerp(0, w, r);
      d = s.drill.tdY;
    }
    if (["circ", "pump", "disp", "bump", "woc"].includes(key)) c = w;
    if (key === "pump") l = [0, v * r];
    if (key === "disp") {
      const E = w * r;
      l = [E, Math.min(E + v, w)];
      h = [w - Math.max(0, E + v - w), w];
    }
    if (key === "bump" || key === "woc") h = [M, w];
  } else if (s.op === "moving" || (s.op === "drilling" && s.drill.phase === "complete")) {
    a = 0;
  }
  const arrive = idx < 1 ? 0 : idx === 1 ? r : 1;
  const leave = idx === 7 ? r : 0;
  return {
    stringMD: a,
    casingTo: c,
    cementInside: l,
    cementAnnulus: h,
    plug: key ? s.cement.plug : null,
    stringTop: d,
    fleet: {
      visible: idx >= 1,
      arrive,
      leave,
      hoses: idx >= 1 && (idx > 1 || r > 0.7) && !(idx === 7 && r > 0.3),
      head: idx >= 3 && !(idx === 7 && r > 0.3),
    },
  };
}

export const PIPE_VISIBLE_FROM_BHA = BHA_LENGTH;
export const HOLE_FROM = HOLE_DRAW_FROM;
