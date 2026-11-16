/**
 * Экзаменационный движок. Работает поверх ТОЙ ЖЕ симуляции и журнала телеметрии:
 * reset → стартовое состояние → студент управляет командами → завершение по фазам или по времени.
 */
import type { ClassicRigSimulation } from "../simulation/ClassicRigSimulation";
import type { ClassicRigTelemetryRecorder } from "../telemetry/telemetry-recorder";
import type { ClassicRigExamDefinition, ClassicRigExamResult } from "./exam-types";
import { completedPhasesSinceSkip, evaluateExam, matchPhaseOrder } from "./exam-evaluator";

export type ExamStatus = { examId: string; running: boolean; elapsedSeconds: number; completedPhases: string[]; nextPhase: string | null };

export class ClassicRigExamEngine {
  private active: { def: ClassicRigExamDefinition; startTime: number } | null = null;
  private last: ClassicRigExamResult | null = null;
  private listeners = new Set<(r: ClassicRigExamResult) => void>();
  private unsub: (() => void) | null = null;

  constructor(private readonly sim: ClassicRigSimulation, private readonly telemetry: ClassicRigTelemetryRecorder) {}

  start(def: ClassicRigExamDefinition, opts: { resetSimulation?: boolean } = {}): void {
    if (opts.resetSimulation !== false) {
      this.sim.dispatch({ type: "reset" });
      this.telemetry.reset();
    }
    this.sim.applyStartState(def.startState);
    this.active = { def, startTime: this.sim.getSnapshot().elapsedTime };
    for (const c of def.startCommands ?? []) this.sim.dispatch(c);
    this.unsub?.();
    this.unsub = this.sim.subscribe(() => this.check());
  }

  abort(): ClassicRigExamResult | null {
    return this.finish("aborted");
  }

  status(): ExamStatus | null {
    if (!this.active) return null;
    const now = this.sim.getSnapshot().elapsedTime;
    const completed = this.completedPhases();
    const ordered = matchPhaseOrder(this.active.def.requiredPhases, completed);
    return {
      examId: this.active.def.id,
      running: true,
      elapsedSeconds: now - this.active.startTime,
      completedPhases: ordered,
      nextPhase: this.active.def.requiredPhases[ordered.length] ?? null,
    };
  }

  result(): ClassicRigExamResult | null {
    return this.last;
  }

  onFinished(fn: (r: ClassicRigExamResult) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Проверка завершения — вызывается после каждого обновления симуляции. */
  check(): void {
    if (!this.active) return;
    const { def, startTime } = this.active;
    const now = this.sim.getSnapshot().elapsedTime;
    const ordered = matchPhaseOrder(def.requiredPhases, this.completedPhases());
    const required = (def.requiredEvents ?? []).every((n) => this.telemetry.events(startTime).some((e) => e.type === n || (e.type === "safety_violation" && e.code === n)));
    if (ordered.length === def.requiredPhases.length && required) this.finish("completed");
    else if (def.timeLimitSeconds && now - startTime >= def.timeLimitSeconds) this.finish("time_limit");
  }

  private completedPhases(): string[] {
    if (!this.active) return [];
    return completedPhasesSinceSkip(this.telemetry.events(this.active.startTime));
  }

  private finish(by: ClassicRigExamResult["finishedBy"]): ClassicRigExamResult | null {
    if (!this.active) return null;
    const { def, startTime } = this.active;
    const now = this.sim.getSnapshot().elapsedTime;
    const r = evaluateExam(def, this.telemetry.events(), startTime, now, by);
    this.active = null;
    this.unsub?.();
    this.unsub = null;
    this.last = r;
    for (const l of this.listeners) l(r);
    return r;
  }
}
