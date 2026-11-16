/**
 * Регистратор телеметрии: подписывается на события симуляции и хранит их журнал.
 * Сводки считаются из журнала (telemetry-aggregates), поэтому статистика всегда связана с реальными событиями.
 */
import type { ClassicRigTelemetryEvent } from "../types";
import type { ClassicRigSimulation } from "../simulation/ClassicRigSimulation";
import type { TelemetryAggregates } from "./telemetry-types";
import { aggregate } from "./telemetry-aggregates";

export class ClassicRigTelemetryRecorder {
  private log: ClassicRigTelemetryEvent[] = [];
  private listeners = new Set<(e: ClassicRigTelemetryEvent) => void>();
  private unsub: (() => void) | null = null;
  private now = () => 0;
  /** ограничение размера журнала (старые события отбрасываются) */
  constructor(private readonly maxEvents = 200_000) {}

  attach(sim: ClassicRigSimulation): this {
    this.detach();
    this.now = () => sim.getSnapshot().elapsedTime;
    this.unsub = sim.onEvent((e) => this.record(e));
    return this;
  }

  detach(): void {
    this.unsub?.();
    this.unsub = null;
  }

  record(e: ClassicRigTelemetryEvent): void {
    this.log.push(e);
    if (this.log.length > this.maxEvents) this.log.splice(0, this.log.length - this.maxEvents);
    for (const l of this.listeners) l(e);
  }

  onEvent(fn: (e: ClassicRigTelemetryEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  events(fromTime = -Infinity, toTime = Infinity): ClassicRigTelemetryEvent[] {
    return this.log.filter((e) => e.timestamp >= fromTime && e.timestamp <= toTime);
  }

  aggregates(fromTime = 0, toTime = this.now()): TelemetryAggregates {
    return aggregate(this.log, fromTime, toTime);
  }

  reset(): void {
    this.log = [];
  }

  toJSON() {
    return { events: this.log };
  }
}
