/**
 * Внутреннее состояние симуляции (эталон: объект Y.S + глобальные we, Rn, Q, Y.moveX, lh[].state).
 * Чистый модуль.
 */
import type {
  ClassicRigOperationId,
  ClassicRigWorkerId,
  DrillingPhaseId,
  Vec3,
  WeatherState,
  WorkerLevel,
  WorkerTaskKind,
} from "../types";
import { START_MD, START_WELL_INDEX, TD_TOP, WELLS } from "../reference/constants";
import { WEATHER_PRESETS } from "../reference/environment-reference";
import type { ReferenceWorker } from "../reference/workers-reference";

/** Свеча в переносе (эталон: Y.S.cs, создаётся ZS()). */
export type StandTransfer = {
  standIndex: number;
  sx: number;
  sz: number;
  px: number;
  pz: number;
  ytop: number;
  eY: number;
  tdLatch: number;
  bot: Vec3;
  top: Vec3;
  spin: number;
};

export type InternalWorker = {
  id: ClassicRigWorkerId;
  def: ReferenceWorker;
  pos: Vec3;
  /** целевой угол (эталон th) и сглаженный (heading) */
  th: number;
  heading: number;
  anim: WorkerTaskKind;
  now: string;
  ti: number;
  path: Vec3[] | null;
  pi: number;
  tt: number;
  /** фаза шага (gait phase) */
  gph: number;
  seed: number;
  scale: number;
  /** веса смешивания поз (эталон wts) */
  wts: Record<string, number>;
  /** маршрут сбора по тревоге (эталон kp/ki) */
  kp: Vec3[] | null;
  ki: number;
  routeId?: string;
  target?: Vec3;
  level: WorkerLevel;
  inDanger: boolean;
  pose: number[];
  lastActivity: string;
};

export type KickModel = {
  early: boolean;
  gain: number;
  flowOut: number;
  gas: number;
  sidpp: number;
  sicp: number;
  t: number;
  detectT: number;
  gainAtDetect: number;
  maxSicp: number;
  detectedEmitted: boolean;
  history: { early: boolean; detectMin: number; gain: number; maxSicp: number }[];
};

export type ClassicRigState = {
  running: boolean;
  speed: number;
  time: number;
  auto: boolean;
  estop: boolean;

  op: ClassicRigOperationId;
  /** индекс шага текущей шаговой операции и прогресс шага 0..1 (эталон e.i, e.p) */
  stepIndex: number;
  stepP: number;

  drill: {
    phase: DrillingPhaseId;
    timer: number;
    md: number;
    holeMD: number;
    tdY: number;
    rot: number;
    pump: number;
    windWait: boolean;
    windWaitSince: number;
    cs: StandTransfer | null;
    prevTd: number;
    drumAngle: number;
    rollerSpin: number;
    rotaryAngle: number;
    connections: number;
    bowlAngle: number;
  };

  wi: number;
  moveX: number;
  x0: number;
  completedWellheads: number[];
  wellStatus: Record<number, "done" | "plan">;
  setbackVisible: boolean[];

  casing: { casTD: number; md0: number; stage: "none" | "string_out" | "casing_run" };
  cement: { pressure: number; pumped: number; toc: number; plug: number | null };
  kick: KickModel;
  bop: { manualClosed: boolean; annular: number; rams: number; wasClosed: boolean };
  weather: WeatherState;
  flare: number;
  alarm: boolean;

  workers: InternalWorker[];
  violations: number;
};

export const SETBACK_STAND_COUNT = 24;

export function createInitialState(workers: InternalWorker[]): ClassicRigState {
  const wellStatus: Record<number, "done" | "plan"> = {};
  for (const w of WELLS) wellStatus[w.id] = w.initial;
  return {
    running: true,
    speed: 1,
    time: 0,
    auto: true,
    estop: false,
    op: "drilling",
    stepIndex: 0,
    stepP: 0,
    drill: {
      phase: "drill",
      timer: 0,
      md: START_MD,
      holeMD: START_MD,
      tdY: TD_TOP,
      rot: 0,
      pump: 1,
      windWait: false,
      windWaitSince: 0,
      cs: null,
      prevTd: TD_TOP,
      drumAngle: 0,
      rollerSpin: 0,
      rotaryAngle: 0,
      connections: 0,
      bowlAngle: 0,
    },
    wi: START_WELL_INDEX,
    moveX: 0,
    x0: 0,
    completedWellheads: [],
    wellStatus,
    setbackVisible: new Array(SETBACK_STAND_COUNT).fill(true),
    casing: { casTD: 0, md0: 0, stage: "none" },
    cement: { pressure: 0, pumped: 0, toc: 0, plug: null },
    kick: {
      early: true,
      gain: 0,
      flowOut: 100,
      gas: 0.3,
      sidpp: 0,
      sicp: 0,
      t: 0,
      detectT: 0,
      gainAtDetect: 0,
      maxSicp: 0,
      detectedEmitted: false,
      history: [],
    },
    bop: { manualClosed: false, annular: 0, rams: 0, wasClosed: false },
    weather: { preset: "clear", windOverride: null, wind: WEATHER_PRESETS.clear.wind, windDirDeg: 225, season: "summer" },
    flare: 0,
    alarm: false,
    workers,
    violations: 0,
  };
}
