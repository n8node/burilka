import type { ClassicRigRuntime, ClassicRigSimulation } from "../src";
import type { ClassicRigSnapshot, ClassicRigTelemetryEvent } from "../src";

export const DT = 1 / 30;

export function runFor(sim: { update(dt: number): void }, seconds: number, dt = DT): void {
  const n = Math.round(seconds / dt);
  for (let i = 0; i < n; i++) sim.update(dt);
}

export function runUntil(sim: ClassicRigSimulation | ClassicRigRuntime, pred: (s: ClassicRigSnapshot) => boolean, maxSeconds = 600, dt = DT): ClassicRigSnapshot {
  const n = Math.round(maxSeconds / dt);
  for (let i = 0; i < n; i++) {
    sim.update(dt);
    const s = sim.getSnapshot();
    if (pred(s)) return s;
  }
  throw new Error(`условие не выполнено за ${maxSeconds} с (op=${sim.getSnapshot().operation}, phase=${sim.getSnapshot().phase})`);
}

export function collect(sim: ClassicRigSimulation): ClassicRigTelemetryEvent[] {
  const out: ClassicRigTelemetryEvent[] = [];
  sim.onEvent((e) => out.push(e));
  return out;
}

/** Каждый кадр — вызвать fn со снимком (для проверок инвариантов). */
export function sample(sim: ClassicRigSimulation, seconds: number, fn: (s: ClassicRigSnapshot) => void, dt = DT): void {
  const n = Math.round(seconds / dt);
  for (let i = 0; i < n; i++) {
    sim.update(dt);
    fn(sim.getSnapshot());
  }
}

/** Глубина, при которой доступны ГНВП и подъём колонны (м, реальные) */
export const DEEP_ENOUGH_MD = 1800;

export const phasesStarted = (ev: ClassicRigTelemetryEvent[], op?: string) =>
  ev.filter((e) => e.type === "phase_started" && (!op || e.operationId === op)).map((e) => (e as { phaseId: string }).phaseId);
