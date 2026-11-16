/**
 * Операция «Бурение» с циклом наращивания свечи — перенос эталонной функции Wm().
 * Каждая фаза — запись в таблице обработчиков (без общего switch по операциям).
 */
import type { ClassicRigOperationDefinition, DrillingPhaseId } from "../../types";
import type { OperationBehavior, OperationContext } from "../../simulation/OperationRegistry";
import { checkRequirements } from "../../simulation/OperationRegistry";
import { easeInOut, lerp } from "../../util/math";
import { WIND_LIMIT } from "../../reference/constants";
import { DRILLING_CONFIG as C } from "./drilling-config";
import { DRILLING_PHASES } from "./drilling-phases";
import { consumeStand, setDrillPhase, takeStandFromSetback } from "./drilling-state";

export const drillingOperation: ClassicRigOperationDefinition = {
  id: "drilling",
  title: "Бурение классической буровой",
  phases: DRILLING_PHASES,
  initialState: { operation: "drilling", phase: "drill" },
  transitions: [
    { from: "drill", to: "slips", when: "СВП в нижнем положении (tdY ≤ dh)" },
    { from: "drill", to: "td", when: "достигнут проектный забой (md ≥ TD)" },
    { from: "slips", to: "breakTD", when: "таймер 2.2 с и ветер < 15 м/с" },
    { from: "breakTD", to: "tdUp", when: "таймер 2.4 с" },
    { from: "tdUp", to: "latch", when: "СВП на отметке tdLatch" },
    { from: "latch", to: "lift", when: "таймер 3.2 с" },
    { from: "lift", to: "stab", when: "таймер 5 с" },
    { from: "stab", to: "makeup", when: "таймер 2 с" },
    { from: "makeup", to: "tdConnect", when: "таймер 3.8 с" },
    { from: "tdConnect", to: "release", when: "таймер 2.4 с" },
    { from: "release", to: "drill", when: "таймер 1.8 с (+ красная зона свободна, если включена блокировка)" },
    { from: "td", to: "tripping", when: "полный цикл: через 4 с" },
    { from: "complete", to: "moving", when: "полный цикл: через 3 с (если есть следующее устье)" },
  ],
};

type Handler = (ctx: OperationContext, dt: number, opts: { holdSlips: boolean }) => void;

const go = (ctx: OperationContext, to: DrillingPhaseId) => {
  ctx.phaseCompleted(ctx.state.drill.phase);
  setDrillPhase(ctx.state, to);
  ctx.phaseStarted(to);
};

/** Таблица обработчиков фаз — порт ветвей Wm(). */
export const DRILLING_PHASE_HANDLERS: Record<DrillingPhaseId, Handler> = {
  drill(ctx, dt) {
    const d = ctx.state.drill;
    if (ctx.state.bop.manualClosed) return; // ДОПОЛНЕНИЕ: ПВО закрыт вручную — бурение заблокировано
    d.tdY -= C.kinematics.drillDescent * dt;
    d.md += C.rop * dt;
    d.holeMD = Math.max(d.holeMD, d.md);
    d.rot += C.kinematics.drillRotation * dt;
    const TD = ctx.well().TD;
    if (d.md >= TD) {
      d.md = d.holeMD = TD;
      go(ctx, "td");
    } else if (d.tdY <= C.tdBottom) {
      d.tdY = C.tdBottom;
      go(ctx, "slips");
    }
  },
  slips(ctx, _dt, { holdSlips }) {
    const d = ctx.state.drill;
    if (holdSlips) return; // ГНВП: шаг «приток» — бурение продолжается, наращивание не начинается
    const wasWaiting = d.windWait;
    d.windWait = d.timer > C.durations.slips && ctx.wind() >= WIND_LIMIT;
    if (d.windWait && !wasWaiting) {
      d.windWaitSince = ctx.state.time;
      ctx.bus.emit({ type: "wind_wait_started", wind: ctx.wind(), timestamp: ctx.state.time });
    }
    if (!d.windWait && wasWaiting) ctx.bus.emit({ type: "wind_wait_ended", durationSeconds: ctx.state.time - d.windWaitSince, timestamp: ctx.state.time });
    if (d.timer > C.durations.slips && !d.windWait) {
      const { cs, refilled } = takeStandFromSetback(ctx.state);
      d.cs = cs;
      if (refilled) ctx.notify("Подсвечник пополнен: свечи собраны заранее из труб с мостков");
      go(ctx, "breakTD");
    }
  },
  breakTD(ctx, dt) {
    const d = ctx.state.drill;
    if (d.timer < C.kinematics.breakReverseSeconds) d.rot -= C.kinematics.breakReverseRotation * dt;
    else d.tdY = Math.min(C.tdBottom + 0.4, d.tdY + C.kinematics.breakLift * dt);
    if (d.timer > C.durations.breakTD) go(ctx, "tdUp");
  },
  tdUp(ctx, dt) {
    const d = ctx.state.drill;
    if (!d.cs) return;
    d.tdY = Math.min(d.cs.tdLatch, d.tdY + C.kinematics.tdUpSpeed * dt);
    if (d.tdY >= d.cs.tdLatch) go(ctx, "latch");
  },
  latch(ctx) {
    if (ctx.state.drill.timer > C.durations.latch) go(ctx, "lift");
  },
  lift(ctx) {
    const d = ctx.state.drill;
    if (!d.cs) return;
    d.tdY = lerp(d.cs.tdLatch, C.tdLiftTop, easeInOut(Math.min(1, d.timer / C.durations.lift)));
    if (d.timer > C.durations.lift) go(ctx, "stab");
  },
  stab(ctx) {
    const d = ctx.state.drill;
    d.tdY = lerp(C.tdLiftTop, C.tdStab, easeInOut(Math.min(1, d.timer / C.durations.stab)));
    if (d.timer > C.durations.stab) go(ctx, "makeup");
  },
  makeup(ctx, dt) {
    const d = ctx.state.drill;
    if (d.cs && d.timer > C.kinematics.makeupSpinStart && d.timer < C.kinematics.makeupSpinEnd) d.cs.spin += C.kinematics.makeupSpinRate * dt;
    if (d.timer > C.durations.makeup) go(ctx, "tdConnect");
  },
  tdConnect(ctx, dt) {
    const d = ctx.state.drill;
    d.tdY = lerp(C.tdStab, C.tdTop, easeInOut(Math.min(1, d.timer / C.durations.tdConnect)));
    d.rot += C.kinematics.tdConnectRotation * dt;
    if (d.timer > C.durations.tdConnect) {
      const idx = consumeStand(ctx.state);
      if (idx != null) ctx.bus.emit({ type: "stand_transferred", standIndex: idx, timestamp: ctx.state.time });
      go(ctx, "release");
    }
  },
  release(ctx) {
    const d = ctx.state.drill;
    if (d.timer <= C.durations.release) return;
    if (ctx.config.rotationInterlock && ctx.unpermittedInRedZone()) return; // ДОПОЛНЕНИЕ: блокировка вращения
    d.connections++;
    ctx.bus.emit({ type: "connection_completed", count: d.connections, timestamp: ctx.state.time });
    go(ctx, "drill");
  },
  td(ctx) {
    const s = ctx.state;
    if (s.drill.timer > C.kinematics.tdAutoCasingDelay && s.auto && s.op === "drilling") ctx.startOperation("tripping", "auto");
  },
  complete(ctx) {
    const s = ctx.state;
    if (s.auto && s.drill.timer > C.kinematics.completeAutoMoveDelay && s.op === "drilling") {
      const next = Math.round(s.moveX) + 10;
      if ([0, 10, 20, 30].includes(next)) ctx.startOperation("moving", "auto");
      else ctx.startOperation("drilling", "auto"); // Pf(): новый куст
    }
  },
};

/** Шаг бурения (используется и ГНВП на шаге «приток»). */
export function stepDrilling(ctx: OperationContext, dt: number, holdSlips = false): void {
  DRILLING_PHASE_HANDLERS[ctx.state.drill.phase](ctx, dt, { holdSlips });
}

export const drillingBehavior: OperationBehavior = {
  definition: drillingOperation,
  start(ctx) {
    ctx.phaseStarted(ctx.state.drill.phase);
  },
  update(ctx, dt) {
    stepDrilling(ctx, dt);
    return false; // бурение — «базовая» операция, сама не завершается
  },
  complete() {},
  currentPhase: (ctx) => ctx.state.drill.phase,
  phaseProgress(ctx) {
    const d = ctx.state.drill;
    const def = DRILLING_PHASES.find((p) => p.id === d.phase);
    if (d.phase === "drill") return Math.min(1, (C.tdTop - d.tdY) / (C.tdTop - C.tdBottom));
    if (d.phase === "tdUp" && d.cs) return Math.min(1, (d.tdY - (C.tdBottom + 0.4)) / Math.max(0.01, d.cs.tdLatch - C.tdBottom - 0.4));
    return def ? Math.min(1, d.timer / def.durationSeconds) : 0;
  },
  operationProgress(ctx) {
    return Math.min(1, ctx.state.drill.md / ctx.well().TD);
  },
  pumpTarget(ctx) {
    if (ctx.state.bop.manualClosed) return 0;
    return ctx.state.drill.phase === "drill" ? 1 : 0;
  },
  canStart: (ctx) => checkRequirements(ctx, drillingOperation.requirements),
};
