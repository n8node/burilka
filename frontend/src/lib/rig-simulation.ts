// Scene-independent classical rig scenario. Durations and assignments can be
// replaced without changing the Three.js viewer.
export type Phase = "drill" | "slips" | "breakTD" | "tdUp" | "latch" | "lift" | "stab" | "makeup" | "tdConnect" | "release";
export type WorkerTask = "idle" | "walk" | "reach" | "look" | "console" | "wrench";
export type WorkerAssignment = { destination: readonly [number, number, number]; task: WorkerTask; face?: readonly [number, number] };
export type RigStep = {
  id: Phase;
  label: string;
  duration: number;
  driveRpm: number;
  pumpRpm: number;
  rotaryRpm: number;
  fromHeight: number;
  toHeight: number;
  helpers: readonly [WorkerAssignment, WorkerAssignment];
};

const helper1: WorkerAssignment = { destination: [0, 0, 5], task: "idle", face: [0, 0] };
const helper2: WorkerAssignment = { destination: [4, 0, 6], task: "idle", face: [0, 0] };
const atWell1: WorkerAssignment = { destination: [-0.75, 0, 1.2], task: "reach", face: [0, 0] };
const atWell2: WorkerAssignment = { destination: [0.85, 0, 1.4], task: "reach", face: [0, 0] };
const bySetback: WorkerAssignment = { destination: [3.5, 0, 4], task: "look", face: [0, 0] };

// Phase order and the 2.5–4 s connection steps follow the classical rig
// sequence in the reference. Heights are visual GLB travel ranges (metres).
export const drillingSteps: readonly RigStep[] = [
  { id: "drill", label: "Бурение на длину свечи", duration: 18, driveRpm: 62, pumpRpm: 85, rotaryRpm: 55, fromHeight: 0, toHeight: -4, helpers: [helper1, helper2] },
  { id: "slips", label: "Посадка в клинья", duration: 2.5, driveRpm: 0, pumpRpm: 0, rotaryRpm: 0, fromHeight: -4, toHeight: -4, helpers: [atWell1, atWell2] },
  { id: "breakTD", label: "Отворот верхнего привода", duration: 4, driveRpm: 0, pumpRpm: 0, rotaryRpm: 0, fromHeight: -4, toHeight: -4, helpers: [{ ...atWell1, task: "look" }, bySetback] },
  { id: "tdUp", label: "Подъём верхнего привода", duration: 4, driveRpm: 0, pumpRpm: 0, rotaryRpm: 0, fromHeight: -4, toHeight: 0, helpers: [atWell1, bySetback] },
  { id: "latch", label: "Захват свечи", duration: 3, driveRpm: 0, pumpRpm: 0, rotaryRpm: 0, fromHeight: 0, toHeight: 0, helpers: [{ ...atWell1, task: "look" }, { ...bySetback, task: "reach" }] },
  { id: "lift", label: "Подача свечи к устью", duration: 4, driveRpm: 0, pumpRpm: 0, rotaryRpm: 0, fromHeight: 0, toHeight: 0, helpers: [atWell1, { ...bySetback, task: "reach" }] },
  { id: "stab", label: "Стыковка свечи", duration: 2.5, driveRpm: 0, pumpRpm: 0, rotaryRpm: 0, fromHeight: 0, toHeight: -0.8, helpers: [atWell1, atWell2] },
  { id: "makeup", label: "Свинчивание и докрепление", duration: 4, driveRpm: 0, pumpRpm: 0, rotaryRpm: 0, fromHeight: -0.8, toHeight: -0.8, helpers: [{ destination: [-1.9, 0, 2.2], task: "look", face: [0, 0] }, { destination: [1.9, 0, 2.5], task: "look", face: [0, 0] }] },
  { id: "tdConnect", label: "Соединение привода со свечой", duration: 3.5, driveRpm: 18, pumpRpm: 0, rotaryRpm: 0, fromHeight: -0.8, toHeight: 0, helpers: [{ ...atWell1, task: "look" }, { ...atWell2, task: "look" }] },
  { id: "release", label: "Снятие с клиньев, запуск насосов", duration: 2, driveRpm: 0, pumpRpm: 0, rotaryRpm: 0, fromHeight: 0, toHeight: 0, helpers: [atWell1, atWell2] },
];

export type RigSnapshot = {
  running: boolean;
  phase: Phase;
  label: string;
  progress: number;
  cycle: number;
  depth: number;
  driveRpm: number;
  pumpRpm: number;
  rotaryRpm: number;
  driveAngle: number;
  pumpAngle: number;
  rotaryAngle: number;
  height: number;
  slipsClosed: boolean;
  workers: readonly [WorkerAssignment, WorkerAssignment];
};

export class RigSimulation {
  private index = 0;
  private elapsed = 0;
  private cycle = 1;
  private depth = 0;
  private running = false;
  private driveAngle = 0;
  private pumpAngle = 0;
  private rotaryAngle = 0;

  constructor(private readonly steps: readonly RigStep[] = drillingSteps) {
    if (!steps.length || steps.some((step) => step.duration <= 0)) throw new Error("Rig scenario requires positive step durations");
  }

  start() { this.running = true; }
  pause() { this.running = false; }
  reset() { this.running = false; this.index = 0; this.elapsed = 0; this.cycle = 1; this.depth = 0; this.driveAngle = 0; this.pumpAngle = 0; this.rotaryAngle = 0; }
  get stepsList() { return this.steps; }

  advance(seconds: number) {
    if (!this.running || !Number.isFinite(seconds) || seconds <= 0) return;
    let remaining = seconds;
    while (remaining > 0) {
      const step = this.steps[this.index];
      const increment = Math.min(remaining, step.duration - this.elapsed);
      this.driveAngle += step.driveRpm * increment * Math.PI / 30;
      this.pumpAngle += step.pumpRpm * increment * Math.PI / 30;
      this.rotaryAngle += step.rotaryRpm * increment * Math.PI / 30;
      if (step.id === "drill") this.depth += 4 * increment / step.duration;
      this.elapsed += increment;
      remaining -= increment;
      if (this.elapsed >= step.duration - 1e-9) {
        this.elapsed = 0;
        this.index = (this.index + 1) % this.steps.length;
        if (this.index === 0) this.cycle++;
      }
    }
  }

  get snapshot(): RigSnapshot {
    const step = this.steps[this.index];
    const progress = this.elapsed / step.duration;
    return {
      running: this.running, phase: step.id, label: step.label, progress, cycle: this.cycle, depth: this.depth,
      driveRpm: this.running ? step.driveRpm : 0, pumpRpm: this.running ? step.pumpRpm : 0, rotaryRpm: this.running ? step.rotaryRpm : 0,
      driveAngle: this.driveAngle, pumpAngle: this.pumpAngle, rotaryAngle: this.rotaryAngle,
      height: step.fromHeight + (step.toHeight - step.fromHeight) * progress,
      slipsClosed: step.id !== "drill" && step.id !== "release",
      workers: step.helpers,
    };
  }
}