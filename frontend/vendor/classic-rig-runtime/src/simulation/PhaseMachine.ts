/**
 * Универсальная фазовая машина для шаговых операций (эталон H1: e.p += dt / dur; e.p ≥ 1 → e.i++).
 * Фазы описываются данными (ClassicRigPhaseDefinition), поведение фазы — необязательными хуками.
 */
import type { ClassicRigOperationDefinition, ClassicRigPhaseDefinition } from "../types";
import type { OperationContext } from "./OperationRegistry";

export type PhaseHooks = {
  /** вызывается каждый кадр активной фазы: p — прогресс 0..1 после приращения */
  onUpdate?: (ctx: OperationContext, phase: ClassicRigPhaseDefinition, p: number, dt: number) => void;
  /** длительность фазы может подменяться (эталон: sd[0].dur = T1().detect) */
  duration?: (ctx: OperationContext, phase: ClassicRigPhaseDefinition) => number;
};

export class PhaseMachine {
  constructor(private readonly def: ClassicRigOperationDefinition, private readonly hooks: PhaseHooks = {}) {}

  get phases(): ClassicRigPhaseDefinition[] {
    return this.def.phases;
  }

  current(ctx: OperationContext): ClassicRigPhaseDefinition {
    return this.def.phases[Math.min(ctx.state.stepIndex, this.def.phases.length - 1)];
  }

  durationOf(ctx: OperationContext, phase: ClassicRigPhaseDefinition): number {
    return this.hooks.duration ? this.hooks.duration(ctx, phase) : phase.durationSeconds;
  }

  start(ctx: OperationContext): void {
    ctx.state.stepIndex = 0;
    ctx.state.stepP = 0;
    ctx.phaseStarted(this.def.phases[0].id);
  }

  /** Возвращает true, когда пройдена последняя фаза. */
  update(ctx: OperationContext, dt: number): boolean {
    const s = ctx.state;
    const phase = this.current(ctx);
    s.stepP += dt / this.durationOf(ctx, phase);
    this.hooks.onUpdate?.(ctx, phase, Math.min(1, s.stepP), dt);
    if (s.stepP >= 1) {
      ctx.phaseCompleted(phase.id);
      s.stepP = 0;
      s.stepIndex++;
      if (s.stepIndex >= this.def.phases.length) return true;
      ctx.phaseStarted(this.def.phases[s.stepIndex].id);
    }
    return false;
  }

  /** Перейти к фазе по id (команда select_phase). */
  jumpTo(ctx: OperationContext, phaseId: string): boolean {
    const idx = this.def.phases.findIndex((p) => p.id === phaseId);
    if (idx < 0) return false;
    ctx.state.stepIndex = idx;
    ctx.state.stepP = 0;
    ctx.phaseStarted(phaseId);
    return true;
  }

  /** Прогресс операции 0..1 по сумме длительностей. */
  progress(ctx: OperationContext): number {
    const ph = this.def.phases;
    let total = 0;
    let done = 0;
    ph.forEach((p, i) => {
      const d = this.durationOf(ctx, p);
      total += d;
      if (i < ctx.state.stepIndex) done += d;
      else if (i === ctx.state.stepIndex) done += d * Math.min(1, ctx.state.stepP);
    });
    return total > 0 ? done / total : 0;
  }
}
