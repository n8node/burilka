/** Преобразование внутреннего состояния персонажа в снимок. */
import type { ClassicRigWorkerId, WorkerSnapshot } from "../types";
import type { InternalWorker } from "../simulation/ClassicRigState";
import { POSE } from "./worker-poses";

export function workerSnapshot(w: InternalWorker): WorkerSnapshot {
  return {
    id: w.id,
    role: w.def.role,
    task: w.anim,
    animation: w.anim === "wait_on_derrick" ? "idle" : w.anim,
    position: [w.pos[0], w.pos[1], w.pos[2]],
    rotation: w.heading,
    target: w.target ? [w.target[0], w.target[1], w.target[2]] : undefined,
    level: w.level,
    dangerZone: w.inDanger,
    routeId: w.routeId,
    activity: w.now,
    pose: [...w.pose],
    scale: w.scale,
    tabletVisible: (w.pose[POSE.TAB] ?? 0) > 0.5,
  };
}

export function workerSnapshots(ws: InternalWorker[]): Record<ClassicRigWorkerId, WorkerSnapshot> {
  const out = {} as Record<ClassicRigWorkerId, WorkerSnapshot>;
  for (const w of ws) out[w.id] = workerSnapshot(w);
  return out;
}
