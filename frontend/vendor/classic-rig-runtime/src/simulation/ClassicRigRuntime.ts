/**
 * Runtime верхнего уровня: simulation + telemetry + exams (+ необязательный renderer).
 * Чистый модуль: renderer передаётся извне как объект с методом apply(snapshot) — сам runtime не знает three.js.
 */
import type { ClassicRigCommand, ClassicRigSceneRenderer, ClassicRigSnapshot } from "../types";
import { ClassicRigSimulation, type ClassicRigSimulationOptions } from "./ClassicRigSimulation";
import { ClassicRigTelemetryRecorder } from "../telemetry/telemetry-recorder";
import { ClassicRigExamEngine } from "../exams/exam-engine";

export type ClassicRigRuntimeOptions = ClassicRigSimulationOptions & {
  renderer?: ClassicRigSceneRenderer | null;
};

export class ClassicRigRuntime {
  readonly simulation: ClassicRigSimulation;
  readonly telemetry: ClassicRigTelemetryRecorder;
  readonly exams: ClassicRigExamEngine;
  renderer: ClassicRigSceneRenderer | null;

  constructor(opts: ClassicRigRuntimeOptions = {}) {
    this.simulation = new ClassicRigSimulation(opts);
    this.telemetry = new ClassicRigTelemetryRecorder().attach(this.simulation);
    this.exams = new ClassicRigExamEngine(this.simulation, this.telemetry);
    this.renderer = opts.renderer ?? null;
  }

  /** Подключить renderer (например, ClassicRigSceneRuntime из пакета renderer) после загрузки ассетов. */
  attachRenderer(renderer: ClassicRigSceneRenderer | null): void {
    this.renderer = renderer;
    if (renderer) renderer.apply(this.simulation.getSnapshot(), 0);
  }

  start(): void {
    this.simulation.start();
  }
  pause(): void {
    this.simulation.pause();
  }
  reset(): void {
    this.simulation.reset();
    this.telemetry.reset();
  }

  /** Главный шаг: симуляция → (экзамен проверяется по подписке) → renderer отображает снимок. */
  update(deltaSeconds: number): void {
    this.simulation.update(deltaSeconds);
    this.renderer?.apply(this.simulation.getSnapshot(), deltaSeconds);
  }

  dispatch(command: ClassicRigCommand): void {
    this.simulation.dispatch(command);
  }

  getSnapshot(): ClassicRigSnapshot {
    return this.simulation.getSnapshot();
  }

  dispose(): void {
    this.telemetry.detach();
    this.renderer?.dispose?.();
    this.renderer = null;
  }
}
