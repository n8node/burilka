/**
 * Особые роли: бурильщик (rT), помбуры (Y1), верховой (lT), сбор по тревоге ГНВП (Ym).
 * Перенос эталона; изменения поведения помечены «ДОПОЛНЕНИЕ».
 */
import type { ClassicRigState, InternalWorker } from "../simulation/ClassicRigState";
import type { SimulationConfig } from "../simulation/config";
import type { Vec3 } from "../types";
import { BALCONY_REST, BALCONY_Y, FLOOR_Y as O, TD_BOTTOM, WIND_LIMIT } from "../reference/constants";
import { DRILLER_KICK_LABELS, FLOORHAND_TABLE, KICK_MUSTER, type KickMuster } from "../reference/workers-reference";
import { DRILLING_PHASE_TITLES } from "../reference/operations-reference";
import { faceTo, stepTowards } from "./worker-tasks";
import { withRigOffset } from "./worker-routes";

export type BehaviorContext = {
  state: ClassicRigState;
  config: SimulationConfig;
  /** ключ шага текущей не-буровой операции (эталон En().key) */
  stepKey: string | null;
  /** название текущей фазы/шага (эталон Bf()) */
  phaseTitle: string;
  wind: number;
};

/** rT — бурильщик у пульта */
export function drillerBehavior(w: InternalWorker, ctx: BehaviorContext): void {
  w.anim = "console";
  w.th = Math.PI / 2;
  w.now = ctx.state.op === "kick" && ctx.stepKey ? DRILLER_KICK_LABELS[ctx.stepKey] : "у пульта бурильщика · " + ctx.phaseTitle.toLowerCase();
}

/** Y1 — помбуры у устья / подсвечника */
export function floorhandBehavior(w: InternalWorker, dt: number, ctx: BehaviorContext): void {
  const s = ctx.state;
  const key = ctx.stepKey;
  const rx = s.moveX;
  const id = w.id as "helper1_A" | "helper2_A";
  const drilling = s.op === "drilling" || (s.op === "kick" && key === "influx");
  let slot = drilling ? FLOORHAND_TABLE[id][s.drill.phase] : undefined;
  // ДОПОЛНЕНИЕ (rotationInterlock): после извлечения клиньев помбуры уходят из красной зоны до пуска вращения
  if (slot && s.drill.phase === "release" && ctx.config.rotationInterlock && s.drill.timer > 1.2) slot = undefined;
  if (slot && !(s.drill.phase === "slips" && s.drill.windWait)) {
    const [pt0, anim, label] = slot;
    let pt = pt0;
    let look: [number, number] = [0, 0];
    let speed = 1.5;
    if (!pt) {
      const g = s.drill.cs ? s.drill.cs.bot : ([2, O, 0] as Vec3);
      pt = [g[0] + 0.25, g[2] - 0.72];
      look = [g[0], g[2]];
      speed = 2.2;
    }
    if (stepTowards(w, [pt[0] + rx, O, pt[1]], dt, speed)) {
      faceTo(w, look[0] + rx, look[1]);
      w.anim = anim;
      w.now = label;
    } else {
      w.anim = "walk";
      w.now = label;
    }
    w.routeId = "rig_floor";
    return;
  }
  let atWell = false;
  let workLabel = "";
  let idleLabel = "ждёт наращивания у края стола ротора";
  if (drilling) {
    idleLabel = s.drill.windWait ? "наращивание остановлено по ветру, ждёт у ротора" : id === "helper1_A" ? "у края стола ротора, ждёт наращивания" : "ждёт наращивания у подсвечника";
    if (s.drill.phase === "release") idleLabel = "клинья извлечены, отходит от устья перед пуском вращения";
    if (s.drill.phase === "complete") idleLabel = "скважина закреплена, уборка рабочей площадки";
  } else if (key === "pooh" || key === "rih") {
    atWell = s.drill.tdY < TD_BOTTOM + 7;
    workLabel = key === "pooh" ? "у устья: развинчивание свечей при подъёме" : "у устья: свинчивание обсадных труб";
    idleLabel = key === "pooh" ? "подъём колонны: ждёт следующую свечу" : "спуск обсадной колонны: ждёт следующую трубу";
  } else if (s.op === "casing" || s.op === "cementing") {
    idleLabel = key === "rigup" ? "принимает цементировочную головку" : "цементирование: в стороне от линий высокого давления";
  } else if (s.op === "kick") {
    idleLabel = "по тревоге: у устья, готов к установке шарового крана";
  } else idleLabel = "переезд: на буровой, проверяет крепления";
  const target = atWell ? w.def.workPoint! : w.def.idlePoint!;
  if (stepTowards(w, [target[0] + rx, target[1], target[2]], dt, 1.5)) {
    faceTo(w, rx, 0);
    w.anim = atWell ? "reach" : s.op === "drilling" ? "idle" : "look";
    w.now = atWell ? workLabel : idleLabel;
  } else {
    w.anim = "walk";
    w.now = atWell ? "идёт к устью" : "отходит от устья";
  }
  w.routeId = "rig_floor";
}

/** lT — верховой: только балкон (y ≈ 33), на землю не спускается. */
export function derrickmanBehavior(w: InternalWorker, dt: number, ctx: BehaviorContext): void {
  const s = ctx.state;
  const key = ctx.stepKey;
  const rx = s.moveX;
  const cs = s.drill.cs;
  const ph = s.drill.phase;
  const rest = (): boolean => stepTowards(w, [BALCONY_REST[0] + rx, BALCONY_REST[1], BALCONY_REST[2]], dt, 1.1);
  w.routeId = "derrick_balcony";
  if (s.op === "kick" && key !== "influx") {
    if (rest()) {
      w.anim = "look";
      w.th = -Math.PI / 2;
    } else w.anim = "walk";
    w.now = "по тревоге: на балконе, на связи с бурильщиком";
    return;
  }
  if (s.op !== "drilling" && s.op !== "kick" && key !== "pooh") {
    if (rest()) {
      w.anim = "wait_on_derrick";
      w.th = -Math.PI / 2;
    } else w.anim = "walk";
    w.now = s.op === "moving" ? "переезд: ждёт на балконе окончания движения" : "балкон верхового: работы нет, колонна обсадная";
    return;
  }
  if (ctx.wind >= WIND_LIMIT && !cs) {
    if (rest()) {
      w.anim = "look";
      w.th = -Math.PI / 2;
    } else w.anim = "walk";
    w.now = "работы на балконе прекращены: ветер " + ctx.wind.toFixed(0) + " м/с";
    return;
  }
  if (cs && ((ph === "tdUp" && s.drill.tdY > cs.tdLatch - 12) || ph === "latch" || (ph === "lift" && s.drill.timer < 1.6))) {
    const tx = Math.min(4.8, Math.max(1.9, cs.sx - 0.15)) + rx;
    if (stepTowards(w, [tx, BALCONY_Y, -0.45], dt, 1.1)) {
      faceTo(w, cs.top[0] + rx, cs.top[2]);
      w.anim = ph === "latch" || ph === "lift" ? "reach" : "look";
      w.now = ph === "latch" ? (s.drill.timer < 2.6 ? "выводит верх свечи из пальцев к элеватору" : "закрывает защёлку элеватора") : ph === "lift" ? "отпускает свечу, свеча на элеваторе" : "ждёт подход элеватора";
    } else {
      w.anim = "walk";
      w.now = "идёт к свече по настилу балкона";
    }
    return;
  }
  if (key === "pooh") {
    if (stepTowards(w, [2.6 + rx, BALCONY_Y, -0.45], dt, 1.1)) {
      faceTo(w, rx, 0);
      w.anim = s.drill.tdY > 30 ? "reach" : "idle";
    } else w.anim = "walk";
    w.now = s.drill.tdY > 30 ? "на балконе: выводит свечу из элеватора и ставит за палец" : "ждёт следующую свечу";
    return;
  }
  if (rest()) {
    w.anim = "wait_on_derrick";
    w.th = -Math.PI / 2;
    w.now = "на балконе верхового, ждёт наращивания";
  } else {
    w.anim = "walk";
    w.now = "возвращается на площадку балкона";
  }
}

/** Ym — сбор по тревоге ГНВП и возврат на рабочее место. Возвращает true, если поведение перехвачено. */
export function kickMusterBehavior(w: InternalWorker, m: KickMuster, dt: number, rigX: number, returning: boolean): boolean {
  if (!w.kp) {
    w.kp = m.pts.map((p) => [p[0], p[1], p[2]] as Vec3);
    w.ki = 0;
  }
  w.routeId = `kick_muster_${w.id}`;
  if (!returning) {
    if (w.ki < w.kp.length) {
      if (stepTowards(w, withRigOffset(w.kp[w.ki], rigX), dt, 1.9)) w.ki++;
      w.anim = "walk";
      w.now = "по тревоге: " + m.label;
    } else {
      faceTo(w, m.face[0] + rigX, m.face[1]);
      w.anim = m.anim;
      w.now = m.label;
    }
    return true;
  }
  const idx = Math.min(w.ki, w.kp.length) - 1;
  if (idx < 0) {
    w.kp = null;
    return false;
  }
  if (stepTowards(w, withRigOffset(w.kp[idx], rigX), dt, 1.5)) {
    w.ki = idx;
    if (idx === 0) {
      w.kp = null;
      return false;
    }
  }
  w.anim = "walk";
  w.now = "возвращается на рабочее место";
  return true;
}

export const KICK_MUSTER_TABLE = KICK_MUSTER;
export const phaseTitleFor = (phase: string) => DRILLING_PHASE_TITLES[phase] ?? phase;
