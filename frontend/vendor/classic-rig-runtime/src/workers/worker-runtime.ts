/**
 * Обновление всех персонажей за шаг — перенос эталонной функции J1().
 * Возвращает события (смена задания, вход/выход из красной зоны, нарушения).
 */
import type { ClassicRigTelemetryEvent } from "../types";
import type { ClassicRigState } from "../simulation/ClassicRigState";
import type { SimulationConfig } from "../simulation/config";
import { animateWorker } from "./worker-animation";
import { derrickmanBehavior, drillerBehavior, floorhandBehavior, kickMusterBehavior, type BehaviorContext } from "./worker-behaviors";
import { runTaskList } from "./worker-tasks";
import { inRedZone, inTopdriveCollisionZone, levelOf, underSubstructure } from "./worker-safety";
import { KICK_MUSTER } from "../reference/workers-reference";

export type WorkerUpdateInput = {
  state: ClassicRigState;
  config: SimulationConfig;
  dt: number;
  stepKey: string | null;
  phaseTitle: string;
  wind: number;
  prevRigX: number;
  rotating: boolean;
  /** разрешение сценария на работу в красной зоне при вращении */
  permitted: (workerId: string) => boolean;
  tdVelocity: number;
};

export type SafetyCondition = { code: string; workerId: string };

export function updateWorkers(inp: WorkerUpdateInput): { events: ClassicRigTelemetryEvent[]; conditions: SafetyCondition[] } {
  const { state: s, dt } = inp;
  const ev: ClassicRigTelemetryEvent[] = [];
  const conditions: SafetyCondition[] = [];
  const ts = s.time;
  // переезд: люди на буровой едут вместе с ней (эталон: pos.y > 3 && pos.x > −60)
  const shift = s.moveX - inp.prevRigX;
  if (shift) for (const w of s.workers) if (w.pos[1] > 3 && w.pos[0] > -60) w.pos[0] += shift;

  const ctx: BehaviorContext = { state: s, config: inp.config, stepKey: inp.stepKey, phaseTitle: inp.phaseTitle, wind: inp.wind };
  const kickActive = s.op === "kick" && inp.stepKey !== "influx";
  for (const w of s.workers) {
    if (dt > 0) {
      const m = KICK_MUSTER[w.id];
      let handled = false;
      if (m && kickActive) handled = kickMusterBehavior(w, m, dt, s.moveX, false);
      else if (m && w.kp && m.pts[0][1] > 3) handled = kickMusterBehavior(w, m, dt, s.moveX, true);
      else if (m) w.kp = null;
      if (!handled) {
        if (w.def.behavior === "driller") drillerBehavior(w, ctx);
        else if (w.def.behavior === "floorhand") floorhandBehavior(w, dt, ctx);
        else if (w.def.behavior === "derrickman") derrickmanBehavior(w, dt, ctx);
        else runTaskList(w, dt, s.moveX);
      }
    }
    animateWorker(w, s.time, dt);
    w.level = levelOf(w.pos);

    const activity = `${w.anim}|${w.now}`;
    if (activity !== w.lastActivity) {
      w.lastActivity = activity;
      ev.push({ type: "worker_task_started", workerId: w.id, task: w.now || w.anim, timestamp: ts });
    }
    const danger = inRedZone(w.pos, s.moveX);
    if (danger && !w.inDanger) {
      const permitted = inp.permitted(w.id);
      ev.push({ type: "worker_entered_danger_zone", workerId: w.id, timestamp: ts, rotating: inp.rotating, permitted });
    }
    if (!danger && w.inDanger) ev.push({ type: "worker_left_danger_zone", workerId: w.id, timestamp: ts });
    w.inDanger = danger;
    if (danger && inp.rotating && !inp.permitted(w.id)) {
      conditions.push({ code: "worker_entered_danger_zone_during_rotation", workerId: w.id });
    }
    if (underSubstructure(w.pos, s.moveX)) conditions.push({ code: "worker_under_rig", workerId: w.id });
    if (inp.tdVelocity < -0.05 && s.drill.tdY < 8.2 + 4 && inTopdriveCollisionZone(w.pos, s.moveX)) {
      conditions.push({ code: "topdrive_moved_with_worker_in_collision_zone", workerId: w.id });
    }
  }
  return { events: ev, conditions };
}
