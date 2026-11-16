/** Траектории куста: точки ствола для отрисовки (эталон Rl/vS/_1). */
import type { Vec3 } from "../types";
import { trajectoryAt, type WellGeometry } from "./depth-model";

/** Ломаная ствола с шагом step (м сцены) от a до b по стволу. */
export function trajectoryPolyline(w: WellGeometry, from: number, to: number, step = 1.2): Vec3[] {
  const pts: Vec3[] = [];
  const n = Math.max(2, Math.ceil((to - from) / step));
  for (let i = 0; i <= n; i++) pts.push(trajectoryAt(w, from + ((to - from) * i) / n).position);
  return pts;
}

/** Пачка газа в затрубье на шагах ГНВП (эталон DS): интервал [низ, верх] по стволу или null */
export function gasSlug(op: string, step: string | null, md: number, p: number, gain: number, gainAtDetect: number): [number, number] | null {
  if (op !== "kick" || !step) return null;
  const l = 2 + gainAtDetect * 4;
  let top: number;
  let bot: number;
  if (step === "influx") {
    top = md;
    bot = md - (2 + gain * 4);
  } else if (step === "alarm" || step === "shutin") {
    top = md - (step === "shutin" ? 2 * p : 0);
    bot = top - l;
  } else if (step === "kill") {
    const center = md - l / 2 + (-6 - (md - l / 2)) * Math.max(0, Math.min(1, p / 0.9));
    const len = l * (1 + 2.2 * Math.max(0, Math.min(1, 1 - center / md)));
    bot = center - len / 2;
    top = center + len / 2;
  } else return null;
  return [Math.max(0, bot), Math.max(0, Math.min(md, top))];
}
