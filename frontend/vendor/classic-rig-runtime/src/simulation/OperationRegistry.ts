/**
 * Реестр операций: описание (данные) + поведение (небольшие хуки), без центрального switch.
 */
import type { ClassicRigOperationDefinition, ClassicRigOperationId, PhaseRequirement } from "../types";
import type { ClassicRigState } from "./ClassicRigState";
import type { ClassicRigEventBus } from "./ClassicRigEvents";
import type { WellGeometry } from "../well/depth-model";
import type { SimulationConfig } from "./config";

export type OperationContext = {
  state: ClassicRigState;
  bus: ClassicRigEventBus;
  config: SimulationConfig;
  well(): WellGeometry;
  /** текущая скорость ветра, м/с */
  wind(): number;
  /** есть ли люди в красной зоне без разрешения сценария (по последнему кадру) */
  unpermittedInRedZone(): boolean;
  startOperation(op: ClassicRigOperationId, reason: "auto" | "command" | "chain"): void;
  phaseStarted(phaseId: string): void;
  phaseCompleted(phaseId: string): void;
  notify(text: string): void;
};

export interface OperationBehavior {
  readonly definition: ClassicRigOperationDefinition;
  /** эталон lo(op) */
  start(ctx: OperationContext): void;
  /** эталон H1 / Wm; возвращает true, когда операция завершена */
  update(ctx: OperationContext, dt: number): boolean;
  /** эталон qS() */
  complete(ctx: OperationContext): void;
  currentPhase(ctx: OperationContext): string;
  phaseProgress(ctx: OperationContext): number;
  operationProgress(ctx: OperationContext): number;
  /** целевая подача насосов 0..1 (эталон: t в H1) */
  pumpTarget(ctx: OperationContext): number;
  selectPhase?(ctx: OperationContext, phase: string): boolean;
  /** можно ли запустить операцию сейчас (эталон fh()) */
  canStart(ctx: OperationContext): { ok: boolean; reason?: string };
}

export class OperationRegistry {
  private readonly map = new Map<ClassicRigOperationId, OperationBehavior>();

  register(b: OperationBehavior): this {
    this.map.set(b.definition.id, b);
    return this;
  }
  get(id: ClassicRigOperationId): OperationBehavior {
    const b = this.map.get(id);
    if (!b) throw new Error(`Операция не зарегистрирована: ${id}`);
    return b;
  }
  list(): ClassicRigOperationDefinition[] {
    return [...this.map.values()].map((b) => b.definition);
  }
  has(id: string): id is ClassicRigOperationId {
    return this.map.has(id as ClassicRigOperationId);
  }
}

/** Проверка требований из описаний (requirements) по состоянию. */
export function checkRequirements(ctx: OperationContext, reqs: PhaseRequirement[] | undefined): { ok: boolean; reason?: string } {
  for (const r of reqs ?? []) {
    const s = ctx.state;
    if (r.type === "operation") {
      if (s.op !== r.operation) return { ok: false, reason: `нужна операция «${r.operation}»` };
      if (r.phases && s.op === "drilling" && !r.phases.includes(s.drill.phase)) return { ok: false, reason: `нужна фаза ${r.phases.join("/")}` };
    }
    if (r.type === "min_depth" && s.drill.md <= r.meters) return { ok: false, reason: "недостаточная глубина" };
    if (r.type === "casing_stage" && s.casing.stage !== r.stage) return { ok: false, reason: `нужна стадия «${r.stage}»` };
    if (r.type === "bop_open" && s.bop.manualClosed) return { ok: false, reason: "ПВО закрыт вручную" };
    if (r.type === "next_well_available") {
      const next = Math.round(s.moveX) + 10;
      if (![0, 10, 20, 30].includes(next)) return { ok: false, reason: "последнее устье куста: переезжать некуда" };
    }
  }
  return { ok: true };
}
