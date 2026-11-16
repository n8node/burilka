/**
 * Кинематика наращивания: штропы/элеватор, клинья, ключ АКБ, положение свечи в переносе.
 * Перенос эталонной функции $S() — чистые вычисления, без three.js.
 */
import type { ClassicRigState } from "../../simulation/ClassicRigState";
import type { Vec3 } from "../../types";
import { FLOOR_Y, SLIPS_SET_PHASES, TD_BOTTOM, TD_TOP } from "../../reference/constants";
import { clamp01, easeInOut, lerp } from "../../util/math";
import { DRILLING_CONFIG as C } from "./drilling-config";

export type ConnectionKinematics = {
  /** ось подвеса штропов */
  pivot: Vec3;
  /** положение элеватора */
  elevator: Vec3;
  /** 0 — клинья вынуты, 1 — колонна на клиньях */
  slipsK: number;
  /** 0 — АКБ на парковке, 1 — у устья */
  akb: number;
  elevatorClosed: boolean;
  phase: string;
};

export function computeConnectionKinematics(s: ClassicRigState): ConnectionKinematics {
  const d = s.drill;
  const e = d.cs;
  const t = d.timer;
  const n = s.op === "drilling" || s.op === "kick" ? d.phase : "";
  const pivot: Vec3 = [0, d.tdY + C.linkPivotOffset, 0];
  let r: [number, number] | null = null;
  let slipsK = (SLIPS_SET_PHASES as readonly string[]).includes(n) ? 1 : 0;
  let akb = 0;
  let elevatorClosed = true;
  if (n === "slips") slipsK = easeInOut(Math.min(1, t / 1.2));
  if (n === "release") slipsK = 1 - easeInOut(Math.min(1, t / 1.2));
  if (e) {
    const h: [number, number] = [e.px, e.pz];
    if (n === "tdUp") {
      const u = easeInOut(clamp01((d.tdY - (e.tdLatch - 6)) / 6));
      r = [h[0] * u, h[1] * u];
      elevatorClosed = false;
    } else if (n === "latch") {
      r = h;
      elevatorClosed = t > 2.6;
    } else if (n === "lift") {
      const u = easeInOut(clamp01(t / C.durations.lift));
      r = [h[0] * (1 - u), h[1] * (1 - u)];
    }
    if (n === "breakTD" || n === "tdUp") {
      e.top = [e.sx, FLOOR_Y + C.standLength, e.sz];
      e.bot = [e.sx, FLOOR_Y, e.sz];
    } else if (n === "latch") {
      const u = easeInOut(clamp01(t / 2.2));
      const dx = lerp(e.sx, e.px, u);
      const dz = lerp(e.sz, e.pz, u);
      const p = Math.hypot(e.sx - dx, e.sz - dz);
      e.bot = [e.sx, FLOOR_Y, e.sz];
      e.top = [dx, FLOOR_Y + Math.sqrt(C.standLength * C.standLength - p * p), dz];
    }
  }
  let elevator: Vec3;
  if (r) {
    const h2 = r[0] * r[0] + r[1] * r[1];
    elevator = [r[0], pivot[1] - Math.sqrt(Math.max(0.01, C.linkLength * C.linkLength - h2)), r[1]];
  } else elevator = [0, pivot[1] - C.linkLength, 0];

  if (e && (n === "lift" || n === "stab" || n === "makeup" || n === "tdConnect")) {
    if (n === "lift") {
      e.top = [elevator[0], elevator[1] + C.standTopOffset, elevator[2]];
      const h = easeInOut(clamp01((t / C.durations.lift - 0.12) / 0.8));
      const u = lerp(e.sx, 0, h);
      const dz = lerp(e.sz, 0, h);
      const f = Math.hypot(e.top[0] - u, e.top[2] - dz);
      e.bot = [u, Math.max(FLOOR_Y, e.top[1] - Math.sqrt(C.standLength * C.standLength - f * f)), dz];
    } else {
      const topY = n === "tdConnect" ? TD_TOP : d.tdY - 0.6;
      e.top = [0, topY, 0];
      e.bot = [0, topY - C.standLength, 0];
    }
  }
  if (e && n === "makeup") akb = t < 0.8 ? easeInOut(t / 0.8) : t < 3 ? 1 : 1 - easeInOut((t - 3) / 0.8);
  return { pivot, elevator, slipsK, akb, elevatorClosed, phase: n };
}

/** Верх бурильной колонны над устьем (эталон d в U1: при посадке на клинья — dh). */
export function drillstringTop(s: ClassicRigState, programTop: number | null): number {
  if (programTop != null) return programTop;
  return (SLIPS_SET_PHASES as readonly string[]).includes(s.drill.phase) && s.op === "drilling" ? TD_BOTTOM : s.drill.tdY;
}
