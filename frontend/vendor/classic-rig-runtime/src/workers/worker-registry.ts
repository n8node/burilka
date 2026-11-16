/**
 * Реестр персонажей классической бригады (эталон: массив vs + Tn, создание An()).
 */
import type { ClassicRigWorkerId, Vec3 } from "../types";
import type { InternalWorker } from "../simulation/ClassicRigState";
import { CLASSIC_WORKERS } from "../reference/workers-reference";
import { POSE_SIZE } from "./worker-poses";
import { levelOf } from "./worker-safety";

export const WORKER_IDS: ClassicRigWorkerId[] = CLASSIC_WORKERS.map((w) => w.id);

/** Масштаб фигуры как в эталоне: 0.95 + 0.1 · frac(sin(seed · 12.9898) · 43758.5453) */
const scaleFor = (seed: number) => 0.95 + 0.1 * ((((Math.sin(seed * 12.9898) * 43758.5453) % 1) + 1) % 1);

export function createWorkers(): InternalWorker[] {
  return CLASSIC_WORKERS.map((def) => {
    const seed = def.order * 1.7;
    const pos: Vec3 = [...(def.initialPos ?? def.start)] as Vec3;
    return {
      id: def.id,
      def,
      pos,
      th: def.heading ?? 0,
      heading: def.heading ?? 0,
      anim: "idle",
      now: "",
      ti: def.initialTask ?? 0,
      path: null,
      pi: 0,
      tt: 0,
      gph: 0,
      seed,
      scale: scaleFor(seed),
      wts: { idle: 1 },
      kp: null,
      ki: 0,
      level: levelOf(pos),
      inDanger: false,
      pose: new Array(POSE_SIZE).fill(0),
      lastActivity: "",
    };
  });
}
