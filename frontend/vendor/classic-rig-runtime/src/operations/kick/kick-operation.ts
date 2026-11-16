/** Операция «ГНВП» (эталон: CS, PS, RS, IS, ветка kick в H1 и qS). */
import type { ClassicRigOperationDefinition } from "../../types";
import type { OperationBehavior, OperationContext } from "../../simulation/OperationRegistry";
import { checkRequirements } from "../../simulation/OperationRegistry";
import { PhaseMachine } from "../../simulation/PhaseMachine";
import { START_MD, TD_TOP } from "../../reference/constants";
import { clamp01, lerp } from "../../util/math";
import { DRILLING_CONFIG } from "../drilling/drilling-config";
import { returnStandToSetback, setDrillPhase } from "../drilling/drilling-state";
import { stepDrilling } from "../drilling/drilling-operation";
import { KICK_CONFIG } from "./kick-config";
import { KICK_PHASES } from "./kick-phases";

export const kickOperation: ClassicRigOperationDefinition = {
  id: "kick",
  title: "ГНВП: обнаружение, герметизация устья и глушение",
  phases: KICK_PHASES,
  initialState: { operation: "kick", phase: "influx" },
  // эталон fh("kick"): op === drill && (phase drill | slips без свечи) && md > ws + 3
  requirements: [
    { type: "operation", operation: "drilling", phases: ["drill", "slips"] },
    { type: "min_depth", meters: START_MD + DRILLING_CONFIG.minExtraDepthForKick },
  ],
  next: { operation: "drilling_resume", always: true },
};

export const kickParams = (ctx: OperationContext) => (ctx.state.kick.early ? KICK_CONFIG.params.early : KICK_CONFIG.params.late);

/** RS(): модель проявления. */
function updateKickModel(ctx: OperationContext, key: string, p: number, dt: number): void {
  const k = ctx.state.kick;
  const P = kickParams(ctx);
  k.t += dt;
  if (key === "influx") {
    k.gain = P.rate * k.t;
    k.flowOut = 100 + 22 * clamp01(k.t / 6);
    k.gas = 0.3 + 7 * clamp01(k.t / 8);
    k.detectT = k.t;
    k.gainAtDetect = k.gain;
  }
  if (key === "alarm") k.flowOut = lerp(k.flowOut, 0, clamp01(p * 2));
  if (key === "shutin") {
    k.sidpp = P.sidpp * clamp01(p * 1.4);
    k.sicp = P.sicp * clamp01(p * 1.4);
    k.flowOut = 0;
  }
  if (key === "kill") {
    k.flowOut = 45;
    k.sidpp = P.sidpp * (1 - p);
    k.sicp = p < 0.8 ? lerp(P.sicp, P.peak, Math.pow(p / 0.8, 1.6)) : lerp(P.peak, 0, (p - 0.8) / 0.2);
    k.gain = k.gainAtDetect * (1 - clamp01((p - 0.55) / 0.4));
    k.gas = p > 0.55 && p < 0.95 ? 25 : lerp(k.gas, 1, dt);
  }
  if (key === "open") {
    k.sicp = 0;
    k.sidpp = 0;
    k.gain = 0;
    k.flowOut = 100;
    k.gas = lerp(k.gas, 0.3, dt);
  }
  k.maxSicp = Math.max(k.maxSicp, k.sicp);
}

const machine = new PhaseMachine(kickOperation, {
  duration: (ctx, phase) => (phase.id === "influx" ? kickParams(ctx).detect : phase.durationSeconds),
  onUpdate(ctx, phase, p, dt) {
    const s = ctx.state;
    if (phase.id === "influx") stepDrilling(ctx, dt, true);
    if (phase.id === "alarm") {
      s.drill.tdY = Math.min(TD_TOP, s.drill.tdY + DRILLING_CONFIG.kinematics.alarmLiftSpeed * dt);
      if (s.drill.phase === "slips") s.drill.phase = "drill";
    }
    updateKickModel(ctx, phase.id, p, dt);
    if (phase.id === "alarm" && !s.kick.detectedEmitted) {
      s.kick.detectedEmitted = true;
      ctx.bus.emit({ type: "kick_detected", early: s.kick.early, gain: s.kick.gainAtDetect, timestamp: s.time });
    }
  },
});

export const kickBehavior: OperationBehavior = {
  definition: kickOperation,
  start(ctx) {
    const s = ctx.state;
    Object.assign(s.kick, { gain: 0, flowOut: 100, gas: 0.3, sidpp: 0, sicp: 0, t: 0, detectT: 0, gainAtDetect: 0, maxSicp: 0, detectedEmitted: false });
    s.drill.windWait = false;
    returnStandToSetback(s);
    machine.start(ctx);
  },
  update: (ctx, dt) => machine.update(ctx, dt),
  complete(ctx) {
    const s = ctx.state;
    const k = s.kick;
    const rec = { early: k.early, detectMin: (k.detectT * KICK_CONFIG.timeScale) / 60, gain: k.gainAtDetect, maxSicp: k.maxSicp };
    k.history.push(rec);
    if (k.history.length > KICK_CONFIG.historyLimit) k.history.shift();
    ctx.bus.emit({ type: "kick_killed", detectMin: rec.detectMin, gain: rec.gain, maxSicp: rec.maxSicp, timestamp: s.time });
    s.op = "drilling";
    setDrillPhase(s, "drill");
    ctx.phaseStarted("drill");
    ctx.notify(
      `ГНВП ликвидировано · ${rec.early ? "система раннего обнаружения" : "визуальное обнаружение"} · обнаружено через ${rec.detectMin.toFixed(1)} мин · приток ${rec.gain.toFixed(1)} м³ · макс. давление в затрубье ${rec.maxSicp.toFixed(1)} МПа`,
    );
  },
  currentPhase: (ctx) => machine.current(ctx).id,
  phaseProgress: (ctx) => Math.min(1, ctx.state.stepP),
  operationProgress: (ctx) => machine.progress(ctx),
  pumpTarget(ctx) {
    const id = machine.current(ctx).id;
    if (id === "influx") return ctx.state.drill.phase === "drill" ? 1 : 0;
    if (id === "kill") return KICK_CONFIG.killPumpRate;
    return 0;
  },
  selectPhase: (ctx, p) => machine.jumpTo(ctx, p),
  canStart(ctx) {
    const r = checkRequirements(ctx, kickOperation.requirements);
    if (!r.ok) return r;
    if (ctx.state.drill.phase === "slips" && ctx.state.drill.cs) return { ok: false, reason: "свеча уже в переносе" };
    return r;
  },
};
