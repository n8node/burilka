/**
 * Машина заданий персонажа и перемещение без телепортации (эталон: pS(), ps(), co(), Rm()).
 */
import type { InternalWorker } from "../simulation/ClassicRigState";
import type { Vec3 } from "../types";
import { withRigOffset } from "./worker-routes";

/** ps(): шаг к цели с постоянной скоростью; true — цель достигнута. Без телепортации: смещение ≤ скорость × dt. */
export function stepTowards(w: InternalWorker, target: Vec3, dt: number, speed = 1.4): boolean {
  const s = speed * (0.94 + 0.12 * ((w.seed * 7.3) % 1));
  const r: Vec3 = [target[0] - w.pos[0], target[1] - w.pos[1], target[2] - w.pos[2]];
  const len = Math.hypot(r[0], r[1], r[2]);
  const step = s * dt;
  w.target = target;
  if (len <= step || len < 1e-4) {
    w.pos = [target[0], target[1], target[2]];
    return true;
  }
  const k = step / len;
  w.pos = [w.pos[0] + r[0] * k, w.pos[1] + r[1] * k, w.pos[2] + r[2] * k];
  if (Math.hypot(r[0], r[2]) > 0.05) w.th = Math.atan2(r[0], r[2]);
  w.gph += step / ((0.7 + 0.55 * s) * w.scale);
  return false;
}

/** co(): повернуться к точке */
export function faceTo(w: InternalWorker, x: number, z: number): void {
  w.th = Math.atan2(x - w.pos[0], z - w.pos[2]);
}

/** Rm(): следующее задание */
export function nextTask(w: InternalWorker): void {
  const n = w.def.tasks?.length ?? 1;
  w.ti = (w.ti + 1) % n;
  w.tt = 0;
  w.path = null;
}

/** pS(): выполнить текущее задание из списка */
export function runTaskList(w: InternalWorker, dt: number, rigX: number): void {
  const tasks = w.def.tasks;
  if (!tasks || tasks.length === 0) return;
  const t = tasks[w.ti];
  if ("walk" in t) {
    if (!w.path) {
      w.path = t.walk.map((p) => [p[0], p[1], p[2]] as Vec3);
      w.pi = 0;
    }
    w.anim = "walk";
    w.now = t.label || "идёт";
    w.routeId = t.routeId;
    const target = withRigOffset(w.path[w.pi], rigX);
    if (stepTowards(w, target, dt, t.speed)) {
      w.pi++;
      if (w.pi >= w.path.length) nextTask(w);
    }
  } else {
    if (w.tt === 0 && t.face) faceTo(w, t.face[0] + (t.face[0] < -62 ? 0 : rigX), t.face[1]);
    w.anim = t.work;
    w.now = t.label || "";
    w.routeId = undefined;
    w.tt += dt;
    if (w.tt >= t.dur) nextTask(w);
  }
}
