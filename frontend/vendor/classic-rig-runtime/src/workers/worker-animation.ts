/**
 * Смешивание поз и сглаживание поворота — перенос эталонной функции mS().
 * Переходы между позами плавные: вес новой позы растёт со скоростью 4.5/с (7/с для ходьбы).
 */
import type { InternalWorker } from "../simulation/ClassicRigState";
import { POSES, POSE_SIZE, poseNameFor } from "./worker-poses";

const scratch = new Float32Array(POSE_SIZE);

export function animateWorker(w: InternalWorker, time: number, dt: number): void {
  // сглаживание курса (эталон: heading += wrap(th − heading) · min(1, dt·7))
  const d = ((((w.th - w.heading + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
  w.heading += d * Math.min(1, dt * 7);

  const cur = poseNameFor(w.anim);
  const rate = cur === "walk" || (w.wts.walk ?? 0) > 0.5 ? 7 : 4.5;
  w.wts[cur] = w.wts[cur] ?? 0;
  let total = 0;
  for (const k of Object.keys(w.wts)) {
    const target = k === cur ? 1 : 0;
    w.wts[k] += (target - w.wts[k]) * Math.min(1, dt * rate);
    if (w.wts[k] < 0.002 && k !== cur) delete w.wts[k];
    else total += w.wts[k];
  }
  const out = new Array<number>(POSE_SIZE).fill(0);
  for (const k of Object.keys(w.wts)) {
    scratch.fill(0);
    POSES[k](scratch, time, w.seed, w.gph);
    const wk = w.wts[k] / (total || 1);
    for (let i = 0; i < POSE_SIZE; i++) out[i] += scratch[i] * wk;
  }
  w.pose = out;
}
